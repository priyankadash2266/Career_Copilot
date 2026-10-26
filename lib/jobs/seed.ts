import { detectStack } from "./classify";
import type { Job } from "./types";

/**
 * Demo posts so a fresh LOCAL install has something to browse (production
 * uses real imported jobs instead and is never seeded). Companies are
 * fictional and every seeded post is flagged `demo: true`, which the UI shows.
 * Timestamps are relative to "now" so the demo never expires.
 */
type Seed = Omit<Job, "id" | "kind" | "stack" | "createdAt" | "lastSeenAt" | "source" | "sourceUrl" | "demo"> & {
  hoursAgo: number;
  up: number;
  down?: number;
};

const SEEDS: Seed[] = [
  {
    title: "Founding Backend Engineer",
    company: "Ledgerline",
    postedBy: "Co-founder & CTO",
    function: "engineering",
    seniority: "senior",
    workMode: "hybrid",
    location: "Bengaluru (HSR Layout)",
    description:
      "We're building reconciliation infra for Indian fintechs and need our first backend hire. You'll own our Golang and PostgreSQL services end to end, design the ledger, and set up Kafka pipelines on AWS. 4+ years building production systems. You will work directly with me; no layers, no recruiters. DM me or reply with something you've built.",
    hoursAgo: 5,
    up: 42,
    down: 2,
  },
  {
    title: "Frontend Engineer (React + TypeScript)",
    company: "Kiranakart",
    postedBy: "Engineering Manager",
    function: "engineering",
    seniority: "mid",
    workMode: "onsite",
    location: "Bengaluru (Koramangala)",
    description:
      "My team ships the storefront used by 30k neighbourhood stores. Looking for someone with 2-4 years of React, TypeScript and Next.js who cares about performance on cheap Android phones. We use Tailwind CSS and test with Jest and Playwright. You'll pair with me on the checkout rewrite in your first month.",
    hoursAgo: 20,
    up: 31,
  },
  {
    title: "ML Engineer, Speech",
    company: "Monsoon Labs",
    postedBy: "Head of AI",
    function: "ai-ml",
    seniority: "mid",
    workMode: "remote",
    location: "Remote (India)",
    description:
      "We train speech models for 11 Indian languages. Hiring an ML engineer with PyTorch, Python and MLOps experience to own training and evaluation pipelines. Bonus if you've fine-tuned Hugging Face models or deployed on Kubernetes. 2+ years of experience. Small team, real GPUs, published benchmarks.",
    hoursAgo: 30,
    up: 55,
    down: 1,
  },
  {
    title: "AI Engineer: LLM agents",
    company: "Paperplane AI",
    postedBy: "Founder",
    function: "ai-ml",
    seniority: "junior",
    workMode: "hybrid",
    location: "Bengaluru (Indiranagar)",
    description:
      "We automate back-office work for CA firms with LLM agents. Looking for an engineer who has shipped something real with LLMs: RAG, prompt engineering, evals, LangChain or plain API calls. Python and FastAPI on our side, vector databases for retrieval. 1+ years or a strong portfolio. Show me a demo and we'll talk the same day.",
    hoursAgo: 3,
    up: 18,
  },
  {
    title: "Product Manager, Growth",
    company: "Tiltwell Health",
    postedBy: "VP Product",
    function: "product",
    seniority: "mid",
    workMode: "hybrid",
    location: "Gurugram",
    description:
      "Looking for a PM to own activation for our diabetes care app. You'll run A/B testing, write PRDs, work with SQL and our analytics stack, and talk to patients every week. 3+ years in product, ideally consumer health or fintech. You'll report to me and work with a pod of 6 engineers and a designer.",
    hoursAgo: 52,
    up: 24,
    down: 3,
  },
  {
    title: "Product Designer",
    company: "Kiranakart",
    postedBy: "Design Lead",
    function: "design",
    seniority: "mid",
    workMode: "onsite",
    location: "Bengaluru (Koramangala)",
    description:
      "Hiring a product designer who loves messy, real-world flows. Our users are shop owners who use the app 8 hours a day. Figma, prototyping and user research are the job. 2+ years of experience, portfolio with shipped work required. You'll sit next to the engineers who build what you design.",
    hoursAgo: 70,
    up: 12,
  },
  {
    title: "Data Analyst",
    company: "Ledgerline",
    postedBy: "Head of Ops",
    function: "data",
    seniority: "junior",
    workMode: "hybrid",
    location: "Bengaluru (HSR Layout)",
    description:
      "First data hire on the ops team. You'll write SQL every day, build dashboards in Power BI, and use Python and Excel to find where reconciliation breaks. Freshers with strong SQL and a project or two are welcome. I'll mentor you directly and you'll present to the founders every Friday.",
    hoursAgo: 12,
    up: 9,
  },
  {
    title: "DevOps / Platform Engineer",
    company: "Monsoon Labs",
    postedBy: "Infra Lead",
    function: "devops",
    seniority: "senior",
    workMode: "remote",
    location: "Remote (India)",
    description:
      "We need someone to own our GPU cluster and deploy pipeline. Kubernetes, Terraform, Docker and CI/CD on GCP and AWS; observability with Prometheus and Grafana. 5+ years. You'll cut our model deploy time from a day to minutes. Async-first team, quarterly offsites in Goa.",
    hoursAgo: 90,
    up: 21,
    down: 2,
  },
  {
    title: "Software Engineering Intern (Summer)",
    company: "Paperplane AI",
    postedBy: "Founder",
    function: "engineering",
    seniority: "intern",
    workMode: "onsite",
    location: "Bengaluru (Indiranagar)",
    description:
      "3-month paid internship. You'll ship real features in our Python and React codebase, write tests, and review code with the team. Strong data structures and algorithms basics and Git are enough; curiosity matters more than your college. Stipend ₹60k/month. PPO for the right person.",
    hoursAgo: 40,
    up: 37,
  },
  {
    title: "Staff Engineer, Payments",
    company: "Tiltwell Health",
    postedBy: "CTO",
    function: "engineering",
    seniority: "staff",
    workMode: "hybrid",
    location: "Gurugram",
    description:
      "Looking for a staff engineer to lead our payments and insurance claims platform. Java and Spring Boot microservices, PostgreSQL, Redis and Kafka. You'll drive system design reviews, mentor 8 engineers and set our reliability bar. 8+ years, with at least one system you designed running in production at scale.",
    hoursAgo: 110,
    up: 14,
  },
];

export function seedJobs(now: Date): { job: Job; votes: Record<string, 1 | -1> }[] {
  return SEEDS.map(({ hoursAgo, up, down = 0, ...fields }, i) => {
    const votes: Record<string, 1 | -1> = {};
    for (let v = 0; v < up; v++) votes[`seed-up-${v}`] = 1;
    for (let v = 0; v < down; v++) votes[`seed-down-${v}`] = -1;
    return {
      job: {
        ...fields,
        id: `demo-${i + 1}`,
        kind: "community",
        sourceUrl: "",
        source: "other",
        stack: detectStack(`${fields.title}\n${fields.description}`),
        createdAt: new Date(now.getTime() - hoursAgo * 3600_000).toISOString(),
        demo: true,
      },
      votes,
    };
  });
}
