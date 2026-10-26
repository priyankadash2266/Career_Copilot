"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const MAX_MB = 5;
export const MIN_TEXT_CHARS = 200;

export type ResumeValue = { mode: "pdf"; file: File | null } | { mode: "text"; text: string };

/**
 * Put the resume into a FormData, or return a user-facing error.
 * Client-side checks give instant feedback; the server re-validates
 * everything because the client can never be trusted.
 */
export function appendResume(form: FormData, value: ResumeValue): string | null {
  if (value.mode === "pdf") {
    if (!value.file) return "Choose your resume PDF first.";
    form.set("resume", value.file);
  } else {
    if (value.text.trim().length < MIN_TEXT_CHARS) return "Paste your full resume (at least a few lines).";
    form.set("resumeText", value.text);
  }
  return null;
}

/** Controlled component: the parent owns the value, this only renders and reports changes. */
export default function ResumeInput({
  value,
  onChange,
  onError,
}: {
  value: ResumeValue;
  onChange: (value: ResumeValue) => void;
  onError: (message: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(candidate: File | undefined) {
    if (!candidate) return;
    if (candidate.type !== "application/pdf" && !candidate.name.toLowerCase().endsWith(".pdf")) {
      return onError("Choose a PDF file, or switch to Paste text.");
    }
    if (candidate.size > MAX_MB * 1024 * 1024) {
      return onError(`Choose a PDF smaller than ${MAX_MB} MB.`);
    }
    onChange({ mode: "pdf", file: candidate });
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <div className="mb-3 flex gap-6 text-sm" role="tablist" aria-label="Resume input">
        {(["pdf", "text"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={value.mode === m}
            onClick={() => onChange(m === "pdf" ? { mode: "pdf", file: null } : { mode: "text", text: "" })}
            className={cn(
              "border-b-2 pb-1.5 font-semibold transition-colors",
              value.mode === m ? "border-gold text-text" : "border-transparent text-muted hover:text-text",
            )}
          >
            {m === "pdf" ? "Upload PDF" : "Paste text"}
          </button>
        ))}
      </div>

      {value.mode === "pdf" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-[4px] border border-dashed p-10 text-center transition-colors",
            dragging ? "border-gold bg-gold/5" : "border-line-strong bg-surface",
          )}
        >
          <input
            ref={inputRef}
            id="resume"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {value.file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="text-gold" size={20} />
              <span className="font-semibold">{value.file.name}</span>
              <span className="text-sm text-muted">{(value.file.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => onChange({ mode: "pdf", file: null })}
                className="p-1 text-muted hover:text-text"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <UploadCloud className="mx-auto mb-4 text-gold" size={36} strokeWidth={1.5} />
              <p className="font-serif text-2xl">Drop your resume here</p>
              <p className="mt-1 text-sm text-muted">PDF, up to {MAX_MB} MB. Read in memory, never stored.</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-6 border border-line-strong px-5 py-2.5 text-sm font-semibold hover:border-text"
              >
                Choose file
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <label htmlFor="resumeText" className="sr-only">
            Resume text
          </label>
          <textarea
            id="resumeText"
            value={value.text}
            onChange={(e) => onChange({ mode: "text", text: e.target.value })}
            rows={12}
            placeholder="Paste the full text of your resume…"
            className="field text-sm leading-relaxed"
          />
        </>
      )}
    </div>
  );
}
