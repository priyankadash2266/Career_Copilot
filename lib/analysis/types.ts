import type { ExtractedSkill } from "./skills";
import type { ResumeScore, RoleReadiness } from "./scoring";
import type { CareerGps, RoadmapStage, SalaryPoint } from "./career";
import type { Insights } from "@/lib/ai/insights";

/**
 * The API contract between backend and frontend. Both sides import this one
 * type, so a breaking change is caught by the TypeScript compiler.
 */
export interface AnalysisResult {
  meta: {
    analyzedAt: string;
    insightsSource: "llm" | "heuristic";
    model?: string;
    promptVersion: string;
    cached: boolean;
    durationMs: number;
  };
  profile: {
    yearsOfExperience: number;
    wordCount: number;
    skills: ExtractedSkill[];
  };
  resumeScore: ResumeScore;
  target: RoleReadiness;
  roleMatches: (Pick<RoleReadiness, "roleId" | "title" | "percent"> & { jobSearchUrl: string })[];
  salary: SalaryPoint[];
  roadmap: RoadmapStage[];
  gps: CareerGps;
  insights: Insights;
}

export interface AnalyzeResponse {
  data: AnalysisResult;
}
