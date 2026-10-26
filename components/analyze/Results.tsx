"use client";

import Link from "next/link";
import { ArrowRight, Download, ExternalLink, RotateCcw } from "lucide-react";
import type { AnalysisResult } from "@/lib/analysis/types";
import { lpa } from "@/lib/format";
import { Bar, Chip, Panel, PopButton, Stat, scoreText } from "@/components/ui/kit";

/** The full career report. Used right after analysis and when reopening a saved report. */
export default function Results({
  result,
  roleTitle,
  onReset,
}: {
  result: AnalysisResult;
  roleTitle: string;
  onReset?: () => void;
}) {
  const { meta, profile, resumeScore, target, roleMatches, salary, roadmap, gps, insights } = result;
  const maxSalary = Math.max(...salary.map((s) => s.lpa), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6 pb-4">
        <div>
          <p className="text-sm text-muted">Career report for</p>
          <h2 className="font-serif text-5xl md:text-6xl leading-none mt-2">{roleTitle}</h2>
          <p className="mt-4 text-[13px] text-muted">
            {meta.insightsSource === "llm"
              ? `Feedback written by ${meta.model}.`
              : "Rule-based feedback. Add an LLM key for AI-written feedback."}{" "}
            Analysed in {(meta.durationMs / 1000).toFixed(1)}s{meta.cached ? " (cached)" : ""}.
          </p>
        </div>
        <div className="flex gap-4 no-print">
          <PopButton variant="dark" size="sm" onClick={() => window.print()}>
            <Download size={15} /> Save as PDF
          </PopButton>
          {onReset && (
            <PopButton size="sm" onClick={onReset}>
              <RotateCcw size={15} /> Analyse another
            </PopButton>
          )}
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
        <Stat label="Resume score" value={resumeScore.total} suffix="/100" tone={scoreText(resumeScore.total)} />
        <Stat label={`Ready for ${target.title}`} value={target.percent} suffix="%" tone={scoreText(target.percent)} />
        <Stat label="Experience" value={profile.yearsOfExperience} suffix="yrs" />
        <Stat label="Chance of landing it" value={gps.successProbability} suffix="%" tone="text-gold" />
      </div>

      {/* Summary */}
      <Panel title="The short version">
        <p className="max-w-3xl text-lg leading-relaxed text-text/90">{insights.summary}</p>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h4 className="mb-3 text-sm font-bold text-mint">What is working</h4>
            <ul className="space-y-2.5 text-text/85">
              {insights.strengths.map((s) => (
                <li key={s} className="border-l border-mint/40 pl-4 leading-relaxed">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-amber">Fix these first</h4>
            <ul className="space-y-2.5 text-text/85">
              {insights.improvements.map((s) => (
                <li key={s} className="border-l border-amber/40 pl-4 leading-relaxed">{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      {/* Skills */}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Skills we found" aside={<span className="text-sm text-muted">{profile.skills.length}</span>}>
          <div className="flex flex-wrap gap-2">
            {profile.skills.length === 0 && <p className="text-muted">No known skills detected. Add a Skills section.</p>}
            {profile.skills.map((s) => (
              <Chip key={s.name} tone={target.matched.includes(s.name) ? "good" : "neutral"}>
                {s.name}
              </Chip>
            ))}
          </div>
          <p className="mt-5 text-[13px] text-muted">Green skills count towards {roleTitle}.</p>
        </Panel>
        <Panel title="What is missing" aside={<span className="text-sm text-muted">{target.missing.length}</span>}>
          <div className="flex flex-wrap gap-2">
            {target.missing.length === 0 && <p className="text-mint">You cover every skill we track for this role.</p>}
            {target.missing.map((m) => (
              <Chip key={m.name} tone={m.weight === 3 ? "bad" : "neutral"}>
                {m.name}
                {m.weight === 3 && <span className="text-[11px] opacity-70">core</span>}
              </Chip>
            ))}
          </div>
          <p className="mt-5 text-[13px] text-muted">Red skills are core: most interviews for this role will test them.</p>
        </Panel>
      </div>

      {/* Score breakdown */}
      <Panel title="How your score adds up">
        <div className="grid gap-x-12 gap-y-6 md:grid-cols-2">
          {resumeScore.breakdown.map((c) => (
            <div key={c.label}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold">{c.label}</span>
                <span className="tabular-nums text-muted">
                  {c.score} of {c.max}
                </span>
              </div>
              <Bar percent={(c.score / c.max) * 100} label={c.label} />
              {c.score / c.max < 0.6 && <p className="mt-2 text-[13px] leading-relaxed text-muted">{c.tip}</p>}
            </div>
          ))}
        </div>
      </Panel>

      {/* Salary + roadmap */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel title="Salary path">
          <div className="flex h-52 items-end gap-4">
            {salary.map((s, i) => (
              <div key={s.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="font-serif text-xl tabular-nums">{lpa(s.lpa).replace(" LPA", "")}</span>
                <div
                  className={i === 0 ? "w-full bg-surface-2" : "w-full bg-gold"}
                  style={{ height: `${(s.lpa / maxSalary) * 100}%`, opacity: i === 0 ? 1 : 0.55 + i * 0.15 }}
                />
                <span className="text-[12px] text-muted">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] leading-relaxed text-muted">
            Lakh per year. Estimates from curated Indian market bands, assuming you follow the roadmap. Not live salary data.
          </p>
        </Panel>

        <Panel title="Your next two moves">
          <ol className="space-y-6">
            {roadmap.map((stage) => (
              <li key={stage.label} className="grid grid-cols-[88px_1fr] gap-4 border-t border-line pt-4 first:border-0 first:pt-0">
                <span className="text-sm text-muted">{stage.label}</span>
                <div>
                  <p className="font-serif text-2xl">{stage.role}</p>
                  <p className="text-sm text-gold">{lpa(stage.lpa)}</p>
                  {stage.learn.length > 0 && <p className="mt-2 text-sm text-muted">Learn {stage.learn.join(", ")}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      {/* Career GPS */}
      <Panel title="Distance to the role">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
          <span>{gps.from === gps.to ? "You today" : gps.from}</span>
          <ArrowRight size={16} className="text-muted" />
          <span className="font-semibold">{gps.to}</span>
        </div>
        <Bar percent={gps.progress} tone="gold" label="Progress to target role" />
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-[13px] text-muted">Progress</p>
            <p className="font-serif text-4xl">{gps.progress}%</p>
          </div>
          <div>
            <p className="text-[13px] text-muted">Job-ready in (10 hrs a week)</p>
            <p className="font-serif text-4xl">{gps.estimatedMonths === 0 ? "Now" : `${gps.estimatedMonths} months`}</p>
          </div>
          <div>
            <p className="text-[13px] text-muted">Chance of landing it</p>
            <p className="font-serif text-4xl text-gold">{gps.successProbability}%</p>
          </div>
        </div>
      </Panel>

      {/* Roles + jobs */}
      <Panel title="Roles you fit today">
        <div className="space-y-5">
          {roleMatches.map((r) => (
            <div key={r.roleId}>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold">{r.title}</span>
                <span className="flex items-center gap-5">
                  <span className="tabular-nums text-muted">{r.percent}%</span>
                  <a href={r.jobSearchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gold hover:underline no-print">
                    LinkedIn jobs <ExternalLink size={12} />
                  </a>
                </span>
              </div>
              <Bar percent={r.percent} label={`${r.title} fit`} />
            </div>
          ))}
        </div>
        <Link href="/jobs" className="mt-8 inline-block text-sm font-semibold underline-offset-4 hover:underline no-print">
          See hiring posts ranked by your fit
        </Link>
      </Panel>

      {/* Bullet rewrites */}
      {insights.bulletRewrites.length > 0 && (
        <Panel title="Rewrite these bullets">
          <div className="space-y-6">
            {insights.bulletRewrites.map((b) => (
              <div key={b.before} className="grid gap-3 md:grid-cols-2">
                <p className="border-l-2 border-rose/60 bg-surface-2 p-4 text-sm leading-relaxed text-muted">
                  <span className="mb-1 block text-[12px] font-bold text-rose">Before</span>
                  {b.before}
                </p>
                <p className="border-l-2 border-mint/60 bg-surface-2 p-4 text-sm leading-relaxed">
                  <span className="mb-1 block text-[12px] font-bold text-mint">After</span>
                  {b.after}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Interview prep */}
      <Panel title="Questions you will likely be asked">
        <ol className="space-y-4">
          {insights.interviewQuestions.map((q, i) => (
            <li key={q} className="grid grid-cols-[32px_1fr] gap-2 leading-relaxed">
              <span className="font-serif text-2xl leading-none text-gold">{i + 1}</span>
              <span className="text-text/90">{q}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
