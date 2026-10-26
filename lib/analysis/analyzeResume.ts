import { createHash } from "node:crypto";
import { getRole } from "@/lib/data/roles";
import { AppError } from "@/lib/errors";
import { TtlLruCache } from "@/lib/cache";
import { generateInsights } from "@/lib/ai/insights";
import { PROMPT_VERSION } from "@/lib/ai/prompts";
import type { LlmClientOptions } from "@/lib/ai/llmClient";
import { extractSkills } from "./skills";
import { estimateYearsOfExperience } from "./experience";
import { computeReadiness, rankRoles, scoreResume } from "./scoring";
import { buildRoadmap, careerGps, forecastSalary } from "./career";
import type { AnalysisResult } from "./types";

// 100 most recent analyses, kept for 1 hour.
const cache = new TtlLruCache<AnalysisResult>(100, 60 * 60 * 1000);

export function jobSearchUrl(title: string): string {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}&location=India`;
}

/**
 * The orchestrator ("service layer"). It knows the ORDER of steps but each
 * step lives in its own small module (Single Responsibility). The route
 * handler only deals with HTTP; this function only deals with the domain.
 * That separation lets us unit test it without a web server.
 */
export async function analyzeResume(params: {
  resumeText: string;
  targetRoleId: string;
  llm: LlmClientOptions | null;
}): Promise<AnalysisResult> {
  const started = Date.now();
  const { resumeText, targetRoleId, llm } = params;

  const targetRole = getRole(targetRoleId);
  if (!targetRole) throw new AppError("INVALID_INPUT", "Unknown target role.");

  // Same resume + same role + same prompt version + same model => same answer.
  const cacheKey = createHash("sha256")
    .update([resumeText, targetRoleId, PROMPT_VERSION, llm?.model ?? "heuristic"].join("\u0000"))
    .digest("hex");
  const hit = cache.get(cacheKey);
  if (hit) {
    return { ...hit, meta: { ...hit.meta, cached: true, durationMs: Date.now() - started } };
  }

  // 1. Deterministic extraction
  const skills = extractSkills(resumeText);
  const years = estimateYearsOfExperience(resumeText);
  const score = scoreResume(resumeText, skills);

  // 2. Matching
  const ranked = rankRoles(skills);
  const target = computeReadiness(targetRole, skills);
  const best = ranked[0];
  const currentRole = getRole(best.roleId) ?? targetRole;

  // 3. Projections
  const salary = forecastSalary({
    currentRole,
    currentReadiness: best.percent / 100,
    targetRole,
    targetReadiness: target.percent / 100,
    years,
  });
  const currentTitle = years < 1 && best.percent < 40 ? "Aspiring " + targetRole.title : best.title;
  const roadmap = buildRoadmap({ currentTitle, target, targetRole, salary });
  const gps = careerGps({ from: currentTitle, target, resumeScore: score.total });

  // 4. Generative insights (LLM, with heuristic fallback)
  const weakAreas = score.breakdown
    .filter((c) => c.score / c.max < 0.6)
    .map((c) => c.tip);
  const { insights, source, model } = await generateInsights(
    {
      resumeText,
      targetRoleTitle: targetRole.title,
      yearsOfExperience: years,
      matchedSkills: target.matched,
      missingSkills: target.missing.map((m) => m.name),
    },
    weakAreas,
    llm,
  );

  const result: AnalysisResult = {
    meta: {
      analyzedAt: new Date().toISOString(),
      insightsSource: source,
      model,
      promptVersion: PROMPT_VERSION,
      cached: false,
      durationMs: Date.now() - started,
    },
    profile: { yearsOfExperience: years, wordCount: resumeText.split(/\s+/).filter(Boolean).length, skills },
    resumeScore: score,
    target,
    roleMatches: ranked.slice(0, 4).map((r) => ({
      roleId: r.roleId,
      title: r.title,
      percent: r.percent,
      jobSearchUrl: jobSearchUrl(r.title),
    })),
    salary,
    roadmap,
    gps,
    insights,
  };

  // Only cache real LLM answers; heuristic results are cheap to recompute, and
  // caching a fallback would hide a recovered provider for an hour.
  if (source === "llm") cache.set(cacheKey, result);
  return result;
}
