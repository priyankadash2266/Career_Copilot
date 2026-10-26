import type { Metadata } from "next";
import Analyzer from "@/components/analyze/Analyzer";
import { Container, PageHeader } from "@/components/ui/kit";
import { ROLE_OPTIONS } from "@/lib/data/roles";

export const metadata: Metadata = {
  title: "Score your resume · CareerCopilot",
  description: "Upload your resume to get a score, skill gaps, salary forecast and a personalised career roadmap.",
};

// Server Component: reads the role list on the server and passes only
// id + title to the client component (smaller bundle, no weights leaked).
export default function AnalyzePage() {
  return (
    <Container className="pt-14 md:pt-20">
      <PageHeader
        title="Score your resume"
        intro="Pick the role you want next. We will score your resume, find your skill gaps and map the fastest path there."
      />
      <Analyzer roles={ROLE_OPTIONS} />
    </Container>
  );
}
