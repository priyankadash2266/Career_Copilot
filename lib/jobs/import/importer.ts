import { logger } from "@/lib/logger";
import { detectStack } from "../classify";
import type { JobRepository } from "../repository";
import type { Job } from "../types";
import { COMPANIES, feedUrl, type CompanySource } from "./companies";
import { parseFeed, type RawPosting } from "./feeds";
import { classifyFunction, classifySeniority, classifyWorkMode, isIndia, tidyTitle, truncate } from "./normalize";

/**
 * The daily import (an ETL pipeline: Extract, Transform, Load).
 *
 *   Extract   fetch every company's feed in parallel (bounded concurrency, timeout each)
 *   Transform keep India-based tech roles, classify, detect stack, cap per company
 *   Load      upsert into the repository in one batch (id = ats:slug:externalId)
 *
 * One company failing (404, timeout, changed format) never stops the others:
 * it is reported and skipped. Re-running is safe (idempotent): the same
 * posting always gets the same id, so it is refreshed, never duplicated.
 */

export const MAX_PER_COMPANY = 40;
export const MAX_DESCRIPTION = 2500;

export interface CompanyReport {
  company: string;
  ok: boolean;
  fetched: number;
  kept: number;
  error?: string;
}

export interface ImportReport {
  startedAt: string;
  durationMs: number;
  companies: CompanyReport[];
  kept: number;
  inserted: number;
  updated: number;
}

/** Raw posting -> our Job, or null when it is not an India-based tech role. */
export function toJob(company: CompanySource, p: RawPosting): Job | null {
  if (!isIndia(p.locations, p.countryCode)) return null;
  const title = tidyTitle(p.title);
  const fn = classifyFunction(title, p.department);
  if (fn === "other") return null;
  const indianLocations = p.locations.filter((l) => isIndia([l]));
  const description = truncate(p.description || title, MAX_DESCRIPTION);
  return {
    id: `${company.ats}:${company.slug}:${p.externalId}`,
    kind: "imported",
    title: title.slice(0, 200),
    company: company.name,
    postedBy: "",
    function: fn,
    seniority: classifySeniority(title),
    workMode: classifyWorkMode(p.locations, p.workplaceHint),
    location: (indianLocations[0] ?? p.locations[0] ?? "India").slice(0, 200),
    description,
    sourceUrl: p.url,
    source: "careers",
    stack: detectStack(`${title}\n${description}`),
    createdAt: p.postedAt,
  };
}

async function fetchJson(url: string, fetchImpl: typeof fetch, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    throw new Error(err instanceof Error && err.name === "AbortError" ? "timed out" : err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

/** Run async tasks with at most `limit` in flight: polite to the APIs, fast overall. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function runImport(params: {
  repo: JobRepository;
  companies?: CompanySource[];
  fetchImpl?: typeof fetch;
  now?: Date;
  concurrency?: number;
  timeoutMs?: number;
}): Promise<ImportReport> {
  const { repo, companies = COMPANIES, fetchImpl = fetch, now = new Date(), concurrency = 6, timeoutMs = 12_000 } = params;
  const started = Date.now();
  const jobs: Job[] = [];

  const reports = await mapWithConcurrency(companies, concurrency, async (company): Promise<CompanyReport> => {
    try {
      const raw = parseFeed(company.ats, await fetchJson(feedUrl(company), fetchImpl, timeoutMs), now);
      const kept = raw
        .map((p) => toJob(company, p))
        .filter((j): j is Job => j !== null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // newest first...
        .slice(0, MAX_PER_COMPANY); // ...so no single company floods the board
      jobs.push(...kept);
      return { company: company.name, ok: true, fetched: raw.length, kept: kept.length };
    } catch (err) {
      const error = err instanceof Error ? err.message.slice(0, 200) : String(err);
      logger.warn("import.company_failed", { company: company.name, error });
      return { company: company.name, ok: false, fetched: 0, kept: 0, error };
    }
  });

  const { inserted, updated } = await repo.upsertImported(jobs, now);
  const report: ImportReport = {
    startedAt: now.toISOString(),
    durationMs: Date.now() - started,
    companies: reports,
    kept: jobs.length,
    inserted,
    updated,
  };
  logger.info("import.done", { kept: report.kept, inserted, updated, failed: reports.filter((r) => !r.ok).length, ms: report.durationMs });
  return report;
}
