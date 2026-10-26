import type { Metadata } from "next";
import MatchTool from "@/components/match/MatchTool";
import { Container, PageHeader } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "Job match · CareerCopilot",
  description: "See how your resume matches a job description and get a tailored cover letter.",
};

export default function MatchPage() {
  return (
    <Container className="pt-14 md:pt-20">
      <PageHeader
        title="Match your resume to a job"
        intro="Paste a job description. See your match score, the skills and keywords you are missing, and get a cover letter written for this role."
      />
      <MatchTool />
    </Container>
  );
}
