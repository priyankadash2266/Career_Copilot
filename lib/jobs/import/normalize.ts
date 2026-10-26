import type { JobFunction, Seniority, WorkMode } from "../types";

/**
 * Turning messy third-party job data into our clean model. Each rule is a
 * small pure function so it can be unit tested on real-world titles.
 */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: "–", mdash: "—", hellip: "…", bull: "•" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** HTML -> readable plain text, keeping paragraph and list structure. Handles HTML that is itself entity-escaped (Greenhouse). */
export function htmlToText(html: string): string {
  let s = html.includes("&lt;") ? decodeEntities(html) : html;
  s = s
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\/\s*(p|div|h[1-6]|ul|ol|tr)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(s)
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastBreak = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(". "));
  return `${cut.slice(0, lastBreak > max * 0.6 ? lastBreak + 1 : max).trim()}…`;
}

/** Lever sometimes sends titles in all lower case: "accounts payable manager". */
export function tidyTitle(title: string): string {
  const t = title.replace(/\s+/g, " ").trim();
  if (t !== t.toLowerCase()) return t;
  return t.replace(/\b([a-z])([a-z]*)/g, (_, a: string, b: string) => a.toUpperCase() + b);
}

const INDIA = /\b(india|bengaluru|bangalore|mumbai|pune|hyderabad|chennai|gurugram|gurgaon|noida|new delhi|delhi|ncr|kolkata|ahmedabad|jaipur|kochi|coimbatore|chandigarh|indore|thiruvananthapuram|trivandrum|mysuru|mysore)\b/i;

export function isIndia(locations: string[], countryCode?: string): boolean {
  return countryCode?.toUpperCase() === "IN" || locations.some((l) => INDIA.test(l));
}

/**
 * Role family from the title (and department when the feed has one). Order
 * matters: "Product Designer" is design, not product; "Data Scientist" is
 * AI/ML, not data. Customer-facing "engineers" (sales, solutions, support)
 * are not engineering roles, so they fall through to "other".
 */
export function classifyFunction(title: string, department = ""): JobFunction {
  const t = title.toLowerCase();
  const all = `${t} ${department.toLowerCase()}`;
  if (/\b(sales|solutions?|support|customer|success|account|partner|pre-?sales|recruit|talent|marketing|legal|finance|payable|audit|hr|equity|credit|risk|compliance|operations|content|business|procurement|treasury|tax|controller\w*|counsel|policy|communications|writer|editor|facilities)\b/.test(t)) return "other";
  if (/\b(machine learning|ml|ai|artificial intelligence|data scien\w*|deep learning|nlp|llms?|applied scien\w*|research scien\w*|computer vision|genai)\b/.test(t)) return "ai-ml";
  if (/\b(data (analyst|engineer\w*|platform|warehouse)|analytics|business intelligence|bi analyst|analyst)\b/.test(t)) return "data";
  if (/\b(designer|ux|ui\/ux|ui|design lead|head of design)\b/.test(t)) return "design";
  if (/\b(product manager|product owner|product lead|head of product|apm|group product|director,? product|product management)\b/.test(t)) return "product";
  if (/\b(devops|sre|site reliability|platform engineer\w*|infrastructure|cloud engineer|security engineer|network engineer|devsecops|reliability)\b/.test(t)) return "devops";
  if (/\b(engineer\w*|developer|sde|software|architect|tech lead|qa|sdet|test|frontend|front-end|backend|back-end|full ?stack|ios|android|mobile|programmer)\b/.test(t)) return "engineering";
  if (/\b(engineering|technology|r&d|product development)\b/.test(all)) return "engineering";
  return "other";
}

export function classifySeniority(title: string): Seniority {
  const t = title.toLowerCase();
  if (/\b(intern|internship|trainee|apprentice)\b/.test(t)) return "intern";
  if (/\b(staff|principal|distinguished|director|head of|vp|vice president|chief|architect|fellow)\b/.test(t)) return "staff";
  const seniorWords = /\b(senior|sr\.?|lead|iii|iv)\b/.test(t);
  // "Associate Product Manager" is entry level even though it says "Manager".
  if (!seniorWords && (/\b(junior|jr\.?|associate|entry|graduate|fresher|new grad)\b/.test(t) || /\b(engineer|developer|sde)[ -]?(i|1)\b/.test(t))) return "junior";
  if (seniorWords || /\bmanager\b/.test(t)) return "senior";
  return "mid";
}

export function classifyWorkMode(locations: string[], hint?: string | null): WorkMode {
  const h = (hint ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (h === "remote") return "remote";
  if (h === "hybrid") return "hybrid";
  if (h === "onsite") return "onsite";
  const text = locations.join(" ").toLowerCase();
  if (/\bremote\b/.test(text)) return "remote";
  if (/\bhybrid\b/.test(text)) return "hybrid";
  return "onsite";
}
