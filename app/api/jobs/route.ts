import { z } from "zod";
import { AppError } from "@/lib/errors";
import { RateLimiter } from "@/lib/rateLimit";
import { apiHandler, firstIssue, readJson } from "@/lib/http/handler";
import { getJobRepository } from "@/lib/jobs/repository";
import { createJob, listJobs } from "@/lib/jobs/service";
import { FUNCTIONS, SENIORITIES, SORTS, SOURCES, WORK_MODES, type JobView, type JobsPage } from "@/lib/jobs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reads are cheap, writes are not: separate limits.
const readLimiter = new RateLimiter(120);
const writeLimiter = new RateLimiter(5);

// Empty query params ("?function=") are treated as "not set".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const QuerySchema = z.object({
  sort: optional(z.enum(SORTS)),
  function: optional(z.enum(FUNCTIONS)),
  seniority: optional(z.enum(SENIORITIES)),
  workMode: optional(z.enum(WORK_MODES)),
  source: optional(z.enum(SOURCES)),
  stack: optional(z.string().max(40)),
  q: optional(z.string().max(100)),
  voter: optional(z.string().max(64)),
  limit: optional(z.coerce.number().int().min(1).max(200)),
});

/** GET /api/jobs?sort=hot&function=engineering&stack=Python&q=bengaluru&voter=<id>&limit=30 */
export const GET = apiHandler<JobsPage>("jobs.list", readLimiter, async (request) => {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = QuerySchema.safeParse(params);
  if (!query.success) throw new AppError("INVALID_INPUT", firstIssue(query.error));
  const { sort, voter, limit, ...filters } = query.data;
  const data = await listJobs(getJobRepository(), { filters, sort, voterId: voter, limit });
  return { data, log: { count: data.jobs.length, total: data.total } };
});

/** POST /api/jobs  (JSON body: see NewJobSchema) -> 201 { data: JobView } */
export const POST = apiHandler<JobView>("jobs.create", writeLimiter, async (request) => {
  const body = await readJson(request);
  const data = await createJob(getJobRepository(), body);
  return { data, status: 201, log: { function: data.function, stack: data.stack.length } };
});
