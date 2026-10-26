import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const TOOLS = [
  {
    href: "/analyze",
    name: "Resume score",
    body: "A 0–100 score where every point is explained, the skills you are missing for your target role, a salary path and interview questions.",
  },
  {
    href: "/jobs",
    name: "Hiring posts",
    body: "Live tech roles in India pulled every morning from company careers pages, plus posts from hiring managers. Filter by stack and see your fit on each one.",
  },
  {
    href: "/match",
    name: "Job match",
    body: "Paste a job description. See how an applicant tracking system would rank you, which keywords you are missing, and get a tailored cover letter.",
  },
  {
    href: "/tracker",
    name: "Tracker",
    body: "Every application from saved to offer, plus your past reports. Kept on your own device, no account needed.",
  },
];

export default function Tools() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
      <h2 className="max-w-xl font-serif text-4xl leading-tight md:text-6xl">One resume. Four ways to use it.</h2>
      <ul className="mt-14 border-t border-line">
        {TOOLS.map((t) => (
          <li key={t.href} className="border-b border-line">
            <Link href={t.href} className="group grid gap-3 py-8 md:grid-cols-[1fr_1.6fr_auto] md:items-baseline md:gap-10">
              <span className="font-serif text-3xl md:text-4xl transition-colors group-hover:text-gold">{t.name}</span>
              <span className="max-w-xl leading-relaxed text-muted">{t.body}</span>
              <ArrowUpRight className="hidden text-muted transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-gold md:block" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
