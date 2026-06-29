"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

      <div className="absolute inset-0 bg-black" />

      <div className="absolute w-[700px] h-[700px] bg-purple-600/20 rounded-full blur-[200px]" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 text-center px-8"
      >
        <h1 className="text-7xl font-bold tracking-tight max-w-5xl">
          Your Career Has
          <span className="text-purple-400"> A GPS </span>
          Now.
        </h1>

        <p className="text-zinc-400 text-xl mt-8 max-w-3xl mx-auto">
          Discover jobs, missing skills, salary growth,
          and your future career path using AI.
        </p>

        <div className="mt-12 flex justify-center gap-4">

          <button className="px-8 py-4 rounded-2xl bg-white text-black font-semibold">
            Upload Resume
          </button>

          <button className="px-8 py-4 rounded-2xl border border-white/10">
            Watch Demo
          </button>

        </div>

      </motion.div>

    </section>
  );
}