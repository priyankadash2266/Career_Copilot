import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { feedUrl, type CompanySource } from "@/lib/jobs/import/companies";
import { parseFeed } from "@/lib/jobs/import/feeds";
import { mapWithConcurrency, runImport, toJob } from "@/lib/jobs/import/importer";
import {
  classifyFunction,
  classifySeniority,
  classifyWorkMode,
  htmlToText,
  isIndia,
  tidyTitle,
  truncate,
} from "@/lib/jobs/import/normalize";
import { MemoryJobRepository } from "@/lib/jobs/repository";
import { listJobs } from "@/lib/jobs/service";

const NOW = new Date("2026-10-07T00:00:00Z");
const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, "fixtures/feeds", `${name}.json`), "utf8"));

const CRED: CompanySource = { name: "CRED", ats: "lever", slug: "cred" };
const RUBRIK: CompanySource = { name: "Rubrik", ats: "greenhouse", slug: "rubrik" };
const SARVAM: CompanySource = { name: "Sarvam AI", ats: "ashby", slug: "sarvam" };

describe("normalisation rules", () => {
  it("turns HTML (including entity-escaped HTML) into readable text", () => {
    expect(htmlToText("<p>Hello&nbsp;<b>world</b></p><ul><li>One</li><li>Two</li></ul>")).toBe("Hello world\n\n• One\n• Two");
    expect(htmlToText("&lt;p&gt;Java &amp;amp; Go&lt;/p&gt;")).toBe("Java & Go");
  });

  it("truncates at a sentence or line break when it can", () => {
    const text = "First sentence. Second sentence. " + "x".repeat(100);
    expect(truncate(text, 40)).toBe("First sentence. Second sentence.…");
    expect(truncate("short", 40)).toBe("short");
  });

  it("title-cases all-lowercase titles only", () => {
    expect(tidyTitle("senior backend engineer")).toBe("Senior Backend Engineer");
    expect(tidyTitle("SDE II - iOS")).toBe("SDE II - iOS");
  });

  it("recognises Indian locations and country codes", () => {
    expect(isIndia(["Bengaluru-VTP, India"])).toBe(true);
    expect(isIndia(["Gurgaon"])).toBe(true);
    expect(isIndia(["Remote - India"])).toBe(true);
    expect(isIndia(["San Francisco"], "IN")).toBe(true);
    expect(isIndia(["San Francisco, CA"])).toBe(false);
    expect(isIndia(["Indianapolis, IN"])).toBe(false);
  });

  it.each([
    ["Senior Backend Engineer", "engineering"],
    ["Product Designer", "design"],
    ["Associate Product Manager", "product"],
    ["Data Scientist", "ai-ml"],
    ["Machine Learning Engineer II", "ai-ml"],
    ["Data Analyst", "data"],
    ["Site Reliability Engineer", "devops"],
    ["Solutions Engineer", "other"],
    ["Sales Engineer", "other"],
    ["Accounts Payable Manager", "other"],
    ["Equity Research Analyst", "other"],
  ])("classifies %s as %s", (title, expected) => {
    expect(classifyFunction(title)).toBe(expected);
  });

  it.each([
    ["Software Engineering Intern", "intern"],
    ["Software Engineer I", "junior"],
    ["SDE-1", "junior"],
    ["Associate Product Manager", "junior"],
    ["Software Engineer", "mid"],
    ["Senior Software Engineer", "senior"],
    ["Engineering Manager", "senior"],
    ["Staff Engineer", "staff"],
    ["Principal Architect", "staff"],
  ])("seniority of %s is %s", (title, expected) => {
    expect(classifySeniority(title)).toBe(expected);
  });

  it("work mode prefers the feed's explicit value, then the location text", () => {
    expect(classifyWorkMode(["Bengaluru"], "OnSite")).toBe("onsite");
    expect(classifyWorkMode(["Bengaluru"], "hybrid")).toBe("hybrid");
    expect(classifyWorkMode(["Remote - India"])).toBe("remote");
    expect(classifyWorkMode(["Pune"])).toBe("onsite");
  });
});

describe("feed parsers", () => {
  it("Lever: builds the description from opening, lists and additional text", () => {
    const [backend] = parseFeed("lever", fixture("lever"), NOW);
    expect(backend.title).toBe("senior backend engineer");
    expect(backend.description).toContain("Build payment APIs in Golang and Kafka");
    expect(backend.description).toContain("CRED is building rewards");
    expect(backend.postedAt).toBe(new Date(1790573982021).toISOString());
  });

  it("Greenhouse: decodes escaped HTML content and reads offices", () => {
    const [staff] = parseFeed("greenhouse", fixture("greenhouse"), NOW);
    expect(staff.description).toContain("Design distributed systems in Java and Kubernetes.");
    expect(staff.description).not.toContain("&lt;");
    expect(staff.locations).toContain("Bengaluru, India");
  });

  it("Ashby: skips unlisted roles and falls back to HTML when plain text is empty", () => {
    const postings = parseFeed("ashby", fixture("ashby"), NOW);
    expect(postings.map((p) => p.externalId)).toEqual(["ashby-1", "ashby-2"]);
    expect(postings[1].description).toBe("Work on LLMs & speech.");
  });

  it("rejects a feed whose shape changed (so one bad vendor cannot corrupt data)", () => {
    expect(() => parseFeed("greenhouse", { jobs: [{ title: 1 }] }, NOW)).toThrow();
  });
});

