"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, Loader2, RotateCcw } from "lucide-react";
import { postForm } from "@/lib/api/client";
import type { MatchResult } from "@/lib/match/analyzeMatch";
import { takeMatchPrefill } from "@/lib/match/prefill";
import { applicationsStore, newApplication } from "@/lib/storage/stores";
import { Bar, Chip, ErrorNote, FieldLabel, Panel, PopButton, Stat, TextButton, scoreText } from "@/components/ui/kit";
import ResumeInput, { appendResume, type ResumeValue } from "@/components/resume/ResumeInput";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; result: MatchResult };

export default function MatchTool() {
  const [resume, setResume] = useState<ResumeValue>({ mode: "pdf", file: null });
  const [jd, setJd] = useState({ jobDescription: "", jobTitle: "", company: "" });
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // A post opened from the jobs board arrives via sessionStorage. Browser-only
  // storage can only be read after mounting, so this is a legitimate effect.
  useEffect(() => {
    const prefill = takeMatchPrefill();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefill) setJd(prefill);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = new FormData();
    const problem = appendResume(body, resume);
    if (problem) return setStatus({ kind: "error", message: problem });
    if (jd.jobDescription.trim().length < 100) return setStatus({ kind: "error", message: "Paste the full job description (at least a few lines)." });
    body.set("jobDescription", jd.jobDescription);
    body.set("jobTitle", jd.jobTitle);
    body.set("company", jd.company);

    setStatus({ kind: "loading" });
    const res = await postForm<MatchResult>("/api/match", body);
    if (!res.ok) return setStatus({ kind: "error", message: res.message });
    setStatus({ kind: "done", result: res.data });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (status.kind === "done") return <MatchResults result={status.result} onReset={() => setStatus({ kind: "idle" })} />;

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="jobTitle" hint="Optional">Job title</FieldLabel>
            <input id="jobTitle" value={jd.jobTitle} onChange={(e) => setJd({ ...jd, jobTitle: e.target.value })} placeholder="Backend Engineer" className="field" />
          </div>
          <div>
            <FieldLabel htmlFor="company" hint="Optional">Company</FieldLabel>
            <input id="company" value={jd.company} onChange={(e) => setJd({ ...jd, company: e.target.value })} placeholder="Acme" className="field" />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="jobDescription">Job description</FieldLabel>
          <textarea
            id="jobDescription"
            rows={15}
            value={jd.jobDescription}
            onChange={(e) => setJd({ ...jd, jobDescription: e.target.value })}
            placeholder="Paste the full job description or hiring post…"
            className="field text-sm leading-relaxed"
          />
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[13px] font-semibold text-text/90">Your resume</p>
          <ResumeInput value={resume} onChange={(v) => { setResume(v); setStatus({ kind: "idle" }); }} onError={(message) => setStatus({ kind: "error", message })} />
        </div>
        {status.kind === "error" && <ErrorNote>{status.message}</ErrorNote>}
        <PopButton type="submit" disabled={status.kind === "loading"} className="w-full">
          {status.kind === "loading" ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Matching and writing your letter…
            </>
          ) : (
            "Match me to this job"
          )}
        </PopButton>
      </div>
    </form>
  );
}

function MatchResults({ result, onReset }: { result: MatchResult; onReset: () => void }) {
  const { match, coverLetter, tailoringTips, meta } = result;
  const [copied, setCopied] = useState(false);
  const [tracked, setTracked] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function track() {
    applicationsStore.add(newApplication({ company: result.company, role: result.jobTitle, matchScore: match.score }));
    setTracked(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6 pb-4">
        <div>
          <p className="text-sm text-muted">{result.company}</p>
          <h2 className="mt-2 font-serif text-5xl md:text-6xl leading-none">{result.jobTitle}</h2>
        </div>
        <div className="flex gap-4">
          <PopButton variant="dark" size="sm" onClick={track} disabled={tracked}>
            {tracked ? "In your tracker" : "Track this application"}
          </PopButton>
          <PopButton size="sm" onClick={onReset}>
            <RotateCcw size={15} /> Try another job
          </PopButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
        <Stat label="Match score" value={match.score} suffix="/100" tone={scoreText(match.score)} />
        <Stat label="Verdict" value={match.verdict} />
        <Stat label="Skills covered" value={`${match.skills.matched.length}/${match.skills.matched.length + match.skills.missing.length}`} />
        <Stat
          label="Experience"
          value={match.experience.candidate}
          suffix={match.experience.required !== null ? `yrs of ${match.experience.required}+` : "yrs"}
        />
      </div>

      <Panel title="How an ATS would see you">
        <div className="grid gap-6 md:grid-cols-3">
          {match.breakdown.map((c) => (
            <div key={c.label}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold">{c.label}</span>
                <span className="text-muted tabular-nums">{c.percent}% · weight {Math.round(c.weight * 100)}%</span>
              </div>
              <Bar percent={c.percent} label={c.label} />
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Skills">
          <div className="flex flex-wrap gap-2">
            {match.skills.matched.map((s) => <Chip key={s} tone="good">{s}</Chip>)}
            {match.skills.missing.map((s) => <Chip key={s} tone="bad">{s}</Chip>)}
            {match.skills.matched.length + match.skills.missing.length === 0 && <p className="text-muted">No known skills in this description.</p>}
          </div>
        </Panel>
        <Panel title="Keywords">
          <div className="flex flex-wrap gap-2">
            {match.keywords.matched.map((k) => <Chip key={k} tone="good">{k}</Chip>)}
            {match.keywords.missing.map((k) => <Chip key={k} tone="neutral">{k}</Chip>)}
          </div>
          <p className="mt-5 text-[13px] text-muted">Grey words appear in the job post but not in your resume. Add the ones that are true for you.</p>
        </Panel>
      </div>

      <Panel
        title="Your cover letter"
        aside={
          <TextButton onClick={copy}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
          </TextButton>
        }
      >
        <p className="max-w-2xl whitespace-pre-line font-serif text-xl leading-relaxed text-text/90">{coverLetter}</p>
        <p className="mt-6 text-[13px] text-muted">
          {meta.letterSource === "llm" ? `Written by ${meta.model}.` : "Written from a template. Add an LLM key for a fully tailored letter."} Read it once and make it sound like you.
        </p>
      </Panel>

      <Panel title="Edit your resume for this job">
        <ol className="space-y-4">
          {tailoringTips.map((t, i) => (
            <li key={t} className="grid grid-cols-[32px_1fr] gap-2 leading-relaxed">
              <span className="font-serif text-2xl leading-none text-gold">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
