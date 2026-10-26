import Hero from "@/components/landing/Hero";
import Tools from "@/components/landing/Tools";
import LiveJobs from "@/components/landing/LiveJobs";
import HowItWorks from "@/components/landing/HowItWorks";
import FinalCta from "@/components/landing/FinalCta";

// The "hot right now" section reads live board data on every request.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Hero />
      <Tools />
      <LiveJobs />
      <HowItWorks />
      <FinalCta />
    </>
  );
}
