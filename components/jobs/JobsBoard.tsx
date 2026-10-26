"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { api, postJson } from "@/lib/api/client";
import { stackFit } from "@/lib/jobs/fit";
import { FUNCTIONS, SENIORITIES, SOURCES, WORK_MODES, type JobView, type JobsPage } from "@/lib/jobs/types";
import { label } from "@/lib/format";
import { applicationsStore, reportsStore } from "@/lib/storage/stores";
import { useLocalStore } from "@/lib/storage/localStore";
import { getVoterId } from "@/lib/storage/voter";
import { cn } from "@/lib/utils";
import { ErrorNote, PopLink } from "@/components/ui/kit";
import JobCard from "./JobCard";

type Sort = "hot" | "new" | "top" | "fit";
const SORT_LABELS: Record<Sort, string> = { hot: "Hot", new: "New", top: "Top", fit: "Best fit" };

interface Filters {
  function: string;
  seniority: string;
  workMode: string;
  source: string;
  stack: string;
  q: string;
}
const EMPTY: Filters = { function: "", seniority: "", workMode: "", source: "", stack: "", q: "" };

type Loaded = { key: string; jobs: JobView[]; stacks: string[]; total: number; companies: number; error?: string };

const PAGE = 30;

/** Debounce a fast-changing value (search box) so we do not fire a request per keystroke. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export default function JobsBoard() {
  const focusId = useSearchParams().get("focus");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<Sort>("hot");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const q = useDebounced(filters.q, 300);

  // Your latest report (stored on this device) powers the "fit" numbers.
  const reports = useLocalStore(reportsStore);
  const applications = useLocalStore(applicationsStore);
  const mySkills = useMemo(() => new Set(reports[0]?.result.profile.skills.map((s) => s.name) ?? []), [reports]);
  const trackedKeys = useMemo(() => new Set(applications.map((a) => `${a.company}|${a.role}`)), [applications]);

  // The URL query is the "key" of what we want; loading = we do not have that key yet.
  const queryKey = useMemo(() => {
    // "Best fit" is computed in the browser from your saved report, so fetch a larger page for it.
    const p = new URLSearchParams({ sort: sort === "fit" ? "hot" : sort, limit: String(sort === "fit" ? 200 : limit) });
    for (const [k, v] of Object.entries({ ...filters, q })) if (v) p.set(k, v);
    return p.toString();
  }, [filters, q, sort, limit]);

  useEffect(() => {
    const controller = new AbortController();
    api<JobsPage>(`/api/jobs?${queryKey}&voter=${getVoterId()}`, { signal: controller.signal }).then((res) => {
      if (res.ok) setLoaded({ key: queryKey, ...res.data });
      else if (res.message !== "aborted")
        setLoaded((prev) => ({ key: queryKey, jobs: prev?.jobs ?? [], stacks: prev?.stacks ?? [], total: prev?.total ?? 0, companies: prev?.companies ?? 0, error: res.message }));
    });
    return () => controller.abort(); // a newer filter change cancels the older request
  }, [queryKey]);

  const loading = loaded?.key !== queryKey;
  const jobs = useMemo(() => {
    const list = (loaded?.jobs ?? []).map((job) => ({ job, fit: stackFit(job.stack, mySkills) }));
    if (sort === "fit") list.sort((a, b) => (b.fit?.percent ?? -1) - (a.fit?.percent ?? -1));
    return list;
  }, [loaded, mySkills, sort]);

  /** Optimistic update: change the UI now, roll back if the server says no. */
  async function onVote(job: JobView, value: 1 | -1 | 0) {
    const apply = (next: JobView) =>
      setLoaded((prev) => prev && { ...prev, jobs: prev.jobs.map((j) => (j.id === next.id ? next : j)) });
    apply({ ...job, myVote: value, score: job.score - job.myVote + value });
    const res = await postJson<JobView>(`/api/jobs/${job.id}/vote`, { voterId: getVoterId(), value });
    apply(res.ok ? res.data : job);
  }

  // Changing a filter starts again from the first page.
  const set = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setLimit(PAGE);
  };
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div>
      {/* Controls */}
      <div className="sticky top-[65px] z-30 -mx-5 border-b border-line bg-ink/90 px-5 pb-4 pt-2 backdrop-blur-md md:mx-0 md:px-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-5" role="tablist" aria-label="Sort posts">
            {(Object.keys(SORT_LABELS) as Sort[])
              .filter((s) => s !== "fit" || mySkills.size > 0)
              .map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={sort === s}
                  onClick={() => {
                    setSort(s);
                    setLimit(PAGE);
                  }}
                  className={cn("border-b-2 pb-1 text-sm font-semibold", sort === s ? "border-gold text-text" : "border-transparent text-muted hover:text-text")}
                >
                  {SORT_LABELS[s]}
                </button>
              ))}
          </div>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search posts</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Search title, company, city" className="field !py-2.5 pl-9 text-sm" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              ["function", "Function", FUNCTIONS],
              ["seniority", "Seniority", SENIORITIES],
              ["workMode", "Work mode", WORK_MODES],
              ["source", "Source", SOURCES],
            ] as const
          ).map(([key, name, options]) => (
            <label key={key}>
              <span className="sr-only">{name}</span>
              <select value={filters[key]} onChange={(e) => set(key, e.target.value)} className="field !py-2.5 text-sm">
                <option value="">Any {name.toLowerCase()}</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {label(o)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {(loaded?.stacks.length ?? 0) > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {loaded!.stacks.map((s) => (
              <button
                key={s}
                onClick={() => set("stack", filters.stack === s ? "" : s)}
                aria-pressed={filters.stack === s}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1 text-[13px]",
                  filters.stack === s ? "border-gold bg-gold text-ink font-semibold" : mySkills.has(s) ? "border-mint/40 text-mint" : "border-line text-muted hover:text-text",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {loaded && !loaded.error && (
        <p className="mt-5 text-[13px] text-muted">
          {loaded.total} open {loaded.total === 1 ? "role" : "roles"}
          {hasFilters ? " match your filters" : ` across ${loaded.companies} companies`}. Company openings refresh every morning.
        </p>
      )}

      {/* Hint */}
      {mySkills.size === 0 && (
        <p className="mt-6 border-l-2 border-gold bg-gold/5 px-4 py-3 text-sm text-text/90">
          <Link href="/analyze" className="font-semibold underline underline-offset-4">Score your resume</Link> once and every post will show how well your skills fit its stack.
        </p>
      )}

      {/* List */}
      <div aria-busy={loading} className={cn("transition-opacity", loading && loaded && "opacity-50")}>
        {loaded?.error && <div className="mt-6"><ErrorNote>{loaded.error}</ErrorNote></div>}
        {!loaded && <p className="py-16 text-center text-muted">Loading posts…</p>}
        {loaded && !loading && jobs.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-serif text-3xl">No posts match these filters.</p>
            {hasFilters && (
              <button onClick={() => setFilters(EMPTY)} className="mt-4 text-sm font-semibold underline underline-offset-4">
                Clear filters
              </button>
            )}
          </div>
        )}
        {jobs.map(({ job, fit }) => (
          <JobCard
            key={job.id}
            job={job}
            fit={fit}
            tracked={trackedKeys.has(`${job.company}|${job.title}`)}
            focused={job.id === focusId}
            onVote={onVote}
          />
        ))}
      </div>

      {loaded && sort !== "fit" && loaded.jobs.length < loaded.total && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setLimit((l) => l + PAGE)}
            disabled={loading}
            className="border border-line-strong px-6 py-3 text-sm font-semibold hover:border-text disabled:opacity-50"
          >
            {loading ? "Loading…" : `Show more (${loaded.total - loaded.jobs.length} left)`}
          </button>
        </div>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border border-line bg-surface p-8 rounded-[4px]">
        <div>
          <p className="font-serif text-3xl">Hiring for your team?</p>
          <p className="mt-1 text-muted">Post it here if you are the hiring manager. Posts stay up for seven days.</p>
        </div>
        <PopLink href="/jobs/new">Post a job</PopLink>
      </div>
    </div>
  );
}
