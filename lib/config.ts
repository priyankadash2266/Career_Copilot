import { z } from "zod";
import type { LlmClientOptions } from "@/lib/ai/llmClient";

/**
 * Typed, validated configuration. Reading process.env directly all over the
 * codebase leads to typos and silent `undefined`s; validating once at the
 * edge (and failing loudly) is the "12-factor config" principle.
 */
const EnvSchema = z.object({
  // Any OpenAI-compatible endpoint works: Gemini (free tier), OpenAI, Groq, Ollama, OpenRouter...
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.url().default("https://generativelanguage.googleapis.com/v1beta/openai"),
  LLM_MODEL: z.string().default("gemini-2.5-flash"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
});

export type AppConfig = z.infer<typeof EnvSchema> & { llmEnabled: boolean };

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  cached = { ...parsed.data, llmEnabled: Boolean(parsed.data.LLM_API_KEY?.trim()) };
  return cached;
}

/**
 * LLM connection settings, or null when no key is configured. Callers treat
 * null as "use the rule-based fallback" (graceful degradation).
 */
export function llmOptions(config: AppConfig = getConfig()): LlmClientOptions | null {
  if (!config.llmEnabled) return null;
  return {
    baseUrl: config.LLM_BASE_URL,
    apiKey: config.LLM_API_KEY!,
    model: config.LLM_MODEL,
    timeoutMs: config.LLM_TIMEOUT_MS,
  };
}
