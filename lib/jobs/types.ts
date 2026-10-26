import { z } from "zod";

/**
 * Jobs board domain model.
 *
 * Two kinds of post live on the board:
 *  - "community": written by a hiring manager on our site (expires after 7 days)
 *  - "imported":  pulled daily from a company's public careers feed
 *                 (Lever / Greenhouse / Ashby). It stays live while it is still
 *                 in that feed, and disappears a few days after it is removed.
 */

export const FUNCTIONS = ["engineering", "product", "design", "data", "ai-ml", "devops", "other"] as const;
export const SENIORITIES = ["intern", "junior", "mid", "senior", "staff"] as const;
export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
export const SOURCES = ["careers", "linkedin", "x", "other"] as const;
export const KINDS = ["community", "imported"] as const;
export const SORTS = ["hot", "new", "top"] as const;

export type JobFunction = (typeof FUNCTIONS)[number];
export type Seniority = (typeof SENIORITIES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type JobSource = (typeof SOURCES)[number];
export type JobKind = (typeof KINDS)[number];
export type JobSort = (typeof SORTS)[number];

/** Community posts live for 7 days. */
export const POST_TTL_DAYS = 7;
/** Imported posts stay up while the company still lists them, plus this grace period. */
export const IMPORT_GRACE_DAYS = 3;

/** What a user submits on /jobs/new. Validated at the API boundary. */
export const NewJobSchema = z.object({
  title: z.string().trim().min(3, "Add a job title.").max(100),
  company: z.string().trim().min(1, "Add the company name.").max(80),
  postedBy: z.string().trim().max(80).optional().default(""),
  function: z.enum(FUNCTIONS),
  seniority: z.enum(SENIORITIES),
  workMode: z.enum(WORK_MODES),
  location: z.string().trim().min(2, "Add a location, or write Remote.").max(80),
  description: z
    .string()
    .trim()
    .min(80, "Paste the hiring post (at least a couple of sentences).")
    .max(5000, "Hiring post is too long."),
  sourceUrl: z.union([z.literal(""), z.url("Link must be a valid URL.").max(500)]).optional().default(""),
});
export type NewJobInput = z.input<typeof NewJobSchema>;

/**
 * What we store. Looser than NewJobSchema on purpose: imported posts come
 * from companies, not our form, so their titles or descriptions can be
 * shorter or longer than what we ask users for.
 */
export const JobSchema = z.object({
  id: z.string(),
  kind: z.enum(KINDS).default("community"),
  title: z.string().max(200),
  company: z.string().max(120),
  postedBy: z.string().max(120).default(""),
  function: z.enum(FUNCTIONS),
  seniority: z.enum(SENIORITIES),
  workMode: z.enum(WORK_MODES),
  location: z.string().max(200),
  description: z.string().max(6000),
  sourceUrl: z.string().max(1000).default(""),
  source: z.enum(SOURCES),
  stack: z.array(z.string()),
  createdAt: z.string(),
  /** Imported posts only: when the daily import last saw it in the company's feed. */
  lastSeenAt: z.string().optional(),
  demo: z.boolean().optional(),
});
export type Job = z.infer<typeof JobSchema>;

/** A job plus its vote totals, as the repository returns it. */
export interface ScoredJob {
  job: Job;
  score: number;
  myVote: 1 | -1 | 0;
}

/** What the API returns. Voter ids never leave the server, only totals. */
export interface JobView extends Job {
  score: number;
  expiresAt: string;
  myVote: 1 | -1 | 0;
}

export interface JobFilters {
  function?: JobFunction;
  seniority?: Seniority;
  workMode?: WorkMode;
  source?: JobSource;
  stack?: string;
  q?: string;
}

export interface JobsPage {
  jobs: JobView[];
  total: number;
  stacks: string[];
  companies: number;
}

export interface JobsResponse {
  data: JobsPage;
}
