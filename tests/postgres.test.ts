import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { PostgresJobRepository } from "@/lib/jobs/postgres";
import { listJobs, voteJob } from "@/lib/jobs/service";
import type { Job } from "@/lib/jobs/types";

/**
 * The production SQL, run against PGlite: real Postgres compiled to
 * WebAssembly, in-process. No Docker, no network, no shared test database.
 */
let repo: PostgresJobRepository;

beforeEach(async () => {
  const db = new PGlite();
  repo = new PostgresJobRepository(async (text, params) => (await db.query(text, params ?? [])).rows as Record<string, unknown>[]);
});

const now = () => new Date();
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: crypto.randomUUID(),
    kind: "community",
    title: "Backend Engineer",
    company: "Acme",
    postedBy: "",
    function: "engineering",
    seniority: "mid",
    workMode: "hybrid",
    location: "Bengaluru",
    description: "Build APIs.",
    sourceUrl: "",
    source: "other",
    stack: ["Go"],
    createdAt: ago(1),
    ...overrides,
  };
}

describe("PostgresJobRepository", () => {
  it("creates the schema on first use and round-trips a job", async () => {
    const j = job({ id: "a" });
    await repo.create(j);
    expect(await repo.get("a")).toEqual(j);
    expect(await repo.get("missing")).toBeUndefined();
  });

  it("only returns live posts (expiry is enforced in SQL)", async () => {
    await repo.create(job({ id: "fresh" }));
    await repo.create(job({ id: "stale", createdAt: ago(24 * 8) }));
    const ids = (await repo.list()).map((s) => s.job.id);
    expect(ids).toEqual(["fresh"]);
  });

  it("votes: one row per voter, totals and my vote, removable", async () => {
    await repo.create(job({ id: "a" }));
    await repo.vote("a", "u1", 1);
    await repo.vote("a", "u1", 1); // idempotent: primary key (job_id, voter_id)
    await repo.vote("a", "u2", 1);
    await repo.vote("a", "u3", -1);
    expect(await repo.voteSummary("a", "u1")).toEqual({ score: 1, myVote: 1 });
    await repo.vote("a", "u1", -1); // change of mind
    expect(await repo.voteSummary("a", "u1")).toEqual({ score: -1, myVote: -1 });
    await repo.vote("a", "u1", 0);
    expect(await repo.voteSummary("a", "u1")).toEqual({ score: 0, myVote: 0 });

    const [listed] = await repo.list("u2");
    expect(listed).toMatchObject({ score: 0, myVote: 1 });
  });

  it("upsert: inserts new imported jobs, refreshes existing ones, keeps the original createdAt", async () => {
    const first = job({ id: "lever:x:1", kind: "imported", createdAt: ago(48), title: "Old title" });
    const r1 = await repo.upsertImported([first, job({ id: "lever:x:2", kind: "imported" })], now());
    expect(r1).toEqual({ inserted: 2, updated: 0 });

    const refreshed = { ...first, title: "New title", createdAt: ago(1) };
    const r2 = await repo.upsertImported([refreshed], now());
    expect(r2).toEqual({ inserted: 0, updated: 1 });

    const stored = await repo.get("lever:x:1");
    expect(stored?.title).toBe("New title");
    expect(stored?.createdAt).toBe(first.createdAt); // a refresh never makes an old post look new
    expect(stored?.lastSeenAt).toBeTruthy();
  });

  it("imported jobs disappear when the import has not seen them for 3 days", async () => {
    await repo.upsertImported([job({ id: "gone", kind: "imported" })], new Date(Date.now() - 4 * 24 * 3600_000));
    await repo.upsertImported([job({ id: "open", kind: "imported" })], now());
    expect((await repo.list()).map((s) => s.job.id)).toEqual(["open"]);
  });

  it("works end to end through the service layer", async () => {
    await repo.create(job({ id: "a" }));
    const voted = await voteJob(repo, { id: "a", voterId: "voter-1", value: 1 });
    expect(voted.score).toBe(1);
    const page = await listJobs(repo, { voterId: "voter-1" });
    expect(page.jobs[0]).toMatchObject({ id: "a", score: 1, myVote: 1 });
    expect(JSON.stringify(page)).not.toContain("voter-1");
  });
});
