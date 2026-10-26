/**
 * How well a candidate's skills cover a job's stack. Pure and tiny, so it runs
 * in the browser against the user's last report (resume data never leaves the device).
 */
export function stackFit(stack: string[], mySkills: Set<string>): { matched: string[]; percent: number } | null {
  if (stack.length === 0 || mySkills.size === 0) return null;
  const matched = stack.filter((s) => mySkills.has(s));
  return { matched, percent: Math.round((matched.length / stack.length) * 100) };
}
