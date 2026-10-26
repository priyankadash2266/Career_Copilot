/**
 * Run the job import from your own machine:   npm run import:jobs
 *
 * Uses the same code as the daily cron. Without DATABASE_URL it fills the
 * local .data/jobs.json, so the board shows real jobs in development too.
 */
import { getJobRepository } from "../lib/jobs/repository";
import { runImport } from "../lib/jobs/import/importer";

runImport({ repo: getJobRepository() })
  .then((report) => {
    for (const c of report.companies) {
      console.log(`${c.ok ? "✓" : "✗"} ${c.company.padEnd(12)} fetched ${String(c.fetched).padStart(4)}  kept ${String(c.kept).padStart(3)}${c.error ? `  (${c.error})` : ""}`);
    }
    console.log(`\n${report.kept} jobs kept: ${report.inserted} new, ${report.updated} refreshed, in ${(report.durationMs / 1000).toFixed(1)}s`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
