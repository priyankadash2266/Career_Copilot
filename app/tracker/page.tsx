import type { Metadata } from "next";
import Tracker from "@/components/tracker/Tracker";
import { Container, PageHeader } from "@/components/ui/kit";

export const metadata: Metadata = { title: "Tracker · CareerCopilot" };

export default function TrackerPage() {
  return (
    <Container className="pt-14 md:pt-20">
      <PageHeader title="Your search, in one place" intro="Applications from saved to offer, and every resume report you have run." />
      <Tracker />
    </Container>
  );
}
