import type { Metadata } from "next";
import PostJobForm from "@/components/jobs/PostJobForm";
import { Container, PageHeader } from "@/components/ui/kit";

export const metadata: Metadata = { title: "Post a job · CareerCopilot" };

export default function NewJobPage() {
  return (
    <Container className="pt-14 md:pt-20">
      <PageHeader
        title="Post a job"
        intro="Write it the way you would on LinkedIn. We pull out the stack automatically so the right people find it."
      />
      <PostJobForm />
    </Container>
  );
}
