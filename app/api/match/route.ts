import { z } from "zod";
import { getConfig, llmOptions } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { RateLimiter } from "@/lib/rateLimit";
import { apiHandler, readForm } from "@/lib/http/handler";
import { resumeTextFromForm } from "@/lib/resume/fromForm";
import { analyzeMatch } from "@/lib/match/analyzeMatch";

export const runtime = "nodejs";
export const maxDuration = 60;

const limiter = new RateLimiter(getConfig().RATE_LIMIT_PER_MINUTE);

const FieldsSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(100, "Paste the full job description (at least a few lines).")
    .max(20_000, "Job description is too long."),
  jobTitle: z.string().trim().max(100).default(""),
  company: z.string().trim().max(100).default(""),
});

/**
 * POST /api/match  (multipart/form-data)
 *   jobDescription: string (required)
 *   jobTitle, company: string (optional)
 *   resume: File (PDF) | resumeText: string
 *
 * 200 -> { data: MatchResult }
 */
export const POST = apiHandler("match", limiter, async (request) => {
  const config = getConfig();
  const form = await readForm(request);

  const fields = FieldsSchema.safeParse({
    jobDescription: form.get("jobDescription") ?? "",
    jobTitle: form.get("jobTitle") ?? undefined,
    company: form.get("company") ?? undefined,
  });
  if (!fields.success) {
    throw new AppError("INVALID_INPUT", fields.error.issues[0]?.message ?? "Invalid input.");
  }

  const resumeText = await resumeTextFromForm(form, config.MAX_UPLOAD_MB);
  const data = await analyzeMatch({
    resumeText,
    jobDescription: fields.data.jobDescription,
    jobTitle: fields.data.jobTitle || "this role",
    company: fields.data.company || "your company",
    llm: llmOptions(config),
  });

  return { data, log: { score: data.match.score, source: data.meta.letterSource } };
});
