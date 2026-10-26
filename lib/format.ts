/** Small, pure formatting helpers shared by the UI. */

export const lpa = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(1)} LPA`;

/** Score colour scale used everywhere, so 70 always "looks" the same. */
export function scoreTone(n: number): "good" | "mid" | "bad" {
  return n >= 75 ? "good" : n >= 50 ? "mid" : "bad";
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function timeLeft(iso: string, now: Date = new Date()): string {
  const hours = Math.max(0, Math.round((new Date(iso).getTime() - now.getTime()) / 3_600_000));
  return hours < 24 ? `${hours}h left` : `${Math.round(hours / 24)}d left`;
}

export const LABELS: Record<string, string> = {
  engineering: "Engineering",
  product: "Product",
  design: "Design",
  data: "Data",
  "ai-ml": "AI / ML",
  devops: "DevOps",
  other: "Other",
  intern: "Intern",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  staff: "Staff+",
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  careers: "Careers page",
  linkedin: "LinkedIn",
  x: "X",
};

export const label = (key: string) => LABELS[key] ?? key;
