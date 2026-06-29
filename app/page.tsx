import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import Features from "@/components/Features";
import FutureYou from "@/components/FutureYou";
import HowItWorks from "@/components/HowItWorks";
import ResumeAnalysisDemo from "@/components/ResumeAnalysisDemo";
import SalaryPredictor from "@/components/SalaryPredictor";
import ResumeUpload from "@/components/ResumeUpload";
import CareerGPS from "@/components/CareerGPS";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="bg-black text-white min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <FutureYou />
      <HowItWorks />
      <ResumeAnalysisDemo />
      <SalaryPredictor />
      <ResumeUpload />
      <CareerGPS />
      <Footer />




    </main>
  );
}
