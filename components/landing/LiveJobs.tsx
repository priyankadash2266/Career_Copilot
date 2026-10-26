import Link from "next/link";
import { getJobRepository } from "@/lib/jobs/repository";
import { listJobs } from "@/lib/jobs/service";
import { label, timeAgo } from "@/lib/format";

/**
 * Server Component: reads the jobs board straight from the service layer on
 * the server. No API round trip, no client JavaScript for this section.
 */
export default async function LiveJobs() {
  const { jobs, total, companies } = await listJobs(getJobRepository(), { sort: "hot", limit: 4 });
  const top = jobs;
  if (top.length === 0) return null;

  return (
    <section className="border-y border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-serif text-4xl md:text-5xl">Hot on the board right now</h2>
          <Link href="/jobs" className="text-sm font-semibold underline-offset-4 hover:underline">
            See all {total} roles from {companies} companies
          </Link>
        </div>
        <div className="mt-10 grid gap-px bg-line md:grid-cols-2">
          {top.map((j) => (
            <Link key={j.id} href={`/jobs?focus=${j.id}`} className="block bg-ink p-6 transition-colors hover:bg-surface">
              <p className="text-[13px] text-muted">
                {j.company} · {label(j.seniority)} · {label(j.workMode)} · {timeAgo(j.createdAt)}
              </p>
              <p className="mt-2 font-serif text-2xl">{j.title}</p>
              <p className="mt-3 text-sm text-muted line-clamp-2">{j.description}</p>
              <p className="mt-4 text-sm">
                <span className="text-gold font-semibold">▲ {j.score}</span>
                <span className="ml-4 text-muted">{j.stack.slice(0, 4).join(", ")}</span>
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
