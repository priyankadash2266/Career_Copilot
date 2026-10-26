"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import type { AnalysisResult } from "@/lib/analysis/types";
import { postForm } from "@/lib/api/client";
import { reportsStore } from "@/lib/storage/stores";
import { ErrorNote, FieldLabel, PopButton } from "@/components/ui/kit";
import ResumeInput, { appendResume, type ResumeValue } from "@/components/resume/ResumeInput";
import Results from "./Results";

interface RoleOption {
  id: string;
  title: string;
}

/**
 * UI state as a discriminated union: the component can only ever be in ONE of
 * these states, so impossible combinations (loading AND error) cannot happen.
 */
type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: AnalysisResult; roleTitle: string };

const LOADING_STEPS = ["Reading your resume…", "Detecting skills and experience…", "Matching you to roles…", "Writing feedback…"];

export default function Analyzer({ roles }: { roles: RoleOption[] }) {
  const [resume, setResume] = useState<ResumeValue>({ mode: "pdf", file: null });
  const [role, setRole] = useState(roles[0]?.id ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [step, setStep] = useState(0);

  // Cycle through progress messages while waiting (perceived performance).
  useEffect(() => {
    if (status.kind !== "loading") return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 1800);
    return () => clearInterval(id);
  }, [status.kind]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = new FormData();
    body.set("targetRole", role);
    const problem = appendResume(body, resume);
    if (problem) return setStatus({ kind: "error", message: problem });

    setStep(0);
    setStatus({ kind: "loading" });
    const res = await postForm<AnalysisResult>("/api/analyze", body);
    if (!res.ok) return setStatus({ kind: "error", message: res.message });

    const roleTitle = roles.find((r) => r.id === role)?.title ?? res.data.target.title;
    // Saved on this device only, so the jobs board and tracker can use it.
    reportsStore.add({
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      roleTitle,
      score: res.data.resumeScore.total,
      readiness: res.data.target.percent,
      result: res.data,
    });
    setStatus({ kind: "done", result: res.data, roleTitle });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (status.kind === "done") {
    return <Results result={status.result} roleTitle={status.roleTitle} onReset={() => setStatus({ kind: "idle" })} />;
  }

  const loading = status.kind === "loading";

  return (
    <form onSubmit={onSubmit} className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
      <div className="space-y-8">
        <div>
          <FieldLabel htmlFor="role">Role you want next</FieldLabel>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="field">
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden space-y-3 text-sm leading-relaxed text-muted md:block">
          <p>You will get a score out of 100 with the reason behind every point, the skills this role needs that your resume does not show, and a realistic salary path.</p>
          <p>Each report is saved on this device so the jobs board can show how well you fit each post.</p>
        </div>
      </div>

      <div className="space-y-6">
        <ResumeInput value={resume} onChange={(v) => { setResume(v); setStatus({ kind: "idle" }); }} onError={(message) => setStatus({ kind: "error", message })} />
        {status.kind === "error" && <ErrorNote>{status.message}</ErrorNote>}
        <PopButton type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span aria-live="polite">{LOADING_STEPS[step]}</span>
            </>
          ) : (
            "Score my resume"
          )}
        </PopButton>
      </div>
    </form>
  );
}
