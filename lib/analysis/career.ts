import type { ExperienceLevel, RoleDefinition } from "@/lib/data/roles";
import type { RoleReadiness } from "./scoring";

/**
 * Career projections: salary forecast, "Future You" roadmap and Career GPS.
 * All pure functions — same input, same output — so they are trivially testable.
 * The numbers are heuristics on top of curated bands and are labelled as
 * estimates in the UI.
 */

export function levelFor(years: number): ExperienceLevel {
  if (years < 2) return "entry";
  if (years < 5) return "mid";
  return "senior";
}

const roundHalf = (n: number) => Math.round(n * 2) / 2;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const LEVEL_SPAN: Record<ExperienceLevel, [start: number, length: number]> = {
  entry: [0, 2],
  mid: [2, 3],
  senior: [5, 7],
};

/**
 * Position inside a salary band is half skill (readiness) and half tenure
 * inside the level: someone with 5.2 years sits near the bottom of the
 * "senior" band, someone with 11 years near the top.
 */
export function salaryInBand(role: RoleDefinition, years: number, readiness: number): number {
  const level = levelFor(years);
  const [min, max] = role.salary[level];
  const [start, length] = LEVEL_SPAN[level];
  const tenure = clamp01((years - start) / length);
  const position = (0.5 * clamp01(readiness) + 0.5 * tenure) * 0.85;
  return roundHalf(min + (max - min) * position);
}

export interface SalaryPoint {
  label: string;
  months: number;
  lpa: number;
}

/**
 * Forecast assumes the user follows the roadmap: readiness for the target
 * role rises over time and experience accumulates. The series is forced to be
 * non-decreasing so the chart never shows an unexplained dip.
 */
export function forecastSalary(params: {
  currentRole: RoleDefinition;
  currentReadiness: number; // 0..1
  targetRole: RoleDefinition;
  targetReadiness: number; // 0..1
  years: number;
}): SalaryPoint[] {
  const { currentRole, currentReadiness, targetRole, targetReadiness, years } = params;
  const raw: SalaryPoint[] = [
    { label: "Today", months: 0, lpa: salaryInBand(currentRole, years, currentReadiness) },
    { label: "6 Months", months: 6, lpa: salaryInBand(targetRole, years + 0.5, targetReadiness + 0.25) },
    { label: "12 Months", months: 12, lpa: salaryInBand(targetRole, years + 1, targetReadiness + 0.45) },
    { label: "24 Months", months: 24, lpa: salaryInBand(targetRole, years + 2, 0.95) },
  ];
  let floor = 0;
  return raw.map((p) => {
    floor = Math.max(floor, p.lpa);
    return { ...p, lpa: floor };
  });
}

export interface RoadmapStage {
  label: string;
  role: string;
  lpa: number;
  learn: string[];
}

export function buildRoadmap(params: {
  currentTitle: string;
  target: RoleReadiness;
  targetRole: RoleDefinition;
  salary: SalaryPoint[];
}): RoadmapStage[] {
  const { currentTitle, target, targetRole, salary } = params;
  const missing = target.missing.map((m) => m.name);
  return [
    { label: "Current", role: currentTitle, lpa: salary[0].lpa, learn: [] },
    { label: "6 Months", role: targetRole.title, lpa: salary[1].lpa, learn: missing.slice(0, 3) },
    { label: "12 Months", role: targetRole.nextRole, lpa: salary[2].lpa, learn: missing.slice(3, 6) },
  ];
}

export interface CareerGps {
  from: string;
  to: string;
  progress: number; // 0..100
  missingSkills: string[];
  estimatedMonths: number;
  successProbability: number; // 0..100
}

/**
 * Time to job-ready = study weeks for the missing core/important skills,
 * assuming ~10 hours/week of part-time learning. Success probability is a
 * simple, monotonic heuristic of readiness and resume quality.
 */
export function careerGps(params: {
  from: string;
  target: RoleReadiness;
  resumeScore: number; // 0..100
}): CareerGps {
  const { from, target, resumeScore } = params;
  const important = target.missing.filter((m) => m.weight >= 2);
  const weeks = important.reduce((sum, m) => sum + m.learnWeeks, 0);
  const estimatedMonths = important.length === 0 ? 0 : Math.max(1, Math.min(24, Math.ceil(weeks / 4)));
  const probability = 15 + 0.6 * target.percent + 0.2 * resumeScore;

  return {
    from,
    to: target.title,
    progress: target.percent,
    missingSkills: target.missing.map((m) => m.name),
    estimatedMonths,
    successProbability: Math.round(Math.min(95, Math.max(5, probability))),
  };
}
