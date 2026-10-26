import type { LlmClientOptions } from "@/lib/ai/llmClient";
import { COVER_LETTER_PROMPT_VERSION, generateCoverLetter, type CoverLetter } from "@/lib/ai/coverLetter";
import { matchJob, type JobMatch } from "./jobMatch";

export interface MatchResult {
  meta: {
    analyzedAt: string;
    letterSource: "llm" | "heuristic";
    model?: string;
    promptVersion: string;
    durationMs: number;
  };
  jobTitle: string;
  company: string;
  match: JobMatch;
  coverLetter: CoverLetter["coverLetter"];
  tailoringTips: CoverLetter["tailoringTips"];
}

export interface MatchResponse {
  data: MatchResult;
}

/** Service layer for /api/match: deterministic match first, then the LLM writes. */
export async function analyzeMatch(params: {
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  company: string;
  llm: LlmClientOptions | null;
}): Promise<MatchResult> {
  const started = Date.now();
  const match = matchJob(params.resumeText, params.jobDescription);
  const { letter, source, model } = await generateCoverLetter({ ...params, match }, params.llm);

  return {
    meta: {
      analyzedAt: new Date().toISOString(),
      letterSource: source,
      model,
      promptVersion: COVER_LETTER_PROMPT_VERSION,
      durationMs: Date.now() - started,
    },
    jobTitle: params.jobTitle,
    company: params.company,
    match,
    coverLetter: letter.coverLetter,
    tailoringTips: letter.tailoringTips,
  };
}
