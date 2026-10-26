/**
 * Companies whose public careers feeds we import every day.
 *
 * These are the official job-board APIs that hiring software (ATS) exposes so
 * jobs can be shown on other sites: no scraping, no login, no API key.
 *   Lever       https://api.lever.co/v0/postings/{slug}?mode=json
 *   Greenhouse  https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
 *   Ashby       https://api.ashbyhq.com/posting-api/job-board/{slug}
 *
 * Adding a company is one line (Open/Closed principle). Every slug below was
 * checked to return a live feed on 7 Oct 2026; the import report flags any
 * that later break, so they can be fixed or removed.
 */
export type Ats = "lever" | "greenhouse" | "ashby";

export interface CompanySource {
  name: string;
  ats: Ats;
  slug: string;
}

export const COMPANIES: CompanySource[] = [
  // Indian startups
  { name: "CRED", ats: "lever", slug: "cred" },
  { name: "Meesho", ats: "lever", slug: "meesho" },
  { name: "Zeta", ats: "lever", slug: "zeta" },
  { name: "Paytm", ats: "lever", slug: "paytm" },
  { name: "Mindtickle", ats: "lever", slug: "mindtickle" },
  { name: "Groww", ats: "greenhouse", slug: "groww" },
  { name: "Druva", ats: "greenhouse", slug: "druva" },
  { name: "Sarvam AI", ats: "ashby", slug: "sarvam" },
  { name: "Composio", ats: "ashby", slug: "composio" },
  // Global companies with engineering teams in India
  { name: "Rubrik", ats: "greenhouse", slug: "rubrik" },
  { name: "Databricks", ats: "greenhouse", slug: "databricks" },
  { name: "MongoDB", ats: "greenhouse", slug: "mongodb" },
  { name: "Okta", ats: "greenhouse", slug: "okta" },
  { name: "Twilio", ats: "greenhouse", slug: "twilio" },
  { name: "GitLab", ats: "greenhouse", slug: "gitlab" },
  { name: "Stripe", ats: "greenhouse", slug: "stripe" },
  { name: "Coinbase", ats: "greenhouse", slug: "coinbase" },
  { name: "Cloudflare", ats: "greenhouse", slug: "cloudflare" },
  { name: "Airbnb", ats: "greenhouse", slug: "airbnb" },
  { name: "Samsara", ats: "greenhouse", slug: "samsara" },
];

export function feedUrl({ ats, slug }: CompanySource): string {
  const s = encodeURIComponent(slug);
  switch (ats) {
    case "lever":
      return `https://api.lever.co/v0/postings/${s}?mode=json`;
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${s}`;
  }
}
