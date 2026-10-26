import { describe, expect, it, vi } from "vitest";
import { chatCompletion, LlmError } from "@/lib/ai/llmClient";
import { extractJson, generateInsights, heuristicInsights, InsightsSchema } from "@/lib/ai/insights";
import { buildInsightMessages, MAX_RESUME_CHARS } from "@/lib/ai/prompts";

const input = {
  resumeText: "Backend engineer. Built REST APIs in Java.",
  targetRoleTitle: "Backend Engineer",
  yearsOfExperience: 2,
  matchedSkills: ["Java", "REST APIs"],
  missingSkills: ["Docker", "System Design"],
};

const validInsights = {
  summary: "Solid backend foundation with Java and REST APIs.",
  strengths: ["Strong Java"],
  improvements: ["Learn Docker"],
  bulletRewrites: [],
  interviewQuestions: ["How do you design a REST API?"],
};

/** Build a fake fetch that returns the given responses in order (Dependency Injection = easy testing). */
function fakeFetch(...responses: Array<{ status?: number; content?: string; body?: string }>) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce(
      new Response(r.body ?? JSON.stringify({ choices: [{ message: { content: r.content } }] }), { status: r.status ?? 200 }),
    );
  }
  return fn as unknown as typeof fetch;
}

const llm = (fetchImpl: typeof fetch) => ({ baseUrl: "https://llm.test/v1", apiKey: "k", model: "test-model", timeoutMs: 1000, fetchImpl });

describe("extractJson", () => {
  it("parses plain JSON, fenced JSON and JSON surrounded by prose", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Sure! Here it is: {"a":1} Hope this helps')).toEqual({ a: 1 });
  });

  it("throws when there is no JSON", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("prompt", () => {
  it("wraps the resume in delimiters and truncates long input", () => {
    const messages = buildInsightMessages({ ...input, resumeText: "a".repeat(MAX_RESUME_CHARS + 5000) });
    const user = messages[1].content;
    expect(user).toContain("<resume>");
    expect(user.match(/a/g)!.length).toBeLessThanOrEqual(MAX_RESUME_CHARS + 50);
    expect(messages[0].content).toMatch(/UNTRUSTED DATA/);
  });
});

describe("chatCompletion", () => {
  it("retries on 429/5xx then succeeds", async () => {
    const fetchImpl = fakeFetch({ status: 503, body: "busy" }, { content: "hi" });
    const res = await chatCompletion([{ role: "user", content: "x" }], { ...llm(fetchImpl), maxRetries: 1 });
    expect(res.content).toBe("hi");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 401 (it can never succeed)", async () => {
    const fetchImpl = fakeFetch({ status: 401, body: "bad key" });
    await expect(chatCompletion([{ role: "user", content: "x" }], llm(fetchImpl))).rejects.toBeInstanceOf(LlmError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("chatCompletion timeout", () => {
  it("aborts a request that hangs longer than timeoutMs", async () => {
    // A fetch that never answers until it is aborted.
    const hanging = ((_url: string, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as unknown as typeof fetch;
    await expect(
      chatCompletion([{ role: "user", content: "x" }], { ...llm(hanging), timeoutMs: 20, maxRetries: 0 }),
    ).rejects.toThrow(/timed out/);
  });
});

describe("generateInsights", () => {
  it("uses heuristic insights when no LLM is configured", async () => {
    const res = await generateInsights(input, [], null);
    expect(res.source).toBe("heuristic");
    expect(InsightsSchema.safeParse(res.insights).success).toBe(true);
  });

  it("returns validated LLM insights", async () => {
    const res = await generateInsights(input, [], llm(fakeFetch({ content: JSON.stringify(validInsights) })));
    expect(res.source).toBe("llm");
    expect(res.insights.summary).toBe(validInsights.summary);
  });

  it("self-corrects once when the first answer breaks the schema", async () => {
    const fetchImpl = fakeFetch({ content: '{"summary": 42}' }, { content: JSON.stringify(validInsights) });
    const res = await generateInsights(input, [], llm(fetchImpl));
    expect(res.source).toBe("llm");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("falls back to heuristics when the LLM keeps failing", async () => {
    const fetchImpl = fakeFetch({ status: 400, body: "bad request" });
    const res = await generateInsights(input, [], llm(fetchImpl));
    expect(res.source).toBe("heuristic");
  });

  it("heuristic insights always satisfy the schema, even with no skills", () => {
    const empty = heuristicInsights({ ...input, matchedSkills: [], missingSkills: [] }, []);
    expect(InsightsSchema.safeParse(empty).success).toBe(true);
  });
});
