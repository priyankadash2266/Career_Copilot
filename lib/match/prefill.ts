/** Hand a job description from the jobs board to the match page (same tab, this session only). */
const KEY = "cc.match.prefill";

export interface MatchPrefill {
  jobDescription: string;
  jobTitle: string;
  company: string;
}

export function setMatchPrefill(value: MatchPrefill): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: the user can still paste the description by hand.
  }
}

export function takeMatchPrefill(): MatchPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const v = JSON.parse(raw) as Partial<MatchPrefill>;
    return typeof v.jobDescription === "string"
      ? { jobDescription: v.jobDescription, jobTitle: v.jobTitle ?? "", company: v.company ?? "" }
      : null;
  } catch {
    return null;
  }
}
