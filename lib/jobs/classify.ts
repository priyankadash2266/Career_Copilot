import { extractSkills } from "@/lib/analysis/skills";
import type { JobSource } from "./types";

/**
 * Deterministic enrichment of a hiring post. No LLM needed: cheap, instant,
 * testable, and the same skill taxonomy as the resume analyser, so a job's
 * stack and a candidate's skills are directly comparable.
 */

export function detectSource(url: string): JobSource {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
    if (host === "x.com" || host === "twitter.com") return "x";
  } catch {
    // Empty or invalid URL: fall through.
  }
  return "other";
}

export function detectStack(text: string): string[] {
  return extractSkills(text).map((s) => s.name);
}

/**
 * The board is for posts from real hiring managers. These phrases are typical
 * of recruiter blasts and mass-hiring spam. Two or more signals => rejected.
 * Explainable rules beat a black box here: we can tell the poster exactly why.
 */
const SPAM_SIGNALS: [RegExp, string][] = [
  [/\b(mass|bulk) hiring\b/i, "mass hiring"],
  [/\bmultiple (openings|positions|requirements)\b/i, "multiple openings"],
  [/\bwalk-?in\b/i, "walk-in drive"],
  [/\b(share|send|forward) (your )?(cv|resume|profile)s? (to|at|on)\b/i, "send-your-CV request"],
  [/\b(urgent(ly)?|immediate) (hiring|requirement|joiners?)\b/i, "urgent hiring"],
  [/\bon behalf of (our|a|my) client\b/i, "recruiting for a client"],
  [/\b(registration|processing) fee\b/i, "asks for a fee"],
  [/\b(whats ?app|telegram)\b.*\d{5,}/i, "chat-app phone number"],
];

export function spamSignals(text: string): string[] {
  return SPAM_SIGNALS.filter(([re]) => re.test(text)).map(([, label]) => label);
}

export const SPAM_THRESHOLD = 2;
