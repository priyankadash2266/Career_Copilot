import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";
import type { JobRepository } from "./repository";
import { IMPORT_GRACE_DAYS, JobSchema, POST_TTL_DAYS, type Job, type ScoredJob } from "./types";

/**
 * Anything that can run a parameterised SQL query and return rows.
 * Production passes Neon's HTTP driver; tests pass PGlite (real Postgres
 * compiled to WebAssembly, running in-process). Same SQL, both places.
 */
export type SqlExecutor = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

/**
 * Schema. Two tables:
 *  - jobs:      one row per post. The post itself is JSONB (flexible, matches
 *               our Zod type); the columns we filter on are real columns.
 *  - job_votes: one row per (job, voter). The composite primary key makes
 *               "one person, one vote" a database guarantee, not app logic.
 */
const SCHEMA = [
  `create table if not exists jobs (
     id           text primary key,
     kind         text not null check (kind in ('community', 'imported')),
     data         jsonb not null,
     created_at   timestamptz not null,
     last_seen_at timestamptz
   )`,
  `create index if not exists jobs_live_idx on jobs (kind, created_at, last_seen_at)`,
  `create table if not exists job_votes (
     job_id   text not null references jobs(id) on delete cascade,
     voter_id text not null,
     value    smallint not null check (value in (-1, 1)),
     primary key (job_id, voter_id)
   )`,
];

// Only live posts leave the database: expiry is pushed into SQL so we never ship dead rows.
const LIVE = `(j.kind = 'community' and j.created_at > now() - interval '${POST_TTL_DAYS} days')
           or (j.kind = 'imported' and j.last_seen_at > now() - interval '${IMPORT_GRACE_DAYS} days')`;

const LIST_CACHE_MS = 30_000;

export class PostgresJobRepository implements JobRepository {
  private ready: Promise<void> | null = null;
  /** Shared list cached briefly per server instance; each voter's own votes are fetched fresh. */
  private cache: { at: number; rows: { job: Job; score: number }[] } | null = null;

  constructor(private readonly sql: SqlExecutor) {}

  /** Create tables on first use (idempotent). A migration tool would replace this as the schema grows. */
  private ensureSchema(): Promise<void> {
    this.ready ??= (async () => {
      for (const statement of SCHEMA) await this.sql(statement);
    })().catch((err) => {
      this.ready = null; // let the next request retry
      throw err;
    });
    return this.ready;
  }

  private toJob(row: Record<string, unknown>): Job | null {
    const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
    const lastSeen = row.last_seen_at ? new Date(row.last_seen_at as string).toISOString() : undefined;
    const parsed = JobSchema.safeParse({ ...(data as object), lastSeenAt: lastSeen });
    if (!parsed.success) logger.warn("jobs.bad_row", { id: row.id });
    return parsed.success ? parsed.data : null;
  }

  private async shared(): Promise<{ job: Job; score: number }[]> {
    if (this.cache && Date.now() - this.cache.at < LIST_CACHE_MS) return this.cache.rows;
    await this.ensureSchema();
    const rows = await this.sql(
      `select j.id, j.data, j.last_seen_at, coalesce(sum(v.value), 0)::int as score
         from jobs j left join job_votes v on v.job_id = j.id
        where ${LIVE}
        group by j.id`,
    );
    const result = rows.flatMap((r) => {
      const job = this.toJob(r);
      return job ? [{ job, score: Number(r.score) }] : [];
    });
    this.cache = { at: Date.now(), rows: result };
    return result;
  }

  async list(voterId?: string): Promise<ScoredJob[]> {
    const rows = await this.shared();
    const mine = new Map<string, 1 | -1>();
    if (voterId) {
      for (const r of await this.sql(`select job_id, value from job_votes where voter_id = $1`, [voterId])) {
        mine.set(String(r.job_id), Number(r.value) as 1 | -1);
      }
    }
    return rows.map((r) => ({ ...r, myVote: mine.get(r.job.id) ?? 0 }));
  }

  async get(id: string): Promise<Job | undefined> {
    await this.ensureSchema();
    const [row] = await this.sql(`select id, data, last_seen_at from jobs where id = $1`, [id]);
    return (row && this.toJob(row)) || undefined;
  }

  async create(job: Job): Promise<void> {
    await this.ensureSchema();
    await this.sql(`insert into jobs (id, kind, data, created_at) values ($1, $2, $3::jsonb, $4)`, [
      job.id,
      job.kind,
      JSON.stringify(job),
      job.createdAt,
    ]);
    this.cache = null;
  }

  /**
   * One statement for the whole batch: jsonb_array_elements turns the JSON
   * array into rows, and ON CONFLICT turns "insert" into "insert or refresh".
   * created_at is not updated on conflict, so a refresh never makes an old
   * post look new. `xmax = 0` is a Postgres trick: true only for fresh inserts.
   */
  async upsertImported(jobs: Job[], seenAt: Date): Promise<{ inserted: number; updated: number }> {
    if (jobs.length === 0) return { inserted: 0, updated: 0 };
    await this.ensureSchema();
    const rows = await this.sql(
      `insert into jobs (id, kind, data, created_at, last_seen_at)
       select x->>'id', 'imported', x, (x->>'createdAt')::timestamptz, $2::timestamptz
         from jsonb_array_elements($1::jsonb) as x
       on conflict (id) do update
         set data = excluded.data || jsonb_build_object('createdAt', jobs.data->'createdAt'),
             last_seen_at = excluded.last_seen_at
       returning (xmax = 0) as inserted`,
      [JSON.stringify(jobs), seenAt.toISOString()],
    );
    this.cache = null;
    const inserted = rows.filter((r) => r.inserted === true).length;
    return { inserted, updated: rows.length - inserted };
  }

  async vote(jobId: string, voterId: string, value: 1 | -1 | 0): Promise<void> {
    await this.ensureSchema();
    if (value === 0) {
      await this.sql(`delete from job_votes where job_id = $1 and voter_id = $2`, [jobId, voterId]);
    } else {
      await this.sql(
        `insert into job_votes (job_id, voter_id, value) values ($1, $2, $3)
         on conflict (job_id, voter_id) do update set value = excluded.value`,
        [jobId, voterId, value],
      );
    }
    this.cache = null;
  }

  async voteSummary(jobId: string, voterId?: string) {
    await this.ensureSchema();
    const [row] = await this.sql(
      `select coalesce(sum(value), 0)::int as score,
              coalesce(max(case when voter_id = $2 then value end), 0)::int as mine
         from job_votes where job_id = $1`,
      [jobId, voterId ?? ""],
    );
    return { score: Number(row?.score ?? 0), myVote: Number(row?.mine ?? 0) as 1 | -1 | 0 };
  }
}

/** Production wiring: Neon's serverless driver speaks SQL over HTTPS (no connection pool to manage). */
export function createNeonRepository(url: string): PostgresJobRepository {
  const sql = neon(url);
  return new PostgresJobRepository((text, params) => sql.query(text, params ?? []) as Promise<Record<string, unknown>[]>);
}
