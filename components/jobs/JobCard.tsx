"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { JobView } from "@/lib/jobs/types";
import { label, timeAgo, timeLeft } from "@/lib/format";
import { setMatchPrefill } from "@/lib/match/prefill";
import { applicationsStore, newApplication } from "@/lib/storage/stores";
import { Chip, TextButton } from "@/components/ui/kit";
import { cn } from "@/lib/utils";

export default function JobCard({
  job,
  fit,
  tracked,
  focused,
  onVote,
}: {
  job: JobView;
  fit: { matched: string[]; percent: number } | null;
  tracked: boolean;
  focused: boolean;
  onVote: (job: JobView, value: 1 | -1 | 0) => void;
}) {
  const [open, setOpen] = useState(focused);
  const ref = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused]);

  const imported = job.kind === "imported";
  const vote = (value: 1 | -1) => onVote(job, job.myVote === value ? 0 : value);

  function checkFit() {
    setMatchPrefill({ jobDescription: job.description, jobTitle: job.title, company: job.company });
    router.push("/match");
  }

  function track() {
    applicationsStore.add(newApplication({ company: job.company, role: job.title, link: job.sourceUrl || undefined }));
  }

  return (
    <article
      ref={ref}
      className={cn("grid grid-cols-[48px_1fr] gap-4 border-b border-line py-7 md:grid-cols-[56px_1fr_auto] md:gap-6", focused && "bg-surface/60")}
    >
      {/* Votes */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <button
          aria-label="Upvote"
          aria-pressed={job.myVote === 1}
          onClick={() => vote(1)}
          className={cn("p-1 text-muted hover:text-gold", job.myVote === 1 && "text-gold")}
        >
          <ChevronUp size={22} />
        </button>
        <span className={cn("font-serif text-2xl tabular-nums leading-none", job.myVote !== 0 && "text-gold")}>{job.score}</span>
        <button
          aria-label="Downvote"
          aria-pressed={job.myVote === -1}
          onClick={() => vote(-1)}
          className={cn("p-1 text-muted hover:text-rose", job.myVote === -1 && "text-rose")}
        >
          <ChevronDown size={22} />
        </button>
      </div>

      {/* Body */}
      <div className="min-w-0">
        <p className="text-[13px] text-muted">
          <span className="font-semibold text-text/90">{job.company}</span>
          {imported ? <> · from their careers page</> : job.postedBy && <> · posted by the {job.postedBy}</>} · {timeAgo(job.createdAt)}
          {imported ? (
            <span className="ml-2 border border-gold/40 px-1.5 py-px text-[11px] text-gold">Verified opening</span>
          ) : (
            !job.demo && <span className="ml-2 border border-line-strong px-1.5 py-px text-[11px]">Hiring manager</span>
          )}
          {job.demo && <span className="ml-2 border border-line-strong px-1.5 py-px text-[11px]">Demo post</span>}
        </p>
        <h2 className="mt-1.5 font-serif text-[28px] leading-tight">{job.title}</h2>
        <p className="mt-1.5 text-sm text-muted">
          {label(job.seniority)} · {label(job.workMode)} · {job.location} · {label(job.function)}
        </p>

        {job.stack.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {job.stack.map((s) => (
              <Chip key={s} tone={fit?.matched.includes(s) ? "good" : "neutral"}>
                {s}
              </Chip>
            ))}
          </div>
        )}

        {open && <p className="mt-5 max-w-2xl whitespace-pre-line leading-relaxed text-text/85">{job.description}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <TextButton onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "Hide post" : "Read post"}
          </TextButton>
          <TextButton onClick={checkFit}>Check my fit and write a cover letter</TextButton>
          <TextButton onClick={track} disabled={tracked}>
            {tracked ? "In your tracker" : "Track"}
          </TextButton>
          {job.sourceUrl && (
            <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:underline">
              {imported ? `Apply on ${job.company}'s site` : `Open on ${job.source === "other" ? "source" : label(job.source)}`} <ExternalLink size={12} />
            </a>
          )}
          {!imported && <span className="text-[12px] text-muted">{timeLeft(job.expiresAt)}</span>}
        </div>
      </div>

      {/* Fit */}
      <div className="col-start-2 md:col-start-3 md:text-right">
        {fit && (
          <>
            <p className="font-serif text-4xl leading-none tabular-nums text-mint">{fit.percent}%</p>
            <p className="mt-1 text-[12px] text-muted">
              stack fit, {fit.matched.length} of {job.stack.length}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
