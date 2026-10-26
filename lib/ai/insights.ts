import { z } from "zod";
import type { LlmClientOptions } from "./llmClient";
import { generateStructured } from "./structured";
import { buildInsightMessages, type InsightPromptInput } from "./prompts";

/**
 * Schema for what the LLM must return. LLM output is untrusted text: we parse
 * and validate it like any external API response. Invalid output never
 * reaches the UI.
 */
export const InsightsSchema = z.object({
  summary: z.string().min(10).max(800),
  strengths: z.array(z.string().min(3).max(300)).min(1).max(5),
  improvements: z.array(z.string().min(3).max(300)).min(1).max(6),
  bulletRewrites: z
    .array(z.object({ before: z.string().min(3).max(400), after: z.string().min(3).max(400) }))
    .max(3)
    .default([]),
  interviewQuestions: z.array(z.string().min(5).max(300)).min(1).max(6),
});

export type Insights = z.infer<typeof InsightsSchema>;

export interface InsightsResult {
  insights: Insights;
  source: "llm" | "heuristic";
  model?: string;
}

// Re-exported so existing imports keep working; the implementation lives in structured.ts.
export { extractJson } from "./structured";

/**
 * Rule-based insights used when no API key is configured or the LLM fails.
 * "Graceful degradation": the product still works, just less personalised.
 */
export function heuristicInsights(input: InsightPromptInput, weakAreas: string[]): Insights {
  const { targetRoleTitle, matchedSkills, missingSkills, yearsOfExperience } = input;
  const strengths =
    matchedSkills.length > 0
      ? [
          `Relevant skills for ${targetRoleTitle}: ${matchedSkills.slice(0, 5).join(", ")}.`,
          yearsOfExperience > 0
            ? `About ${yearsOfExperience} years of experience detected on your resume.`
            : "Early-career profile with room to grow quickly.",
        ]
      : ["Your resume is readable and was parsed successfully."];

  const improvements = [
    ...(missingSkills.length > 0
      ? [`Close the biggest skill gaps for ${targetRoleTitle}: ${missingSkills.slice(0, 3).join(", ")}.`]
      : []),
    ...weakAreas,
    "Add one portfolio project that uses the missing skills and link it on your resume.",
  ].slice(0, 5);

  const interviewQuestions = [
    ...matchedSkills.slice(0, 2).map((s) => `Walk me through a project where you used ${s}. What trade-offs did you make?`),
    ...missingSkills.slice(0, 2).map((s) => `How would you get up to speed with ${s} in your first month?`),
    `Why do you want to work as a ${targetRoleTitle}?`,
  ].slice(0, 5);

  return {
    summary: `Your profile matches ${matchedSkills.length} of the skills we look for in a ${targetRoleTitle}. ${
      missingSkills.length > 0
        ? `Focusing on ${missingSkills.slice(0, 2).join(" and ")} will raise your readiness the fastest.`
        : "You already cover the core skills for this role."
    }`,
    strengths,
    improvements,
    bulletRewrites: [],
    interviewQuestions,
  };
}

export async function generateInsights(
  input: InsightPromptInput,
  weakAreas: string[],
  llm: LlmClientOptions | null,
): Promise<InsightsResult> {
  if (llm) {
    // Validate against the schema, self-correct once, return null on failure.
    const insights = await generateStructured(InsightsSchema, buildInsightMessages(input), llm, "insights");
    if (insights) return { insights, source: "llm", model: llm.model };
  }
  return { insights: heuristicInsights(input, weakAreas), source: "heuristic" };
}
