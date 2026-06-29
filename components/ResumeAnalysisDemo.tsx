"use client";

import { motion } from "framer-motion";

export default function ResumeAnalysisDemo() {
  return (
    <section className="py-32 px-8 bg-black">

      <div className="max-w-6xl mx-auto">

        <h2 className="text-5xl font-bold text-center mb-6">
          AI Resume Analysis
        </h2>

        <p className="text-center text-zinc-400 mb-20">
          Understand exactly how recruiters and AI systems view your profile.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-10"
        >

          <div className="flex justify-between items-center mb-10">

            <h3 className="text-3xl font-bold">
              Resume Score
            </h3>

            <div className="text-5xl font-bold text-green-400">
              84/100
            </div>

          </div>

          <div className="grid md:grid-cols-2 gap-10">

            <div>
              <h4 className="text-xl font-semibold mb-4">
                Skills Found
              </h4>

              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 rounded-xl bg-green-500/20">Python</span>
                <span className="px-4 py-2 rounded-xl bg-green-500/20">SQL</span>
                <span className="px-4 py-2 rounded-xl bg-green-500/20">AWS</span>
                <span className="px-4 py-2 rounded-xl bg-green-500/20">React</span>
              </div>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-4">
                Missing Skills
              </h4>

              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 rounded-xl bg-red-500/20">
                  System Design
                </span>

                <span className="px-4 py-2 rounded-xl bg-red-500/20">
                  Docker
                </span>

                <span className="px-4 py-2 rounded-xl bg-red-500/20">
                  Kubernetes
                </span>
              </div>
            </div>

          </div>

          <div className="mt-10">

            <h4 className="text-xl font-semibold mb-6">
              Job Readiness
            </h4>

            <div className="space-y-4">

              <div className="flex justify-between">
                <span>Backend Engineer</span>
                <span>78%</span>
              </div>

              <div className="w-full h-3 bg-white/10 rounded-full">
                <div className="w-[78%] h-3 bg-purple-500 rounded-full" />
              </div>

              <div className="flex justify-between">
                <span>Data Analyst</span>
                <span>91%</span>
              </div>

              <div className="w-full h-3 bg-white/10 rounded-full">
                <div className="w-[91%] h-3 bg-green-500 rounded-full" />
              </div>

            </div>

          </div>

        </motion.div>

      </div>

    </section>
  );
}