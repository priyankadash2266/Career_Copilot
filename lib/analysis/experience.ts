/**
 * Estimate total years of professional experience from resume text.
 *
 * Strategy (cheap and explainable):
 *  1. Find date ranges like "Jan 2021 – Present" or "2019 - 2022".
 *  2. Merge overlapping ranges (two parallel jobs should not double count).
 *  3. If the candidate explicitly writes "3+ years of experience", take the
 *     larger of the two estimates.
 */

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\\.?";
const YEAR = "((?:19|20)\\d{2})";
const RANGE_REGEX = new RegExp(
  `(?:${MONTH}\\s*,?\\s*)?${YEAR}\\s*(?:-|–|—|to|till|until)\\s*(?:(?:${MONTH}\\s*,?\\s*)?${YEAR}|(present|current|now|today|ongoing|date))`,
  "gi",
);
const EXPLICIT_REGEX = /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years|yrs)/gi;

type Interval = [start: number, end: number]; // months since year 0

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push([current[0], current[1]]);
    }
  }
  return merged;
}

const EXPERIENCE_HEADING = /\b(work experience|professional experience|employment history|experience|internships?)\b/i;
const OTHER_HEADING = /\n\s*(education|academic|projects|skills|technical skills|certifications?|achievements|awards)\b/i;

/**
 * Return only the experience section when we can find one, so that
 * "B.Tech 2018 - 2022" under Education is not counted as work experience.
 * Falls back to the full text when no heading is detected.
 */
export function experienceSection(text: string): string {
  const start = text.search(EXPERIENCE_HEADING);
  if (start === -1) return text;
  const rest = text.slice(start);
  const end = rest.slice(1).search(OTHER_HEADING);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

export function estimateYearsOfExperience(text: string, now: Date = new Date()): number {
  const nowMonths = now.getFullYear() * 12 + now.getMonth();
  const intervals: Interval[] = [];

  for (const match of experienceSection(text).matchAll(RANGE_REGEX)) {
    const [, startMonth, startYear, endMonth, endYear, present] = match;
    const start = Number(startYear) * 12 + (startMonth ? MONTHS[startMonth.toLowerCase().slice(0, 3)] ?? 0 : 0);
    const end = present
      ? nowMonths
      : Number(endYear) * 12 + (endMonth ? MONTHS[endMonth.toLowerCase().slice(0, 3)] ?? 11 : 11);
    // Ignore nonsense such as end-before-start or ranges starting in the future.
    if (end > start && start <= nowMonths) {
      intervals.push([start, Math.min(end, nowMonths)]);
    }
  }

  const fromRanges = mergeIntervals(intervals).reduce((sum, [s, e]) => sum + (e - s), 0) / 12;

  let explicit = 0;
  for (const match of text.matchAll(EXPLICIT_REGEX)) {
    const value = Number(match[1]);
    if (value <= 40) explicit = Math.max(explicit, value);
  }

  const years = Math.max(fromRanges, explicit);
  return Math.round(Math.min(years, 40) * 10) / 10;
}
