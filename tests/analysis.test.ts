import { describe, expect, it } from "vitest";
import { extractSkills } from "@/lib/analysis/skills";
import { estimateYearsOfExperience, mergeIntervals } from "@/lib/analysis/experience";
import { computeReadiness, rankRoles, scoreResume } from "@/lib/analysis/scoring";
import { careerGps, forecastSalary, levelFor } from "@/lib/analysis/career";
import { getRole } from "@/lib/data/roles";
import { SKILLS } from "@/lib/data/skills";
import { ROLES } from "@/lib/data/roles";

const names = (text: string) => extractSkills(text).map((s) => s.name);
const NOW = new Date("2026-10-01T00:00:00Z");

describe("data integrity", () => {
  it("every role skill exists in the skill taxonomy", () => {
    const known = new Set(SKILLS.map((s) => s.name));
    for (const role of ROLES) {
      for (const req of role.skills) {
        for (const name of [req.name, ...(req.anyOf ?? [])]) {
          expect(known.has(name), `${role.id} -> ${name}`).toBe(true);
        }
      }
    }
  });

  it("salary bands are ordered entry < mid < senior", () => {
    for (const role of ROLES) {
      expect(role.salary.entry[1]).toBeLessThanOrEqual(role.salary.mid[1]);
      expect(role.salary.mid[1]).toBeLessThanOrEqual(role.salary.senior[1]);
    }
  });
});

describe("extractSkills", () => {
  it("finds skills via aliases, case-insensitively", () => {
    expect(names("Worked with ReactJS, node.js and Postgres")).toEqual(
      expect.arrayContaining(["React", "Node.js", "SQL"]),
    );
  });

  it("handles symbols like C++, C# and CI/CD", () => {
    expect(names("Languages: C++, C#. Set up CI/CD with GitHub Actions.")).toEqual(
      expect.arrayContaining(["C++", "C#", "CI/CD"]),
    );
  });

  it("does not read 'js' inside Node.js / React.js as JavaScript, but still finds .NET", () => {
    const found = names("Built services in Node.js and a dashboard in React.js. Also some .NET work.");
    expect(found).toEqual(expect.arrayContaining(["Node.js", "React", "C#"]));
    expect(found).not.toContain("JavaScript");
  });

  it("does not match inside other words", () => {
    // "java" inside "javascript" must not count as Java; "rest" alone is not REST APIs
    const found = names("I love javascript and the rest of the team");
    expect(found).toContain("JavaScript");
    expect(found).not.toContain("Java");
    expect(found).not.toContain("REST APIs");
  });

  it("returns no duplicates", () => {
    const found = names("Python python PYTHON python3");
    expect(found.filter((n) => n === "Python")).toHaveLength(1);
  });
});

describe("experience", () => {
  it("merges overlapping intervals", () => {
    expect(mergeIntervals([[0, 10], [5, 20], [30, 40]])).toEqual([[0, 20], [30, 40]]);
  });

  it("sums date ranges in the experience section and ignores education years", () => {
    const text = `Experience\nEngineer, A — Jan 2024 – Present\nEngineer, B — Jan 2022 – Dec 2023\nEducation\nB.Tech 2018 - 2022`;
    expect(estimateYearsOfExperience(text, NOW)).toBeCloseTo(4.7, 1);
  });

  it("does not double count overlapping jobs", () => {
    const text = `Experience\nJob A Jan 2020 - Dec 2021\nFreelance Jan 2021 - Dec 2021`;
    expect(estimateYearsOfExperience(text, NOW)).toBeCloseTo(1.9, 1);
  });

  it("uses an explicit '5+ years' statement when larger", () => {
    expect(estimateYearsOfExperience("Engineer with 5+ years of experience", NOW)).toBe(5);
  });

  it("returns 0 when nothing is found", () => {
    expect(estimateYearsOfExperience("Student. Loves coding.", NOW)).toBe(0);
  });
});

