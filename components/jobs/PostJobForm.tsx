"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { postJson } from "@/lib/api/client";
import { detectStack } from "@/lib/jobs/classify";
import { FUNCTIONS, SENIORITIES, WORK_MODES, type JobView } from "@/lib/jobs/types";
import { label } from "@/lib/format";
import { Chip, ErrorNote, FieldLabel, PopButton } from "@/components/ui/kit";

const INITIAL = {
  title: "",
  company: "",
  postedBy: "",
  function: "engineering",
  seniority: "mid",
  workMode: "hybrid",
  location: "",
  description: "",
  sourceUrl: "",
};

export default function PostJobForm() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Same skill taxonomy as the server, so the preview matches what gets saved.
  const stack = useMemo(() => detectStack(`${form.title}\n${form.description}`), [form.title, form.description]);
  const set = (key: keyof typeof INITIAL) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await postJson<JobView>("/api/jobs", form);
    if (!res.ok) {
      setSubmitting(false);
      return setError(res.message);
    }
    router.push(`/jobs?focus=${res.data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="title">Job title</FieldLabel>
            <input id="title" required value={form.title} onChange={set("title")} placeholder="Founding Backend Engineer" className="field" />
          </div>
          <div>
            <FieldLabel htmlFor="company">Company</FieldLabel>
            <input id="company" required value={form.company} onChange={set("company")} placeholder="Acme" className="field" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="postedBy" hint="Optional">Your role</FieldLabel>
            <input id="postedBy" value={form.postedBy} onChange={set("postedBy")} placeholder="CTO" className="field" />
          </div>
          <div>
            <FieldLabel htmlFor="location">Location</FieldLabel>
            <input id="location" required value={form.location} onChange={set("location")} placeholder="Bengaluru, or Remote" className="field" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {(
            [
              ["function", "Function", FUNCTIONS],
              ["seniority", "Seniority", SENIORITIES],
              ["workMode", "Work mode", WORK_MODES],
            ] as const
          ).map(([key, name, options]) => (
            <div key={key}>
              <FieldLabel htmlFor={key}>{name}</FieldLabel>
              <select id={key} value={form[key]} onChange={set(key)} className="field">
                {options.map((o) => (
                  <option key={o} value={o}>
                    {label(o)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div>
          <FieldLabel htmlFor="description" hint={`${form.description.length} / 5000`}>
            The hiring post
          </FieldLabel>
          <textarea
            id="description"
            required
            rows={9}
            value={form.description}
            onChange={set("description")}
            placeholder="What will this person build, what do you use, and how should they reach you?"
            className="field leading-relaxed"
          />
        </div>
        <div>
          <FieldLabel htmlFor="sourceUrl" hint="Optional">Link to your LinkedIn or X post</FieldLabel>
          <input id="sourceUrl" type="url" value={form.sourceUrl} onChange={set("sourceUrl")} placeholder="https://www.linkedin.com/posts/…" className="field" />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <PopButton type="submit" disabled={submitting}>
          {submitting ? <Loader2 size={18} className="animate-spin" /> : null} Publish post
        </PopButton>
      </div>

      <aside className="space-y-6 md:pt-7">
        <div className="border border-line bg-surface p-6 rounded-[4px]">
          <p className="font-serif text-2xl">Stack we detected</p>
          <p className="mt-1 text-sm text-muted">Candidates filter by these. Mention tools by name in the post to add them.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {stack.length === 0 ? <span className="text-sm text-muted">Nothing yet.</span> : stack.map((s) => <Chip key={s} tone="gold">{s}</Chip>)}
          </div>
        </div>
        <div className="space-y-2 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-text">House rules</p>
          <p>Post only if you are the hiring manager or on the team. Recruiter blasts, mass-hiring drives and posts asking for fees are rejected.</p>
          <p>Posts are removed automatically after seven days.</p>
        </div>
      </aside>
    </form>
  );
}
