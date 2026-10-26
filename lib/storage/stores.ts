import { z } from "zod";
import type { AnalysisResult } from "@/lib/analysis/types";
import { createLocalStore } from "./localStore";

/* ---------------- Saved resume reports ---------------- */

export const SavedReportSchema = z.object({
  id: z.string(),
  savedAt: z.string(),
  roleTitle: z.string(),
  score: z.number(),
  readiness: z.number(),
  // The full result is our own API output; a light shape check is enough.
  result: z.custom<AnalysisResult>((v) => typeof v === "object" && v !== null && "resumeScore" in v && "insights" in v),
});
export type SavedReport = z.infer<typeof SavedReportSchema>;

export const reportsStore = createLocalStore({ key: "cc.reports.v1", schema: SavedReportSchema, maxItems: 10 });

/* ---------------- Job application tracker ---------------- */

export const APPLICATION_STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const ApplicationSchema = z.object({
  id: z.string(),
  company: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  status: z.enum(APPLICATION_STATUSES),
  link: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  matchScore: z.number().min(0).max(100).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Application = z.infer<typeof ApplicationSchema>;

export const applicationsStore = createLocalStore({ key: "cc.applications.v1", schema: ApplicationSchema, maxItems: 200 });

export function newApplication(fields: Pick<Application, "company" | "role"> & Partial<Application>): Application {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), status: "saved", createdAt: now, updatedAt: now, ...fields };
}
