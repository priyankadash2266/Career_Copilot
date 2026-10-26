import { AppError } from "@/lib/errors";
import { detectSource, detectStack, SPAM_THRESHOLD, spamSignals } from "./classify";
import { expiresAt, isExpired, sortJobs } from "./ranking";
import type { JobRepository } from "./repository";
import { NewJobSchema, type Job, type JobFilters, type JobSort, type JobView, type JobsPage, type ScoredJob } from "./types";

/**
 * Service layer for the jobs board. Pure business rules; the repository is
 * passed in, so these functions are tested with an in-memory repository and
 * run unchanged against Postgres in production.
 */

export function toView({ job, score, myVote }: ScoredJob): JobView {
  return { ...job, score, myVote, expiresAt: expiresAt(job).toISOString() };
}

export function matchesFilters(job: Job, f: JobFilters): boolean {
  if (f.function && job.function !== f.function) return false;
  if (f.seniority && job.seniority !== f.seniority) return false;
  if (f.workMode && job.workMode !== f.workMode) return false;
  if (f.source && job.source !== f.source) return false;
  if (f.stack && !job.stack.includes(f.stack)) return false;
  if (f.q) {
    const haystack = `${job.title} ${job.company} ${job.location} ${job.description}`.toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every((word) => haystack.includes(word))) return false;
  }
  return true;
}

/** Most common stacks among live posts, so the filter chips show what is actually hiring. */
export function topStacks(jobs: Job[], limit = 30): string[] {
  const counts = new Map<string, number>();
  for (const j of jobs) for (const s of j.stack) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([s]) => s);
}

export const MAX_PAGE = 200;

export async function listJobs(
  repo: JobRepository,
  options: { filters?: JobFilters; sort?: JobSort; voterId?: string; limit?: number; now?: Date } = {},
): Promise<JobsPage> {
  const { filters = {}, sort = "hot", voterId, limit = 30, now = new Date() } = options;
  const live = (await repo.list(voterId)).filter((s) => !isExpired(s.job, now));
  const matching = sortJobs(live.filter((s) => matchesFilters(s.job, filters)), sort, now);
  return {
    // Pagination: the client asks for more by raising `limit`; total says when to stop.
    jobs: matching.slice(0, Math.min(limit, MAX_PAGE)).map(toView),
    total: matching.length,
    stacks: topStacks(live.map((s) => s.job)),
    companies: new Set(live.map((s) => s.job.company)).size,
  };
}

export async function createJob(repo: JobRepository, input: unknown, now = new Date()): Promise<JobView> {
  const parsed = NewJobSchema.safeParse(input);
  if (!parsed.success) throw new AppError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Invalid job post.");
  const data = parsed.data;

  const signals = spamSignals(`${data.title}\n${data.description}`);
  if (signals.length >= SPAM_THRESHOLD) {
    throw new AppError(
      "INVALID_INPUT",
      `This looks like a recruiter blast (${signals.join(", ")}). The board is for posts from the hiring manager.`,
      422,
    );
  }

  const job: Job = {
    ...data,
    id: crypto.randomUUID(),
    kind: "community",
    source: detectSource(data.sourceUrl),
    stack: detectStack(`${data.title}\n${data.description}`),
    createdAt: now.toISOString(),
  };
  await repo.create(job);
  return toView({ job, score: 0, myVote: 0 });
}

/** value 1 = upvote, -1 = downvote, 0 = remove my vote. Voting twice the same way is a no-op (idempotent). */
export async function voteJob(
  repo: JobRepository,
  params: { id: string; voterId: string; value: 1 | -1 | 0; now?: Date },
): Promise<JobView> {
  const { id, voterId, value, now = new Date() } = params;
  const job = await repo.get(id);
  if (!job || isExpired(job, now)) throw new AppError("NOT_FOUND", "This post no longer exists.", 404);
  await repo.vote(id, voterId, value);
  return toView({ job, ...(await repo.voteSummary(id, voterId)) });
}