describe("toJob", () => {
  it("keeps India-based tech roles and enriches them", () => {
    const jobs = parseFeed("lever", fixture("lever"), NOW).map((p) => toJob(CRED, p));
    const [backend, finance, sf] = jobs;
    expect(finance).toBeNull(); // not a tech role
    expect(sf).toBeNull(); // not in India
    expect(backend).toMatchObject({
      id: "lever:cred:lever-backend-1",
      kind: "imported",
      title: "Senior Backend Engineer",
      company: "CRED",
      function: "engineering",
      seniority: "senior",
      workMode: "hybrid",
      location: "bengaluru",
      source: "careers",
      sourceUrl: "https://jobs.lever.co/cred/lever-backend-1",
    });
    expect(backend!.stack).toEqual(expect.arrayContaining(["Go", "Kafka", "SQL", "AWS"]));
  });

  it("builds stable ids from ATS + company + posting id (dedupe key)", () => {
    expect(feedUrl(RUBRIK)).toBe("https://boards-api.greenhouse.io/v1/boards/rubrik/jobs?content=true");
    const ids = parseFeed("greenhouse", fixture("greenhouse"), NOW).map((p) => toJob(RUBRIK, p)?.id);
    expect(ids).toEqual(["greenhouse:rubrik:111", undefined, "greenhouse:rubrik:333"]);
  });
});

/** Fake fetch keyed by URL: no network in tests (Dependency Injection). */
function fakeFetch(routes: Record<string, unknown>) {
  return vi.fn(async (url: string | URL | Request) => {
    const body = routes[String(url)];
    if (body === undefined) return new Response("not found", { status: 404 });
    return Response.json(body);
  }) as unknown as typeof fetch;
}

describe("runImport", () => {
  const BROKEN: CompanySource = { name: "Gone Inc", ats: "lever", slug: "gone" };
  const routes = {
    [feedUrl(CRED)]: fixture("lever"),
    [feedUrl(RUBRIK)]: fixture("greenhouse"),
    [feedUrl(SARVAM)]: fixture("ashby"),
  };

  it("imports every company, reports failures without stopping the others", async () => {
    const repo = new MemoryJobRepository();
    const report = await runImport({ repo, companies: [CRED, RUBRIK, SARVAM, BROKEN], fetchImpl: fakeFetch(routes), now: NOW });

    expect(report.companies.find((c) => c.company === "Gone Inc")).toMatchObject({ ok: false, error: "HTTP 404" });
    expect(report.companies.find((c) => c.company === "CRED")).toMatchObject({ ok: true, fetched: 3, kept: 1 });
    expect(report.kept).toBe(5); // 1 CRED + 2 Rubrik + 2 Sarvam
    expect(report.inserted).toBe(5);

    const page = await listJobs(repo, { now: NOW, filters: { source: "careers" } });
    expect(page.total).toBe(5);
    expect(page.companies).toBe(3);
  });

  it("is idempotent: a second run refreshes instead of duplicating", async () => {
    const repo = new MemoryJobRepository();
    await runImport({ repo, companies: [CRED, RUBRIK], fetchImpl: fakeFetch(routes), now: NOW });
    const later = new Date(NOW.getTime() + 24 * 3600_000);
    const second = await runImport({ repo, companies: [CRED, RUBRIK], fetchImpl: fakeFetch(routes), now: later });
    expect(second).toMatchObject({ inserted: 0, updated: 3 });
    expect((await repo.list()).length).toBe(3);
    expect((await repo.get("lever:cred:lever-backend-1"))!.lastSeenAt).toBe(later.toISOString());
  });

  it("a role removed from the company feed expires after the grace period", async () => {
    const repo = new MemoryJobRepository();
    await runImport({ repo, companies: [CRED], fetchImpl: fakeFetch(routes), now: NOW });
    const fourDaysLater = new Date(NOW.getTime() + 4 * 24 * 3600_000);
    expect((await listJobs(repo, { now: fourDaysLater })).total).toBe(0);
  });

  it("times out a hanging feed", async () => {
    const hanging = ((_: string, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as unknown as typeof fetch;
    const report = await runImport({ repo: new MemoryJobRepository(), companies: [CRED], fetchImpl: hanging, timeoutMs: 20, now: NOW });
    expect(report.companies[0]).toMatchObject({ ok: false, error: "timed out" });
  });
});

describe("mapWithConcurrency", () => {
  it("never runs more than `limit` tasks at once and keeps result order", async () => {
    let running = 0;
    let peak = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n * 10;
    });
    expect(results).toEqual([10, 20, 30, 40, 50, 60]);
    expect(peak).toBe(2);
  });
});