describe("readiness", () => {
  const backend = getRole("backend-engineer")!;

  it("is 0% with no skills and 100% with all skills", () => {
    expect(computeReadiness(backend, []).percent).toBe(0);
    const all = backend.skills.map((s) => ({ name: s.name, category: "Backend" as const }));
    expect(computeReadiness(backend, all).percent).toBe(100);
  });

  it("accepts any one of the alternatives (Java instead of Node.js)", () => {
    const r = computeReadiness(backend, [{ name: "Java", category: "Language" }]);
    expect(r.matched).toContain("Java");
    expect(r.missing.map((m) => m.name)).not.toContain("Node.js");
  });

  it("orders missing skills by importance", () => {
    const r = computeReadiness(backend, []);
    const weights = r.missing.map((m) => m.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });

  it("caps readiness when most core skills are missing", () => {
    const mobile = getRole("mobile-developer")!;
    const skills = extractSkills("Java, REST APIs, Git, JUnit");
    expect(computeReadiness(mobile, skills).percent).toBeLessThanOrEqual(40);
  });

  it("ranks the matching role first", () => {
    const skills = extractSkills("SQL, Excel, Power BI, Statistics, Pandas, Python");
    expect(rankRoles(skills)[0].roleId).toBe("data-analyst");
  });
});

describe("scoreResume", () => {
  it("stays within 0..100 and breakdown sums to total", () => {
    for (const text of ["", "x".repeat(10), "Built APIs that reduced latency by 40%. ".repeat(200)]) {
      const s = scoreResume(text, extractSkills(text));
      expect(s.total).toBeGreaterThanOrEqual(0);
      expect(s.total).toBeLessThanOrEqual(100);
      expect(s.breakdown.reduce((a, c) => a + c.score, 0)).toBe(s.total);
    }
  });

  it("rewards quantified impact", () => {
    const plain = scoreResume("Worked on APIs\nWorked on database", []);
    const quantified = scoreResume("Reduced API latency by 40%\nServed 10k users\nCut costs by 25%", []);
    const impact = (s: typeof plain) => s.breakdown.find((c) => c.label === "Quantified impact")!.score;
    expect(impact(quantified)).toBeGreaterThan(impact(plain));
  });
});

describe("career projections", () => {
  const backend = getRole("backend-engineer")!;

  it("maps years to levels", () => {
    expect(levelFor(0)).toBe("entry");
    expect(levelFor(3)).toBe("mid");
    expect(levelFor(7)).toBe("senior");
  });

  it("salary forecast never decreases", () => {
    const points = forecastSalary({ currentRole: backend, currentReadiness: 0.9, targetRole: getRole("data-analyst")!, targetReadiness: 0.1, years: 1 });
    for (let i = 1; i < points.length; i++) {
      expect(points[i].lpa).toBeGreaterThanOrEqual(points[i - 1].lpa);
    }
  });

  it("GPS: ready now when nothing important is missing, probability bounded", () => {
    const all = backend.skills.map((s) => ({ name: s.name, category: "Backend" as const }));
    const gps = careerGps({ from: "You", target: computeReadiness(backend, all), resumeScore: 100 });
    expect(gps.estimatedMonths).toBe(0);
    expect(gps.successProbability).toBeLessThanOrEqual(95);
  });
});

describe("salary realism", () => {
  it("places a 5-year engineer near the bottom of the senior band, a 11-year one higher", () => {
    const backend = getRole("backend-engineer")!;
    const five = forecastSalary({ currentRole: backend, currentReadiness: 0.9, targetRole: backend, targetReadiness: 0.9, years: 5.2 })[0].lpa;
    const eleven = forecastSalary({ currentRole: backend, currentReadiness: 0.9, targetRole: backend, targetReadiness: 0.9, years: 11 })[0].lpa;
    expect(five).toBeLessThan(38);
    expect(eleven).toBeGreaterThan(five);
  });
});
