import { z } from "zod";
import { getConfig, llmOptions } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { RateLimiter } from "@/lib/rateLimit";
import { apiHandler, firstIssue, readForm } from "@/lib/http/handler";
import { resumeTextFromForm } from "@/lib/resume/fromForm";
import { analyzeResume } from "@/lib/analysis/analyzeResume";
import type { AnalysisResult } from "@/lib/analysis/types";

// PDF parsing needs Node APIs; give slow LLM calls room to finish.
export const runtime = "nodejs";
export const maxDuration = 60;

const limiter = new RateLimiter(getConfig().RATE_LIMIT_PER_MINUTE);

const FieldsSchema = z.object({
  targetRole: z.string().min(1, "Please choose a target role.").max(64),
});

/**
 * POST /api/analyze  (multipart/form-data)
 *   targetRole: string           required, e.g. "backend-engineer"
 *   resume:     File (PDF)       one of resume / resumeText is required
 *   resumeText: string
 *
 * 200 -> { data: AnalysisResult }
 * 4xx/5xx -> { error: { code, message, requestId } }
 *
 * The handler is deliberately thin: validate input, call the service.
 * Errors, logging and rate limiting come from apiHandler.
 */
export const POST = apiHandler<AnalysisResult>("analyze", limiter, async (request) => {
  const config = getConfig();
  const form = await readForm(request);

  const fields = FieldsSchema.safeParse({ targetRole: form.get("targetRole") ?? "" });
  if (!fields.success) throw new AppError("INVALID_INPUT", firstIssue(fields.error));

  const resumeText = await resumeTextFromForm(form, config.MAX_UPLOAD_MB);
  const data = await analyzeResume({ resumeText, targetRoleId: fields.data.targetRole, llm: llmOptions(config) });

  return {
    data,
    log: { source: data.meta.insightsSource, cached: data.meta.cached, chars: resumeText.length },
  };
});
