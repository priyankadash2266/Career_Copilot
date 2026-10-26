"use client";

import { useState, type FormEvent } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { useLocalStore } from "@/lib/storage/localStore";
import {
  APPLICATION_STATUSES,
  applicationsStore,
  newApplication,
  reportsStore,
  type Application,
  type ApplicationStatus,
  type SavedReport,
} from "@/lib/storage/stores";
import { cn } from "@/lib/utils";
import { FieldLabel, PopButton, PopLink, TextButton, scoreText } from "@/components/ui/kit";
import Results from "@/components/analyze/Results";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer",
  rejected: "Closed",
};

export default function Tracker() {
  const [tab, setTab] = useState<"applications" | "reports">("applications");
  const applications = useLocalStore(applicationsStore);
  const reports = useLocalStore(reportsStore);

  return (
    <div>
      <div className="mb-10 flex gap-6 border-b border-line" role="tablist">
        {(
          [
            ["applications", `Applications (${applications.length})`],
            ["reports", `Resume reports (${reports.length})`],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn("-mb-px border-b-2 pb-3 text-sm font-semibold", tab === key ? "border-gold text-text" : "border-transparent text-muted hover:text-text")}
          >
            {text}
          </button>
        ))}
      </div>
      {tab === "applications" ? <Applications items={applications} /> : <Reports items={reports} />}
      <p className="mt-16 text-[13px] text-muted">Everything on this page is stored in this browser only. Clearing site data removes it.</p>
    </div>
  );
}

/* ------------------------------ Applications ------------------------------ */

function Applications({ items }: { items: Application[] }) {
  const [draft, setDraft] = useState({ company: "", role: "", link: "" });

  function add(e: FormEvent) {
    e.preventDefault();
    if (!draft.company.trim() || !draft.role.trim()) return;
    applicationsStore.add(newApplication({ company: draft.company.trim(), role: draft.role.trim(), link: draft.link.trim() || undefined }));
    setDraft({ company: "", role: "", link: "" });
  }

  const move = (a: Application, status: ApplicationStatus) =>
    applicationsStore.update(a.id, { status, updatedAt: new Date().toISOString() });

  const count = (s: ApplicationStatus) => items.filter((a) => a.status === s).length;
  const applied = items.filter((a) => a.status !== "saved").length;
  const interviewRate = applied ? Math.round(((count("interview") + count("offer")) / applied) * 100) : 0;

  return (
    <div className="space-y-10">
      <form onSubmit={add} className="grid gap-4 border border-line bg-surface p-6 md:grid-cols-[1fr_1fr_1.2fr_auto] md:items-end rounded-[4px]">
        <div>
          <FieldLabel htmlFor="a-company">Company</FieldLabel>
          <input id="a-company" required value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} className="field" />
        </div>
        <div>
          <FieldLabel htmlFor="a-role">Role</FieldLabel>
          <input id="a-role" required value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className="field" />
        </div>
        <div>
          <FieldLabel htmlFor="a-link" hint="Optional">Link</FieldLabel>
          <input id="a-link" type="url" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} className="field" />
        </div>
        <PopButton type="submit">Add</PopButton>
      </form>

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ["Tracked", items.length],
            ["Applied", applied],
            ["Interviewing", count("interview")],
            ["Interview rate", `${interviewRate}%`],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[13px] text-muted">{k}</p>
              <p className="font-serif text-5xl">{v}</p>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-serif text-3xl">Nothing tracked yet.</p>
          <p className="mt-2 text-muted">Add an application above, or press Track on any hiring post.</p>
          <PopLink href="/jobs" variant="dark" size="sm" className="mt-6">
            Browse hiring posts
          </PopLink>
        </div>
      ) : (
        <div className="grid gap-px bg-line lg:grid-cols-5">
          {APPLICATION_STATUSES.map((status) => (
            <section key={status} className="bg-ink p-4 lg:min-h-64">
              <h3 className="mb-4 flex justify-between text-sm font-bold">
                {STATUS_LABEL[status]}
                <span className="font-normal text-muted">{count(status)}</span>
              </h3>
              <div className="space-y-3">
                {items
                  .filter((a) => a.status === status)
                  .map((a) => (
                    <article key={a.id} className="border border-line bg-surface p-4 rounded-[4px]">
                      <p className="font-serif text-xl leading-tight">{a.role}</p>
                      <p className="mt-1 text-sm text-muted">{a.company}</p>
                      {a.matchScore !== undefined && <p className={cn("mt-2 text-[13px] font-semibold", scoreText(a.matchScore))}>{a.matchScore}% match</p>}
                      <div className="mt-3 flex items-center gap-3">
                        <label className="flex-1">
                          <span className="sr-only">Status</span>
                          <select value={a.status} onChange={(e) => move(a, e.target.value as ApplicationStatus)} className="field !py-1.5 !px-2 text-[13px]">
                            {APPLICATION_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </label>
                        {a.link && (
                          <a href={a.link} target="_blank" rel="noopener noreferrer" aria-label="Open job link" className="text-muted hover:text-gold">
                            <ExternalLink size={15} />
                          </a>
                        )}
                        <button aria-label={`Remove ${a.role} at ${a.company}`} onClick={() => applicationsStore.remove(a.id)} className="text-muted hover:text-rose">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Reports -------------------------------- */

function Reports({ items }: { items: SavedReport[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = items.find((r) => r.id === openId);

  if (open) {
    return (
      <div>
        <TextButton onClick={() => setOpenId(null)} className="mb-8 no-print">
          Back to all reports
        </TextButton>
        <Results result={open.result} roleTitle={open.roleTitle} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-serif text-3xl">No reports yet.</p>
        <p className="mt-2 text-muted">Each time you score your resume, the report is saved here.</p>
        <PopLink href="/analyze" size="sm" className="mt-6">
          Score my resume
        </PopLink>
      </div>
    );
  }

  return (
    <ul className="border-t border-line">
      {items.map((r) => (
        <li key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-6 border-b border-line py-6 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <button onClick={() => setOpenId(r.id)} className="text-left">
            <p className="font-serif text-2xl hover:text-gold">{r.roleTitle}</p>
            <p className="text-sm text-muted">{new Date(r.savedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          </button>
          <p className="hidden md:block">
            <span className={cn("font-serif text-3xl", scoreText(r.score))}>{r.score}</span>
            <span className="ml-1 text-sm text-muted">score</span>
          </p>
          <p className="hidden md:block">
            <span className={cn("font-serif text-3xl", scoreText(r.readiness))}>{r.readiness}%</span>
            <span className="ml-1 text-sm text-muted">ready</span>
          </p>
          <div className="flex items-center gap-5">
            <TextButton onClick={() => setOpenId(r.id)}>Open</TextButton>
            <button aria-label={`Delete report for ${r.roleTitle}`} onClick={() => reportsStore.remove(r.id)} className="text-muted hover:text-rose">
              <Trash2 size={16} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
