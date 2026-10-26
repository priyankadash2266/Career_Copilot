import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectSource, detectStack, spamSignals } from "@/lib/jobs/classify";
import { hotScore, isExpired, sortJobs } from "@/lib/jobs/ranking";
import { FileJobRepository, MemoryJobRepository, setJobRepository } from "@/lib/jobs/repository";
import { createJob, listJobs, voteJob } from "@/lib/jobs/service";
import { seedJobs } from "@/lib/jobs/seed";
import type { Job } from "@/lib/jobs/types";
import { GET, POST } from "@/app/api/jobs/route";
import { POST as VOTE } from "@/app/api/jobs/[id]/vote/route";

const NOW = new Date("2026-10-06T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

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
    description: "x".repeat(100),
    sourceUrl: "",
    source: "other",
    stack: ["Python"],
    createdAt: hoursAgo(1),
    ...overrides,
  };
}

const VALID_POST = {
  title: "Backend Engineer",
  company: "Acme",
  function: "engineering",
  seniority: "mid",
  workMode: "hybrid",
  location: "Bengaluru",
  description:
    "I'm the CTO at Acme. We're hiring a backend engineer to own our Golang services, PostgreSQL and Kafka pipelines on AWS. Reply with something you built.",
  sourceUrl: "https://www.linkedin.com/posts/someone_hiring-123",
};

describe("classification", () => {
  it("detects the source platform from the link", () => {
    expect(detectSource("https://www.linkedin.com/posts/abc")).toBe("linkedin");
    expect(detectSource("https://x.com/someone/status/1")).toBe("x");
    expect(detectSource("https://twitter.com/someone/status/1")).toBe("x");
    expect(detectSource("https://notlinkedin.com.evil.io/x")).toBe("other");
    expect(detectSource("")).toBe("other");
  });

  it("extracts the stack with the same taxonomy as resumes", () => {
    expect(detectStack("Golang, PostgreSQL and Kafka on AWS")).toEqual(expect.arrayContaining(["Go", "SQL", "Kafka", "AWS"]));
  });

  it("flags recruiter blasts, not normal hiring posts", () => {
    expect(spamSignals("URGENT HIRING!! Multiple openings, share your CV to hr@x.com")).toHaveLength(3);
    expect(spamSignals(VALID_POST.description)).toHaveLength(0);
  });
});

describe("ranking", () => {
  it("hot score rises with votes and decays with age", () => {
    expect(hotScore(10, 1)).toBeGreaterThan(hotScore(5, 1));
    expect(hotScore(10, 1)).toBeGreaterThan(hotScore(10, 48));
  });

  it("a fresh post with a few votes beats an old post with many", () => {
    const fresh = { job: job({ createdAt: hoursAgo(1) }), score: 3 };
    const old = { job: job({ createdAt: hoursAgo(100) }), score: 20 };
    expect(sortJobs([old, fresh], "hot", NOW)[0]).toBe(fresh);
    expect(sortJobs([fresh, old], "top", NOW)[0]).toBe(old);
    expect(sortJobs([old, fresh], "new", NOW)[0]).toBe(fresh);
  });

  it("imported posts stay live while the company still lists them, then expire 3 days later", () => {
    const seenToday = job({ kind: "imported", createdAt: hoursAgo(24 * 60), lastSeenAt: hoursAgo(2) });
    const goneFromFeed = job({ kind: "imported", createdAt: hoursAgo(24 * 10), lastSeenAt: hoursAgo(24 * 3) });
    expect(isExpired(seenToday, NOW)).toBe(false); // 60 days old, but still on the careers page
    expect(isExpired(goneFromFeed, NOW)).toBe(true);
  });

  it("posts expire after 7 days", () => {
    expect(isExpired(job({ createdAt: hoursAgo(24 * 7 - 1) }), NOW)).toBe(false);
    expect(isExpired(job({ createdAt: hoursAgo(24 * 7) }), NOW)).toBe(true);
  });
});

