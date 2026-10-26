import { getConfig } from "@/lib/config";

// Always run at request time (never prerender a health check at build time).
export const dynamic = "force-dynamic";

/**
 * GET /api/health — liveness check for uptime monitors and load balancers.
 * Reports whether AI insights are enabled, never the key itself.
 */
export async function GET(): Promise<Response> {
  const { llmEnabled, LLM_MODEL } = getConfig();
  return Response.json({
    status: "ok",
    ai: llmEnabled ? { mode: "llm", model: LLM_MODEL } : { mode: "heuristic" },
    time: new Date().toISOString(),
  });
}
