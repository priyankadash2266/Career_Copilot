import type { Metadata } from "next";
// Self-hosted fonts from npm: no request to Google at build or run time
// (faster first paint, works offline and behind strict firewalls).
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/manrope";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "CareerCopilot: know where your career stands",
  description:
    "Score your resume, find your skill gaps, match against real hiring posts and write tailored cover letters.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
