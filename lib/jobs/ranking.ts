import { IMPORT_GRACE_DAYS, POST_TTL_DAYS, type Job, type JobSort } from "./types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * When a post leaves the board.
 *  - community: 7 days after it was posted
 *  - imported:  3 days after the daily import last saw it in the company's feed
 *    (so a role closed by the company disappears on its own, no cron delete needed)
 */
export function expiresAt(job: Pick<Job, "kind" | "createdAt" | "lastSeenAt">): Date {
  if (job.kind === "imported") {
    return new Date(new Date(job.lastSeenAt ?? job.createdAt).getTime() + IMPORT_GRACE_DAYS * DAY);
  }
  return new Date(new Date(job.createdAt).getTime() + POST_TTL_DAYS * DAY);
}

export function isExpired(job: Pick<Job, "kind" | "createdAt" | "lastSeenAt">, now: Date): boolean {
  return now >= expiresAt(job);
}

/**
 * "Hot" ranking, the Hacker News formula:  (votes + 1) / (ageHours + 2)^1.5
 *
 * Votes push a post up, age pulls it down. The exponent (gravity) controls
 * how fast old posts sink. +2 hours stops brand-new posts with one vote from
 * shooting to the top (and avoids dividing by zero).
 */
export const GRAVITY = 1.5;

export function hotScore(votes: number, ageHours: number): number {
  return (votes + 1) / Math.pow(Math.max(0, ageHours) + 2, GRAVITY);
}

export function sortJobs<T extends { job: Pick<Job, "createdAt">; score: number }>(items: T[], sort: JobSort, now: Date): T[] {
  const age = (i: T) => (now.getTime() - new Date(i.job.createdAt).getTime()) / HOUR;
  const newest = (a: T, b: T) => b.job.createdAt.localeCompare(a.job.createdAt);
  const copy = items.slice();
  if (sort === "new") return copy.sort(newest);
  if (sort === "top") return copy.sort((a, b) => b.score - a.score || newest(a, b));
  return copy.sort((a, b) => hotScore(b.score, age(b)) - hotScore(a.score, age(a)) || newest(a, b));
}
