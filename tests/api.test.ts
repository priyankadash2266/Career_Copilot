import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/analyze/route";
import type { AnalyzeResponse } from "@/lib/analysis/types";
import type { ApiErrorBody } from "@/lib/errors";

/**
 * Integration tests: call the real route handler with real Request objects,
 * exercising validation -> PDF parsing -> analysis -> JSON response.
 * No LLM key is set in tests, so the heuristic path runs (fast + free + deterministic).
 */
function request(form: FormData, ip = "10.0.0.1") {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body: form,
    headers: { "x-forwarded-for": ip },
  });
}

const resumeText = JSON.parse(readFileSync(join(__dirname, "../evals/fixtures/backend-mid.json"), "utf8")).resumeText;

describe("POST /api/analyze", () => {
  it("analyzes a real PDF upload", async () => {
    const pdf = readFileSync(join(__dirname, "fixtures/sample-resume.pdf"));
    const form = new FormData();
    form.set("targetRole", "backend-engineer");
    form.set("resume", new File([pdf], "resume.pdf", { type: "application/pdf" }));

    const res = await POST(request(form, "1.1.1.1"));
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as AnalyzeResponse;
    expect(data.target.roleId).toBe("backend-engineer");
    expect(data.profile.skills.map((s) => s.name)).toContain("Java");
    expect(data.resumeScore.total).toBeGreaterThan(50);
    expect(data.salary).toHaveLength(4);
    expect(data.meta.insightsSource).toBe("heuristic");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("accepts pasted text", async () => {
    const form = new FormData();
    form.set("targetRole", "devops-engineer");
    form.set("resumeText", resumeText);
    const res = await POST(request(form, "2.2.2.2"));
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as AnalyzeResponse;
    expect(data.target.missing.map((m) => m.name)).toContain("Kubernetes");
  });

  it("rejects a fake PDF", async () => {
    const form = new FormData();
    form.set("targetRole", "backend-engineer");
    form.set("resume", new File(["not really a pdf"], "resume.pdf", { type: "application/pdf" }));
    const res = await POST(request(form, "3.3.3.3"));
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("UNSUPPORTED_FILE");
  });

  it("rejects an unknown role and missing input", async () => {
    const bad = new FormData();
    bad.set("targetRole", "astronaut");
    bad.set("resumeText", resumeText);
    expect((await POST(request(bad, "4.4.4.4"))).status).toBe(400);

    const empty = new FormData();
    empty.set("targetRole", "backend-engineer");
    const res = await POST(request(empty, "4.4.4.4"));
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("INVALID_INPUT");
  });

  it("rejects text that is too short to analyse", async () => {
    const form = new FormData();
    form.set("targetRole", "backend-engineer");
    form.set("resumeText", "Hi, I know Java.");
    const res = await POST(request(form, "5.5.5.5"));
    expect(res.status).toBe(422);
  });

  it("rate limits a noisy client", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const form = new FormData();
      form.set("targetRole", "backend-engineer");
      form.set("resumeText", resumeText);
      statuses.push((await POST(request(form, "9.9.9.9"))).status);
    }
    expect(statuses).toContain(429);
  });
});
