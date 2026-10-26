import type { z } from "zod";
import { chatCompletion, type ChatMessage, type LlmClientOptions } from "./llmClient";
import { logger } from "@/lib/logger";

/** Models sometimes wrap JSON in ```json fences or add prose; pull out the object. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Ask the LLM for JSON and validate it against a Zod schema.
 *
 * LLM output is untrusted text, so we treat it like any external API
 * response: parse, validate, and never let invalid data reach the UI.
 * If the first answer is invalid we tell the model exactly what was wrong
 * and ask once more ("self-correction"). Returns null when the model is
 * unavailable or keeps failing, so callers can fall back to rules.
 */
export async function generateStructured<S extends z.ZodType>(
  schema: S,
  initialMessages: ChatMessage[],
  llm: LlmClientOptions,
  task: string,
  maxAttempts = 2,
): Promise<z.infer<S> | null> {
  const messages = initialMessages.slice();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let content: string;
    try {
      const completion = await chatCompletion(messages, llm);
      content = completion.content;
      logger.info("llm.call", { task, attempt, model: llm.model, ...completion.usage });
    } catch (err) {
      // Network/provider failures were already retried inside the client.
      logger.warn("llm.failed", { task, attempt, error: err instanceof Error ? err.message : String(err) });
      return null;
    }

    let problem: string;
    try {
      const parsed = schema.safeParse(extractJson(content));
      if (parsed.success) return parsed.data;
      problem = parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } catch {
      problem = "the response was not valid JSON";
    }

    logger.warn("llm.invalid_output", { task, attempt, problem });
    messages.push(
      { role: "assistant", content },
      { role: "user", content: `Your answer did not match the schema (${problem}). Reply again with corrected JSON only.` },
    );
  }
  return null;
}
