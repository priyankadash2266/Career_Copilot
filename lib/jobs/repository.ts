import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { JobSchema, type Job, type ScoredJob } from "./types";
import { seedJobs } from "./seed";
import { createNeonRepository } from "./postgres";

/**
 * Repository pattern: the rest of the app talks to this interface, never to
 * a database or the file system directly. Three implementations:
 *
 *   MemoryJobRepository    tests
 *   FileJobRepository      local development (.data/jobs.json, zero setup)
 *   PostgresJobRepository  production (Neon / any Postgres), see postgres.ts
 *
 * getJobRepository() picks one from configuration; nothing else changes.
 */
export interface JobRepository {
  /** All stored jobs with vote totals and this voter's own vote. Expiry is applied by the service. */
  list(voterId?: string): Promise<ScoredJob[]>;
  get(id: string): Promise<Job | undefined>;
  create(job: Job): Promise<void>;
  /** Insert new imported jobs or refresh existing ones (same id). Returns how many were new. */
  upsertImported(jobs: Job[], seenAt: Date): Promise<{ inserted: number; updated: number }>;
  /** value 1 / -1 sets the vote, 0 removes it. One row per (job, voter): idempotent by design. */
  vote(jobId: string, voterId: string, value: 1 | -1 | 0): Promise<void>;
  voteSummary(jobId: string, voterId?: string): Promise<{ score: number; myVote: 1 | -1 | 0 }>;
}

type Votes = Record<string, 1 | -1>;

/** In-memory implementation: tests, and the fallback when nothing else is configured. */
export class MemoryJobRepository implements JobRepository {
  protected jobs = new Map<string, Job>();
  protected votes = new Map<string, Votes>();

  constructor(initial: Job[] = [], initialVotes: Record<string, Votes> = {}) {
    initial.forEach((j) => this.jobs.set(j.id, j));
    Object.entries(initialVotes).forEach(([id, v]) => this.votes.set(id, { ...v }));
  }

  protected summary(jobId: string, voterId?: string) {
    const v = this.votes.get(jobId) ?? {};
    const score = Object.values(v).reduce<number>((s, x) => s + x, 0);
    return { score, myVote: ((voterId && v[voterId]) || 0) as 1 | -1 | 0 };
  }

  async list(voterId?: string) {
    return [...this.jobs.values()].map((job) => ({ job, ...this.summary(job.id, voterId) }));
  }
  async get(id: string) {
    return this.jobs.get(id);
  }
  async create(job: Job) {
    this.jobs.set(job.id, job);
  }
  async upsertImported(jobs: Job[], seenAt: Date) {
    let inserted = 0;
    for (const job of jobs) {
      const existing = this.jobs.get(job.id);
      if (!existing) inserted++;
      // Keep the original createdAt so a refresh never makes an old post look new.
      this.jobs.set(job.id, { ...job, createdAt: existing?.createdAt ?? job.createdAt, lastSeenAt: seenAt.toISOString() });
    }
    return { inserted, updated: jobs.length - inserted };
  }
  async vote(jobId: string, voterId: string, value: 1 | -1 | 0) {
    const v = { ...(this.votes.get(jobId) ?? {}) };
    if (value === 0) delete v[voterId];
    else v[voterId] = value;
    this.votes.set(jobId, v);
  }
  async voteSummary(jobId: string, voterId?: string) {
    return this.summary(jobId, voterId);
  }
}

/** On disk each row is a job plus its votes. Older files (no `kind`) still load. */
const FileRowSchema = JobSchema.extend({ votes: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).default({}) });

/**
 * JSON-file persistence for local development: zero setup, survives restarts.
 * Writes go to a temp file that is then renamed, so a crash mid-write can
 * never leave a half-written (corrupt) file: an atomic write.
 *
 * Not for production: serverless hosts have a read-only, per-instance disk.
 * If writing fails we keep working in memory and log a warning.
 */
export class FileJobRepository extends MemoryJobRepository {
  private loaded: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();

  constructor(private readonly path: string) {
    super();
  }

  private load(): Promise<void> {
    this.loaded ??= (async () => {
      let raw: string | null = null;
      try {
        raw = await readFile(this.path, "utf8");
      } catch {
        // First run: no file yet.
      }
      if (raw === null) {
        for (const { job, votes } of seedJobs(new Date())) {
          this.jobs.set(job.id, job);
          this.votes.set(job.id, votes);
        }
        await this.persist();
        return;
      }
      try {
        // Validate every row: a hand-edited or old-format file must not crash the app.
        for (const item of z.array(z.unknown()).parse(JSON.parse(raw))) {
          const parsed = FileRowSchema.safeParse(item);
          if (!parsed.success) continue;
          const { votes, ...job } = parsed.data;
          this.jobs.set(job.id, job);
          this.votes.set(job.id, votes);
        }
      } catch {
        logger.warn("jobs.file_corrupt", { path: this.path });
      }
    })();
    return this.loaded;
  }

  /** Writes are chained so two requests can never interleave their writes. */
  private persist(): Promise<void> {
    const rows = [...this.jobs.values()].map((job) => ({ ...job, votes: this.votes.get(job.id) ?? {} }));
    const snapshot = JSON.stringify(rows, null, 2);
    this.writes = this.writes.then(async () => {
      try {
        await mkdir(dirname(this.path), { recursive: true });
        const tmp = `${this.path}.tmp`;
        await writeFile(tmp, snapshot, "utf8");
        await rename(tmp, this.path);
      } catch (err) {
        logger.warn("jobs.persist_failed", { error: err instanceof Error ? err.message : String(err) });
      }
    });
    return this.writes;
  }

  override async list(voterId?: string) {
    await this.load();
    return super.list(voterId);
  }
  override async get(id: string) {
    await this.load();
    return super.get(id);
  }
  override async create(job: Job) {
    await this.load();
    await super.create(job);
    await this.persist();
  }
  override async upsertImported(jobs: Job[], seenAt: Date) {
    await this.load();
    const result = await super.upsertImported(jobs, seenAt);
    await this.persist();
    return result;
  }
  override async vote(jobId: string, voterId: string, value: 1 | -1 | 0) {
    await this.load();
    await super.vote(jobId, voterId, value);
    await this.persist();
  }
  override async voteSummary(jobId: string, voterId?: string) {
    await this.load();
    return super.voteSummary(jobId, voterId);
  }
}

let instance: JobRepository | null = null;

/**
 * One shared instance per server process.
 * DATABASE_URL set  -> Postgres (production)
 * otherwise         -> JSON file (local development)
 */
export function getJobRepository(): JobRepository {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (url) {
      instance = createNeonRepository(url);
    } else {
      instance = new FileJobRepository(process.env.JOBS_DATA_FILE || ".data/jobs.json");
    }
  }
  return instance;
}

/** Tests swap in their own repository (Dependency Injection). */
export function setJobRepository(repo: JobRepository | null): void {
  instance = repo;
}
