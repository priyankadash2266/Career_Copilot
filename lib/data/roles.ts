/**
 * Target roles the analyser understands.
 *
 * - `skills` lists what the role needs, with a weight:
 *     3 = core (must have), 2 = important, 1 = nice to have.
 * - `salary` holds indicative Indian market bands in ₹ LPA (lakh per annum)
 *   for each experience level. These are rough, hand-curated estimates for a
 *   demo, NOT live market data — the UI says so.
 * - `nextRole` is the natural promotion used by the "Future You" roadmap.
 */

export type ExperienceLevel = "entry" | "mid" | "senior";

export interface RoleSkill {
  /** Canonical skill name from lib/data/skills.ts (what we recommend learning). */
  name: string;
  weight: 1 | 2 | 3;
  /**
   * Interchangeable alternatives. A backend engineer needs *a* backend
   * language, not all of them — knowing any one of these satisfies it.
   */
  anyOf?: string[];
}

export interface RoleDefinition {
  id: string;
  title: string;
  skills: RoleSkill[];
  salary: Record<ExperienceLevel, [min: number, max: number]>;
  nextRole: string;
}

export const ROLES: RoleDefinition[] = [
  {
    id: "backend-engineer",
    title: "Backend Engineer",
    skills: [
      { name: "Node.js", weight: 3, anyOf: ["Java", "Python", "Go", "C#", "Spring Boot", "Django", "FastAPI", "Express"] },
      { name: "SQL", weight: 3 },
      { name: "REST APIs", weight: 3 },
      { name: "Data Structures & Algorithms", weight: 3 },
      { name: "System Design", weight: 3 },
      { name: "Git", weight: 2 },
      { name: "Docker", weight: 2 },
      { name: "Redis", weight: 1 },
      { name: "Microservices", weight: 2 },
      { name: "AWS", weight: 2 },
      { name: "Kafka", weight: 1 },
      { name: "Unit Testing", weight: 1 },
    ],
    salary: { entry: [5, 12], mid: [12, 26], senior: [22, 50] },
    nextRole: "Senior Backend Engineer",
  },
  {
    id: "frontend-engineer",
    title: "Frontend Engineer",
    skills: [
      { name: "JavaScript", weight: 3 },
      { name: "TypeScript", weight: 2 },
      { name: "React", weight: 3 },
      { name: "HTML/CSS", weight: 3 },
      { name: "Next.js", weight: 2 },
      { name: "Redux", weight: 1 },
      { name: "Tailwind CSS", weight: 1 },
      { name: "REST APIs", weight: 2 },
      { name: "Git", weight: 2 },
      { name: "Unit Testing", weight: 2 },
      { name: "Data Structures & Algorithms", weight: 2 },
    ],
    salary: { entry: [4, 10], mid: [10, 24], senior: [24, 50] },
    nextRole: "Senior Frontend Engineer",
  },
  {
    id: "full-stack-engineer",
    title: "Full Stack Engineer",
    skills: [
      { name: "JavaScript", weight: 3 },
      { name: "TypeScript", weight: 2 },
      { name: "React", weight: 3 },
      { name: "Node.js", weight: 3 },
      { name: "SQL", weight: 2 },
      { name: "MongoDB", weight: 1 },
      { name: "REST APIs", weight: 3 },
      { name: "HTML/CSS", weight: 2 },
      { name: "Git", weight: 2 },
      { name: "Docker", weight: 1 },
      { name: "AWS", weight: 1 },
      { name: "System Design", weight: 2 },
    ],
    salary: { entry: [5, 12], mid: [12, 26], senior: [26, 55] },
    nextRole: "Senior Full Stack Engineer",
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    skills: [
      { name: "SQL", weight: 3 },
      { name: "Excel", weight: 3 },
      { name: "Python", weight: 2 },
      { name: "Pandas", weight: 2 },
      { name: "Power BI", weight: 3, anyOf: ["Tableau"] },
      { name: "Statistics", weight: 3 },
      { name: "Product Analytics", weight: 1 },
      { name: "ETL", weight: 1 },
    ],
    salary: { entry: [3.5, 8], mid: [8, 16], senior: [16, 30] },
    nextRole: "Senior Data Analyst",
  },
  {
    id: "data-scientist",
    title: "Data Scientist",
    skills: [
      { name: "Python", weight: 3 },
      { name: "SQL", weight: 3 },
      { name: "Statistics", weight: 3 },
      { name: "Machine Learning", weight: 3 },
      { name: "Pandas", weight: 2 },
      { name: "Deep Learning", weight: 2 },
      { name: "Tableau", weight: 1 },
      { name: "Spark", weight: 1 },
      { name: "NLP", weight: 1 },
      { name: "Git", weight: 1 },
    ],
    salary: { entry: [6, 14], mid: [14, 30], senior: [30, 60] },
    nextRole: "Senior Data Scientist",
  },
  {
    id: "ml-engineer",
    title: "Machine Learning Engineer",
    skills: [
      { name: "Python", weight: 3 },
      { name: "Machine Learning", weight: 3 },
      { name: "Deep Learning", weight: 3 },
      { name: "PyTorch", weight: 2, anyOf: ["TensorFlow"] },
      { name: "MLOps", weight: 3 },
      { name: "Docker", weight: 2 },
      { name: "SQL", weight: 1 },
      { name: "AWS", weight: 2 },
      { name: "Data Structures & Algorithms", weight: 2 },
      { name: "Git", weight: 1 },
    ],
    salary: { entry: [7, 16], mid: [16, 35], senior: [35, 70] },
    nextRole: "Senior ML Engineer",
  },
  {
    id: "ai-engineer",
    title: "AI Engineer (LLM Apps)",
    skills: [
      { name: "Python", weight: 3 },
      { name: "LLMs", weight: 3 },
      { name: "RAG", weight: 3 },
      { name: "LangChain", weight: 2 },
      { name: "REST APIs", weight: 2 },
      { name: "FastAPI", weight: 2 },
      { name: "TypeScript", weight: 1 },
      { name: "Docker", weight: 2 },
      { name: "NLP", weight: 1 },
      { name: "Machine Learning", weight: 1 },
      { name: "AWS", weight: 1 },
      { name: "Git", weight: 1 },
    ],
    salary: { entry: [7, 18], mid: [18, 40], senior: [40, 80] },
    nextRole: "Senior AI Engineer",
  },
  {
    id: "devops-engineer",
    title: "DevOps Engineer",
    skills: [
      { name: "Linux", weight: 3 },
      { name: "Docker", weight: 3 },
      { name: "Kubernetes", weight: 3 },
      { name: "CI/CD", weight: 3 },
      { name: "AWS", weight: 3, anyOf: ["Azure", "GCP"] },
      { name: "Terraform", weight: 2 },
      { name: "Bash", weight: 2 },
      { name: "Python", weight: 1 },
      { name: "Monitoring", weight: 2 },
      { name: "Git", weight: 2 },
    ],
    salary: { entry: [5, 11], mid: [11, 25], senior: [25, 50] },
    nextRole: "Senior DevOps / SRE",
  },
  {
    id: "mobile-developer",
    title: "Mobile Developer",
    skills: [
      { name: "Android", weight: 3, anyOf: ["iOS", "React Native", "Flutter"] },
      { name: "Kotlin", weight: 2, anyOf: ["Swift", "Java", "JavaScript", "Flutter"] },
      { name: "REST APIs", weight: 2 },
      { name: "Git", weight: 2 },
      { name: "Unit Testing", weight: 1 },
    ],
    salary: { entry: [4, 10], mid: [10, 22], senior: [22, 45] },
    nextRole: "Senior Mobile Developer",
  },
  {
    id: "qa-automation-engineer",
    title: "QA Automation Engineer",
    skills: [
      { name: "Test Automation", weight: 3 },
      { name: "Unit Testing", weight: 2 },
      { name: "Java", weight: 2, anyOf: ["Python", "JavaScript", "TypeScript", "C#"] },
      { name: "SQL", weight: 1 },
      { name: "CI/CD", weight: 2 },
      { name: "REST APIs", weight: 2 },
      { name: "Git", weight: 1 },
      { name: "Agile", weight: 1 },
    ],
    salary: { entry: [3.5, 8], mid: [8, 18], senior: [18, 35] },
    nextRole: "SDET Lead",
  },
  {
    id: "product-manager",
    title: "Product Manager",
    skills: [
      { name: "Stakeholder Management", weight: 3 },
      { name: "Product Analytics", weight: 3 },
      { name: "Agile", weight: 2 },
      { name: "SQL", weight: 2 },
      { name: "Excel", weight: 1 },
      { name: "Statistics", weight: 1 },
      { name: "System Design", weight: 1 },
    ],
    salary: { entry: [8, 18], mid: [18, 35], senior: [35, 70] },
    nextRole: "Senior Product Manager",
  },
];

const ROLE_INDEX = new Map(ROLES.map((r) => [r.id, r]));

export function getRole(id: string): RoleDefinition | undefined {
  return ROLE_INDEX.get(id);
}

/** Small public view of roles for dropdowns (no need to ship weights to the browser). */
export const ROLE_OPTIONS = ROLES.map((r) => ({ id: r.id, title: r.title }));
