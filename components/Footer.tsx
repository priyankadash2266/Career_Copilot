import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line no-print">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-8">
        <p>
          <span className="font-serif text-xl text-text">CareerCopilot</span>
          <span className="ml-3">Resumes are analysed in memory and never stored on our servers.</span>
        </p>
        <div className="flex gap-6">
          <Link href="/jobs" className="hover:text-text">Jobs</Link>
          <Link href="/jobs/new" className="hover:text-text">Post a job</Link>
          <a href="/api/health" className="hover:text-text">Status</a>
        </div>
      </div>
    </footer>
  );
}
