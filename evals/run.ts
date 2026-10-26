/**
 * Offline evaluation ("evals") for the analysis engine.
 *
 * Unit tests check that code does what we wrote. Evals check that the system
 * gives GOOD answers on realistic inputs, and let us measure quality changes
 * when we tweak the skill taxonomy, scoring rules or prompt.
 *
 * Metrics:
 *  - Skill extraction precision / recall / F1 against hand-labelled fixtures
 *  - Experience estimate within the expected range
 *  - Top recommended role matches the label
 *  - (optional) LLM output: schema-valid rate and latency, when LLM_API_KEY is set
 *
 * Run:  npm run eval
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { extractSkills } from "../lib/analysis/skills";
import { estimateYearsOfExperience } from "../lib/analysis/experience";
import { rankRoles, computeReadiness } from "../lib/analysis/scoring";
import { getRole } from "../lib/data/roles";
import { generateInsights } from "../lib/ai/insights";

interface Fixture {
  id: string;
  targetRole: string;
  resumeText: string;
  expected: { skills: string[]; yearsMin: number; yearsMax: number; topRole: string };
}

const FIXED_NOW = new Date("2026-10-01T00:00:00Z"); // deterministic dates
const dir = join(__dirname, "fixtures");
const fixtures: Fixture[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));

let tp = 0;
let fp = 0;
let fn = 0;
let yearsOk = 0;
let roleOk = 0;

for (const fx of fixtures) {
  const found = new Set(extractSkills(fx.resumeText).map((s) => s.name));
  const expected = new Set(fx.expected.skills);
  const falsePos = [...found].filter((s) => !expected.has(s));
  const falseNeg = [...expected].filter((s) => !found.has(s));
  tp += [...found].filter((s) => expected.has(s)).length;
  fp += falsePos.length;
  fn += falseNeg.length;

  const years = estimateYearsOfExperience(fx.resumeText, FIXED_NOW);
  const yearsPass = years >= fx.expected.yearsMin && years <= fx.expected.yearsMax;
  yearsOk += Number(yearsPass);

  const top = rankRoles(extractSkills(fx.resumeText))[0];
  const rolePass = top.roleId === fx.expected.topRole;
  roleOk += Number(rolePass);

  console.log(`\n▶ ${fx.id}`);
  console.log(`  skills: ${found.size} found | missed: [${falseNeg.join(", ")}] | extra: [${falsePos.join(", ")}]`);
  console.log(`  years: ${years} (expected ${fx.expected.yearsMin}-${fx.expected.yearsMax}) ${yearsPass ? "✓" : "✗"}`);
  console.log(`  top role: ${top.roleId} (${top.percent}%) ${rolePass ? "✓" : "✗"}`);
}

const precision = tp / (tp + fp || 1);
const recall = tp / (tp + fn || 1);
const f1 = (2 * precision * recall) / (precision + recall || 1);

console.log("\n==== Deterministic engine ====");
console.log(`Skill precision ${(precision * 100).toFixed(1)}%  recall ${(recall * 100).toFixed(1)}%  F1 ${(f1 * 100).toFixed(1)}%`);
console.log(`Experience accuracy ${yearsOk}/${fixtures.length}`);
console.log(`Top-role accuracy ${roleOk}/${fixtures.length}`);

async function llmEval() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    console.log("\n(LLM eval skipped: set LLM_API_KEY to measure schema-valid rate and latency.)");
    return;
  }
  const llm = {
    apiKey,
    baseUrl: process.env.LLM_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai",
    model: process.env.LLM_MODEL ?? "gemini-2.5-flash",
    timeoutMs: 30_000,
  };
  let llmOk = 0;
  const latencies: number[] = [];
  for (const fx of fixtures) {
    const role = getRole(fx.targetRole)!;
    const readiness = computeReadiness(role, extractSkills(fx.resumeText));
    const t = Date.now();
    const res = await generateInsights(
      {
        resumeText: fx.resumeText,
        targetRoleTitle: role.title,
        yearsOfExperience: estimateYearsOfExperience(fx.resumeText, FIXED_NOW),
        matchedSkills: readiness.matched,
        missingSkills: readiness.missing.map((m) => m.name),
      },
      [],
      llm,
    );
    latencies.push(Date.now() - t);
    llmOk += Number(res.source === "llm");
  }
  latencies.sort((a, b) => a - b);
  console.log("\n==== LLM insights ====");
  console.log(`Schema-valid LLM answers ${llmOk}/${fixtures.length}`);
  console.log(`Latency p50 ${latencies[Math.floor(latencies.length / 2)]}ms  max ${latencies[latencies.length - 1]}ms`);
}

llmEval().then(() => {
  // Quality gate: fail CI if the engine regresses below these thresholds.
  const pass = f1 >= 0.9 && yearsOk === fixtures.length && roleOk === fixtures.length;
  console.log(pass ? "\nEVAL PASSED" : "\nEVAL FAILED");
  process.exit(pass ? 0 : 1);
});
