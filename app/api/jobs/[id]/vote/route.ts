import { z } from "zod";
import { AppError } from "@/lib/errors";
import { RateLimiter } from "@/lib/rateLimit";
import { apiHandler, firstIssue, readJson } from "@/lib/http/handler";
import { getJobRepository } from "@/lib/jobs/repository";
import { voteJob } from "@/lib/jobs/service";
import type { JobView } from "@/lib/jobs/types";

export const runtime = "nodejs";

const limiter = new RateLimiter(60);

const VoteSchema = z.object({
  voterId: z.string().min(8).max(64),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

/** POST /api/jobs/:id/vote  { voterId, value: 1 | -1 | 0 } -> { data: JobView } */
export const POST = apiHandler<JobView, { id: string }>("jobs.vote", limiter, async (request, { params }) => {
  const body = VoteSchema.safeParse(await readJson(request));
  if (!body.success) throw new AppError("INVALID_INPUT", firstIssue(body.error));
  const data = await voteJob(getJobRepository(), { id: params.id, ...body.data });
  return { data, log: { value: body.data.value } };
});
