import { SKILLS } from "@/lib/data/skills";
import { extractSkills } from "@/lib/analysis/skills";
import { estimateYearsOfExperience } from "@/lib/analysis/experience";

/**
 * Resume <-> job description matching, the way an ATS (Applicant Tracking
 * System) roughly does it: are the JD's skills and keywords on the resume,
 * and does the experience fit? Fully deterministic, so the score is
 * explainable and testable. The LLM is only used afterwards for writing.
 */

const STOPWORDS = new Set(
  `a about above across after again against all also an and any are as at be because been before being below between both but by
  can could did do does doing during each few for from further had has have having he her here hers him his how i if in into is it
  its just me more most my no nor not now of off on once only or other our ours out over own same she should so some such than that
  the their them then there these they this those through to too under until up very was we were what when where which while who
  whom why will with would you your yours etc e.g i.e via per within across using use used must may might shall able ability
  ideal ideally candidate candidates role roles job position team teams work working works company we're you'll you're join
  looking seeking required requirements require requires preferred plus bonus nice good great strong excellent solid proven
  experience experienced years year yrs knowledge understanding familiarity familiar skills skill responsibilities responsible
  including include includes like well new across environment opportunity opportunities apply applicants benefits salary
  day days help helps make makes ensure ensuring based related relevant equivalent degree bachelor's master's least minimum
  hands-on hands fast-paced paced key part across closely others other one two three four five more best high highly
  bar set drive get got lot lots thing things way ways want wants need needs care cares love loves`
    .split(/\s+/)
    .filter(Boolean),
);

const singular = (w: string) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

// Words that already belong to a known skill are scored as skills, not as keywords.
// Stored in singular form too, because tokens() singularises ("redis" -> "redi").
const SKILL_WORDS = new Set(
  SKILLS.flatMap((s) => s.aliases.flatMap((a) => a.toLowerCase().split(/\s+/))).flatMap((w) => [w, singular(w)]),
);

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9+#-]{1,}/g) ?? []).map(singular);
}

/** Most frequent meaningful words in the JD (ties broken by first appearance). */
export function extractKeywords(jobDescription: string, limit = 15): string[] {
  const counts = new Map<string, number>();
  for (const word of tokens(jobDescription)) {
    if (word.length < 3 || STOPWORDS.has(word) || SKILL_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/** "3+ years", "2-4 years", "minimum 5 yrs" -> the lowest number mentioned, or null. */
export function requiredYears(jobDescription: string): number | null {
  const found = [...jobDescription.matchAll(/(\d{1,2})\s*\+?\s*(?:-|to|–)?\s*(?:\d{1,2}\s*)?\+?\s*(?:years|yrs)/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n <= 20);
  return found.length ? Math.min(...found) : null;
}

export interface MatchComponent {
  label: string;
  percent: number; // 0..100
  weight: number; // share of the total score, 0..1
}

export interface JobMatch {
  score: number; // 0..100
  verdict: "Strong match" | "Good match" | "Stretch";
  skills: { matched: string[]; missing: string[] };
  keywords: { matched: string[]; missing: string[] };
  experience: { required: number | null; candidate: number };
  breakdown: MatchComponent[];
}

export function matchJob(resumeText: string, jobDescription: string, now: Date = new Date()): JobMatch {
  // Skills: what the JD asks for vs. what the resume shows.
  const resumeSkills = new Set(extractSkills(resumeText).map((s) => s.name));
  const jdSkills = extractSkills(jobDescription).map((s) => s.name);
  const matchedSkills = jdSkills.filter((s) => resumeSkills.has(s));
  const missingSkills = jdSkills.filter((s) => !resumeSkills.has(s));

  // Keywords: domain words a recruiter or ATS will scan for.
  const resumeWords = new Set(tokens(resumeText));
  const keywords = extractKeywords(jobDescription);
  const matchedKeywords = keywords.filter((k) => resumeWords.has(k));
  const missingKeywords = keywords.filter((k) => !resumeWords.has(k));

  // Experience
  const required = requiredYears(jobDescription);
  const candidate = estimateYearsOfExperience(resumeText, now);
  const experienceFit = required === null ? 1 : Math.min(1, candidate / required);

  const pct = (part: number, whole: number) => (whole === 0 ? 100 : Math.round((part / whole) * 100));
  const breakdown: MatchComponent[] =
    jdSkills.length > 0
      ? [
          { label: "Skills", percent: pct(matchedSkills.length, jdSkills.length), weight: 0.6 },
          { label: "Keywords", percent: pct(matchedKeywords.length, keywords.length), weight: 0.25 },
          { label: "Experience", percent: Math.round(experienceFit * 100), weight: 0.15 },
        ]
      : [
          { label: "Keywords", percent: pct(matchedKeywords.length, keywords.length), weight: 0.75 },
          { label: "Experience", percent: Math.round(experienceFit * 100), weight: 0.25 },
        ];

  const score = Math.round(breakdown.reduce((sum, c) => sum + c.percent * c.weight, 0));
  const verdict = score >= 75 ? "Strong match" : score >= 55 ? "Good match" : "Stretch";

  return {
    score,
    verdict,
    skills: { matched: matchedSkills, missing: missingSkills },
    keywords: { matched: matchedKeywords, missing: missingKeywords },
    experience: { required, candidate },
    breakdown,
  };
}
