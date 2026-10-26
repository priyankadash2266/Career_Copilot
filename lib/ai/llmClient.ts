/**
 * Provider-agnostic LLM client.
 *
 * It speaks the OpenAI "chat completions" HTTP format, which Gemini, OpenAI,
 * Groq, OpenRouter and Ollama all support. Switching provider is a config
 * change (base URL + model + key), not a code change. Using plain `fetch`
 * instead of an SDK keeps the dependency list small and shows exactly what
 * goes over the wire.
 *
 * Reliability features:
 *  - timeout via AbortController (a hung provider must not hang our API)
 *  - retries with exponential backoff, but only for retryable failures
 *    (network errors, 429 rate limits, 5xx). A 400/401 will never succeed on
 *    retry, so we fail fast.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch; // injectable for tests (Dependency Injection)
}

export interface LlmCompletion {
  content: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function chatCompletion(
  messages: ChatMessage[],
  options: LlmClientOptions,
  { jsonMode = true, temperature = 0.2 }: { jsonMode?: boolean; temperature?: number } = {},
): Promise<LlmCompletion> {
  const { baseUrl, apiKey, model, timeoutMs, maxRetries = 2, fetchImpl = fetch } = options;
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const body = JSON.stringify({
    model,
    messages,
    temperature, // low temperature => more consistent, factual output
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  });

  let lastError: LlmError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** (attempt - 1)); // 500ms, 1s, 2s...

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        const detail = (await res.text().catch(() => "")).slice(0, 300);
        lastError = new LlmError(`LLM HTTP ${res.status}: ${detail}`, retryable);
        if (!retryable) throw lastError;
        continue;
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new LlmError("LLM returned an empty response", true);

      return {
        content,
        usage: { promptTokens: json.usage?.prompt_tokens, completionTokens: json.usage?.completion_tokens },
      };
    } catch (err) {
      if (err instanceof LlmError && !err.retryable) throw err;
      lastError =
        err instanceof LlmError
          ? err
          : new LlmError(err instanceof Error && err.name === "AbortError" ? "LLM request timed out" : String(err), true);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new LlmError("LLM request failed", false);
}
