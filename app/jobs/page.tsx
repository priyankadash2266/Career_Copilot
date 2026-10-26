import type { Metadata } from "next";
import { Suspense } from "react";
import JobsBoard from "@/components/jobs/JobsBoard";
import { Container, PageHeader, PopLink } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "Hiring posts · CareerCopilot",
  description: "Live tech roles in India from company careers pages, plus posts from hiring managers.",
};

export default function JobsPage() {
  return (
    <Container className="pt-14 md:pt-20">
      <PageHeader
        title="Real openings, straight from the source"
        intro="Every morning we pull live tech roles in India from company careers pages. Hiring managers post here directly too. No recruiter blasts, and closed roles disappear on their own."
      >
        <PopLink href="/jobs/new" variant="dark" size="sm" className="mt-8">
          Post a job
        </PopLink>
      </PageHeader>
      {/* useSearchParams needs a Suspense boundary in the App Router. */}
      <Suspense fallback={<p className="py-16 text-center text-muted">Loading posts…</p>}>
        <JobsBoard />
      </Suspense>
    </Container>
  );
}