describe("jobs service", () => {
  it("lists only live posts and applies filters", async () => {
    const repo = new MemoryJobRepository([
      job({ id: "a", stack: ["Python"], function: "ai-ml" }),
      job({ id: "b", stack: ["React"], function: "engineering" }),
      job({ id: "old", createdAt: hoursAgo(24 * 8) }),
    ]);
    const all = await listJobs(repo, { now: NOW });
    expect(all.jobs.map((j) => j.id).sort()).toEqual(["a", "b"]);
    expect(all.total).toBe(2);
    expect(all.stacks).toEqual(["Python", "React"]);
    expect((await listJobs(repo, { filters: { stack: "React" }, now: NOW })).jobs.map((j) => j.id)).toEqual(["b"]);
    expect((await listJobs(repo, { filters: { function: "ai-ml" }, now: NOW })).jobs.map((j) => j.id)).toEqual(["a"]);
  });

  it("paginates with limit and reports the total", async () => {
    const repo = new MemoryJobRepository([...Array(5)].map((_, i) => job({ id: `j${i}`, createdAt: hoursAgo(i + 1) })));
    const page = await listJobs(repo, { sort: "new", limit: 2, now: NOW });
    expect(page.jobs.map((j) => j.id)).toEqual(["j0", "j1"]);
    expect(page.total).toBe(5);
    expect(page.companies).toBe(1);
  });

  it("creates a post with detected source and stack", async () => {
    const repo = new MemoryJobRepository();
    const created = await createJob(repo, VALID_POST, NOW);
    expect(created.source).toBe("linkedin");
    expect(created.stack).toEqual(expect.arrayContaining(["Go", "Kafka"]));
    expect(created.expiresAt).toBe(new Date(NOW.getTime() + 7 * 24 * 3600_000).toISOString());
  });

  it("rejects spam and invalid posts with a clear message", async () => {
    const repo = new MemoryJobRepository();
    await expect(
      createJob(repo, { ...VALID_POST, description: "Urgent hiring! Multiple openings for freshers. Share your CV to jobs@agency.com " + "x".repeat(60) }),
    ).rejects.toThrow(/recruiter blast/);
    await expect(createJob(repo, { ...VALID_POST, title: "" })).rejects.toThrow(/job title/);
  });

  it("one person, one vote: voting is idempotent and can be changed or removed", async () => {
    const repo = new MemoryJobRepository([job({ id: "a" })]);
    expect((await voteJob(repo, { id: "a", voterId: "u1", value: 1, now: NOW })).score).toBe(1);
    expect((await voteJob(repo, { id: "a", voterId: "u1", value: 1, now: NOW })).score).toBe(1);
    expect((await voteJob(repo, { id: "a", voterId: "u1", value: -1, now: NOW })).score).toBe(-1);
    const removed = await voteJob(repo, { id: "a", voterId: "u1", value: 0, now: NOW });
    expect(removed.score).toBe(0);
    expect(removed.myVote).toBe(0);
  });

  it("never exposes voter ids", async () => {
    const repo = new MemoryJobRepository([job({ id: "a" })], { a: { secret: 1 } });
    const { jobs } = await listJobs(repo, { now: NOW });
    expect(JSON.stringify(jobs)).not.toContain("secret");
  });
});

describe("FileJobRepository", () => {
  it("seeds on first run, persists writes and survives a restart", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "jobs-")), "jobs.json");
    const repo = new FileJobRepository(path);
    expect((await repo.list()).length).toBe(seedJobs(NOW).length);
    await repo.create(job({ id: "mine" }));
    await repo.vote("mine", "voter-1", 1);

    const reopened = new FileJobRepository(path);
    expect(await reopened.get("mine")).toBeTruthy();
    expect((await reopened.voteSummary("mine", "voter-1")).score).toBe(1);
    expect(JSON.parse(readFileSync(path, "utf8"))).toHaveLength(seedJobs(NOW).length + 1);
  });

  it("skips corrupt rows instead of crashing", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "jobs-")), "jobs.json");
    writeFileSync(path, JSON.stringify([job({ id: "ok" }), { nonsense: true }]));
    const repo = new FileJobRepository(path);
    expect((await repo.list()).map((s) => s.job.id)).toEqual(["ok"]);
  });
});

describe("jobs API", () => {
  afterEach(() => setJobRepository(null));

  it("GET lists, POST creates, vote updates score", async () => {
    setJobRepository(new MemoryJobRepository());
    const created = await POST(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        body: JSON.stringify(VALID_POST),
        headers: { "x-forwarded-for": "9.9.9.1" },
      }),
    );
    expect(created.status).toBe(201);
    const { data: post } = await created.json();

    const voted = await VOTE(
      new Request(`http://localhost/api/jobs/${post.id}/vote`, {
        method: "POST",
        body: JSON.stringify({ voterId: "voter-12345", value: 1 }),
      }),
      { params: Promise.resolve({ id: post.id }) },
    );
    expect((await voted.json()).data.score).toBe(1);

    const list = await GET(new Request("http://localhost/api/jobs?sort=new&stack=Go&voter=voter-12345&function="));
    const { data } = await list.json();
    expect(data.jobs).toHaveLength(1);
    expect(data.jobs[0].myVote).toBe(1);
  });

  it("returns 400 for bad filters and 404 for unknown posts", async () => {
    setJobRepository(new MemoryJobRepository());
    expect((await GET(new Request("http://localhost/api/jobs?sort=random"))).status).toBe(400);
    const res = await VOTE(
      new Request("http://localhost/api/jobs/nope/vote", { method: "POST", body: JSON.stringify({ voterId: "voter-12345", value: 1 }) }),
      { params: Promise.resolve({ id: "nope" }) },
    );
    expect(res.status).toBe(404);
  });
});
