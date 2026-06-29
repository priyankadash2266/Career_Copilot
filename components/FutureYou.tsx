"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function FutureYou() {
  return (
    <section className="py-32 bg-black px-8">

      <div className="max-w-6xl mx-auto">

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >

          <h2 className="text-6xl font-bold text-center mb-6">
            Future You™
          </h2>

          <p className="text-center text-zinc-400 text-xl mb-20">
            See where your career can realistically go next.
          </p>

          <div className="grid md:grid-cols-3 gap-8">

            {/* Current */}

            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">

              <div className="text-zinc-400 mb-4">
                Current
              </div>

              <h3 className="text-3xl font-bold">
                Technology Analyst
              </h3>

              <p className="mt-4 text-zinc-400">
                Current Salary
              </p>

              <p className="text-2xl font-semibold">
                ₹7 LPA
              </p>

            </div>

            {/* 6 Months */}

            <div className="rounded-3xl border border-purple-500/40 bg-purple-500/10 backdrop-blur-xl p-8">

              <div className="text-purple-300 mb-4">
                6 Months
              </div>

              <h3 className="text-3xl font-bold">
                Backend Engineer
              </h3>

              <p className="mt-4 text-zinc-300">
                Expected Salary
              </p>

              <p className="text-2xl font-semibold">
                ₹12 LPA
              </p>

              <div className="mt-6">
                <p className="text-sm text-zinc-400">
                  Learn:
                </p>

                <ul className="mt-2 space-y-2">
                  <li>Node.js</li>
                  <li>System Design</li>
                  <li>AWS</li>
                </ul>
              </div>

            </div>

            {/* 12 Months */}

            <div className="rounded-3xl border border-green-500/30 bg-green-500/10 backdrop-blur-xl p-8">

              <div className="text-green-300 mb-4">
                12 Months
              </div>

              <h3 className="text-3xl font-bold">
                Senior Backend Engineer
              </h3>

              <p className="mt-4 text-zinc-300">
                Expected Salary
              </p>

              <p className="text-2xl font-semibold">
                ₹18 LPA
              </p>

              <div className="mt-6">
                <p className="text-sm text-zinc-400">
                  Learn:
                </p>

                <ul className="mt-2 space-y-2">
                  <li>Distributed Systems</li>
                  <li>Microservices</li>
                  <li>Kubernetes</li>
                </ul>
              </div>

            </div>

          </div>

          <div className="flex justify-center mt-16">

            <button className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-black font-semibold">

              Generate My Roadmap

              <ArrowRight size={18} />

            </button>

          </div>

        </motion.div>

      </div>

    </section>
  );
}