import { timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";
import { apiHandler } from "@/lib/http/handler";
import { getJobRepository } from "@/lib/jobs/repository";
import { runImport, type ImportReport } from "@/lib/jobs/import/importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Constant-time comparison: the time taken does not leak how much of a guessed secret was right. */
function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * GET /api/cron/import-jobs
 *
 * Called once a day by Vercel Cron (see vercel.json). Vercel sends
 * "Authorization: Bearer <CRON_SECRET>", so nobody else can trigger a
 * (costly) import. Returns a per-company report.
 */
export const GET = apiHandler<ImportReport>("jobs.import", null, async (request) => {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !sameSecret(header, `Bearer ${secret}`)) {
    throw new AppError("UNAUTHORIZED", "Missing or wrong cron secret.", 401);
  }
  const data = await runImport({ repo: getJobRepository() });
  return { data, log: { kept: data.kept, inserted: data.inserted } };
});
