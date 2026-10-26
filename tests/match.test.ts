import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { extractKeywords, matchJob, requiredYears } from "@/lib/match/jobMatch";
import { CoverLetterSchema, buildCoverLetterMessages, generateCoverLetter, templateCoverLetter } from "@/lib/ai/coverLetter";
import { POST } from "@/app/api/match/route";
import type { MatchResponse } from "@/lib/match/analyzeMatch";
import type { ApiErrorBody } from "@/lib/errors";

const resumeText: string = JSON.parse(readFileSync(join(__dirname, "../evals/fixtures/backend-mid.json"), "utf8")).resumeText;

const JD = `Senior Backend Engineer - Payments
We are looking for a backend engineer with 3+ years of experience to build our payments platform.
You will design scalable microservices in Java or Node.js, work with PostgreSQL and Redis, and deploy on AWS with Docker and Kubernetes.
Experience with Kafka and payments, reconciliation and ledger systems is a plus. You care about reliability, observability and clean APIs.`;

const NOW = new Date("2026-10-01T00:00:00Z");

describe("job match engine", () => {
  it("finds required years in common phrasings", () => {
    expect(requiredYears("3+ years of experience")).toBe(3);
    expect(requiredYears("2-4 years in backend")).toBe(2);
    expect(requiredYears("minimum 5 yrs")).toBe(5);
    expect(requiredYears("no number here")).toBeNull();
  });

  it("extracts domain keywords, not stopwords or skills", () => {
    const kws = extractKeywords(JD);
    expect(kws).toContain("payment");
    expect(kws).not.toContain("experience");
    expect(kws).not.toContain("the");
    expect(kws).not.toContain("java"); // scored as a skill instead
  });

  it("scores matched vs missing skills and stays within 0..100", () => {
    const m = matchJob(resumeText, JD, NOW);
    expect(m.score).toBeGreaterThanOrEqual(0);
    expect(m.score).toBeLessThanOrEqual(100);
    expect(m.skills.missing).toContain("Kubernetes");
    expect(m.skills.matched.length).toBeGreaterThan(0);
    expect(m.breakdown.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1);
  });

  it("a resume that is the job description scores higher than an unrelated one", () => {
    const self = matchJob(JD, JD, NOW).score;
    const unrelated = matchJob("Pastry chef. Baked croissants and managed a bakery team.".repeat(10), JD, NOW).score;
    expect(self).toBeGreaterThan(unrelated);
  });
});

describe("cover letter", () => {
  const match = matchJob(resumeText, JD, NOW);
  const input = { resumeText, jobDescription: JD, jobTitle: "Backend Engineer", company: "Acme", match };

  it("template letter satisfies the schema and never claims missing skills", () => {
    const letter = templateCoverLetter(input);
    expect(CoverLetterSchema.safeParse(letter).success).toBe(true);
    expect(letter.coverLetter).toContain("Acme");
    expect(letter.coverLetter).toMatch(/deepening my skills in [^\n]*Kubernetes/);
  });

  it("marks both resume and JD as untrusted data in the prompt", () => {
    const [system, user] = buildCoverLetterMessages(input);
    expect(system.content).toMatch(/UNTRUSTED DATA/);
    expect(user.content).toContain("<job_description>");
    expect(user.content).toContain("<resume>");
  });

  it("uses the LLM when it returns valid JSON, else falls back", async () => {
    const good = { coverLetter: "x".repeat(400), tailoringTips: ["Add Kubernetes project"] };
    const fetchOk = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(good) } }] })),
    ) as unknown as typeof fetch;
    const llm = { baseUrl: "https://llm.test/v1", apiKey: "k", model: "m", timeoutMs: 1000 };
    expect((await generateCoverLetter(input, { ...llm, fetchImpl: fetchOk })).source).toBe("llm");

    const fetchBad = vi.fn().mockResolvedValue(new Response("nope", { status: 401 })) as unknown as typeof fetch;
    expect((await generateCoverLetter(input, { ...llm, fetchImpl: fetchBad })).source).toBe("heuristic");
  });
});

describe("POST /api/match", () => {
  const req = (form: FormData, ip: string) =>
    new Request("http://localhost/api/match", { method: "POST", body: form, headers: { "x-forwarded-for": ip } });

  it("returns a match and a cover letter", async () => {
    const form = new FormData();
    form.set("resumeText", resumeText);
    form.set("jobDescription", JD);
    form.set("company", "Acme");
    const res = await POST(req(form, "20.0.0.1"));
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as MatchResponse;
    expect(data.company).toBe("Acme");
    expect(data.coverLetter.length).toBeGreaterThan(300);
    expect(data.meta.letterSource).toBe("heuristic");
  });

  it("rejects a too-short job description", async () => {
    const form = new FormData();
    form.set("resumeText", resumeText);
    form.set("jobDescription", "Backend dev");
    const res = await POST(req(form, "20.0.0.2"));
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("INVALID_INPUT");
  });
});

describe("keyword extraction regressions", () => {
  it("does not turn plural-looking skill names into keywords (redis -> redi)", () => {
    const kws = extractKeywords("We use Redis and Kubernetes. Redis caching, Redis streams, payments, payments, payments.");
    expect(kws).not.toContain("redi");
    expect(kws).toContain("payment");
  });
});
