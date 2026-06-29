"use client";

import { UploadCloud } from "lucide-react";

export default function ResumeUpload() {
  return (
    <section className="py-32 px-8 bg-black">
      <div className="max-w-4xl mx-auto">

        <div className="border border-dashed border-purple-500/40 rounded-3xl p-16 text-center bg-white/5">

          <UploadCloud className="mx-auto mb-6 text-purple-400" size={60} />

          <h2 className="text-4xl font-bold mb-4">
            Upload Your Resume
          </h2>

          <p className="text-zinc-400 mb-8">
            Get instant AI analysis, skill gaps, career roadmap and salary prediction.
          </p>

          <button className="px-8 py-4 bg-white text-black rounded-2xl font-semibold">
            Choose Resume
          </button>

        </div>

      </div>
    </section>
  );
}