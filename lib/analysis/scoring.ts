import { getSkill } from "@/lib/data/skills";
import { ROLES, type RoleDefinition } from "@/lib/data/roles";
import type { ExtractedSkill } from "./skills";

/* ------------------------------------------------------------------ */
/* Resume quality score                                                */
/* ------------------------------------------------------------------ */

export interface ScoreComponent {
  label: string;
  score: number;
  max: number;
  tip: string;
}

export interface ResumeScore {
  total: number; // 0..100
  breakdown: ScoreComponent[];
}

const SECTION_PATTERNS: Record<string, RegExp> = {
  Experience: /\b(experience|employment|internship)\b/i,
  Education: /\b(education|b\.?\s?tech|b\.?e\.?|bachelor|master|degree|university|college)\b/i,
  Projects: /\bprojects?\b/i,
  Skills: /\b(skills|technologies|tech stack)\b/i,
};

const ACTION_VERBS =
  /\b(built|led|designed|developed|implemented|launched|improved|reduced|increased|optimi[sz]ed|automated|architected|created|delivered|migrated|scaled|owned|mentored|shipped|deployed|analy[sz]ed)\b/gi;

// A line "has impact" when it contains a number tied to a result: 30%, 2x, ₹5L, 10k users, 200ms...
const QUANTIFIED = /(\d+(\.\d+)?\s?(%|x\b|k\b|m\b|ms\b|users|customers|clients|hours|crore|lakh|lpa))|([₹$]\s?\d)/i;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function component(label: string, ratio: number, max: number, tip: string): ScoreComponent {
  return { label, score: Math.round(clamp(ratio, 0, 1) * max), max, tip };
}

/**
 * Transparent, rule-based resume score. Every point can be explained to the
 * user ("explainability"), which builds trust and is easy to unit test.
 */
export function scoreResume(text: string, skills: ExtractedSkill[]): ResumeScore {
  const words = text.split(/\s+/).filter(Boolean).length;
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const sectionsFound = Object.values(SECTION_PATTERNS).filter((re) => re.test(text)).length;
  const quantifiedLines = lines.filter((l) => QUANTIFIED.test(l)).length;
  const actionVerbs = new Set((text.match(ACTION_VERBS) ?? []).map((v) => v.toLowerCase())).size;
  const contact =
    Number(/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) +
    Number(/(\+?\d[\d\s-]{8,}\d)/.test(text)) +
    Number(/(linkedin\.com|github\.com)/i.test(text));

  // Ideal length 350–900 words; linearly penalise outside that range.
  const lengthRatio = words < 350 ? words / 350 : words > 900 ? clamp(1 - (words - 900) / 900, 0, 1) : 1;

  const breakdown = [
    component("Skills coverage", skills.length / 12, 25, "List the tools and technologies you actually used, in a dedicated Skills section."),
    component("Quantified impact", quantifiedLines / 5, 20, "Add numbers to bullets: % improvement, users served, time or money saved."),
    component("Section structure", sectionsFound / 4, 20, "Include clear Experience, Projects, Education and Skills sections."),
    component("Action verbs", actionVerbs / 8, 15, "Start bullets with strong verbs like Built, Led, Reduced, Automated."),
    component("Contact details", contact / 3, 10, "Add email, phone and a LinkedIn or GitHub link."),
    component("Length", lengthRatio, 10, "Aim for one page (roughly 350–900 words)."),
  ];

  return { total: breakdown.reduce((sum, c) => sum + c.score, 0), breakdown };
}

/* ------------------------------------------------------------------ */
/* Role readiness                                                      */
/* ------------------------------------------------------------------ */

export interface MissingSkill {
  name: string;
  weight: number;
  learnWeeks: number;
}

export interface RoleReadiness {
  roleId: string;
  title: string;
  percent: number; // 0..100
  matched: string[];
  missing: MissingSkill[]; // most important first
}

/**
 * Weighted coverage: core skills (weight 3) matter three times more than
 * nice-to-haves (weight 1). Formula: sum(weights matched) / sum(all weights).
 *
 * Guard rail: if the candidate has fewer than half of the CORE skills, the
 * score is capped at 40%. Otherwise a backend developer would look "70% ready"
 * for Mobile Developer just from Git + REST + Java, without any mobile skill.
 */
export const CORE_GAP_CAP = 40;

export function computeReadiness(role: RoleDefinition, skills: ExtractedSkill[]): RoleReadiness {
  const have = new Set(skills.map((s) => s.name));
  let total = 0;
  let earned = 0;
  let coreTotal = 0;
  let coreMatched = 0;
  const matched: string[] = [];
  const missing: MissingSkill[] = [];

  for (const req of role.skills) {
    total += req.weight;
    if (req.weight === 3) coreTotal += 1;
    const options = [req.name, ...(req.anyOf ?? [])];
    const hit = options.find((o) => have.has(o));
    if (hit) {
      earned += req.weight;
      if (req.weight === 3) coreMatched += 1;
      matched.push(hit);
    } else {
      missing.push({ name: req.name, weight: req.weight, learnWeeks: getSkill(req.name)?.learnWeeks ?? 3 });
    }
  }

  missing.sort((a, b) => b.weight - a.weight || a.learnWeeks - b.learnWeeks);

  let percent = total === 0 ? 0 : Math.round((earned / total) * 100);
  if (coreTotal > 0 && coreMatched / coreTotal < 0.5) percent = Math.min(percent, CORE_GAP_CAP);

  return {
    roleId: role.id,
    title: role.title,
    percent,
    matched,
    missing,
  };
}

export function rankRoles(skills: ExtractedSkill[]): RoleReadiness[] {
  return ROLES.map((role) => computeReadiness(role, skills)).sort((a, b) => b.percent - a.percent);
}
