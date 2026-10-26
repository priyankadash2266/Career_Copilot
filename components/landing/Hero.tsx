"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PopLink, Chip } from "@/components/ui/kit";

/**
 * The hero opens with the product itself: a report card like the one the
 * user gets, instead of an abstract illustration. One orchestrated reveal.
 */
export default function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] as const } };

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-16 md:grid-cols-[1.15fr_1fr] md:items-center md:px-8 md:pb-28 md:pt-24">
        <div>
          <motion.h1 {...rise(0)} className="font-serif text-[56px] leading-[0.92] tracking-tight md:text-[96px]">
            Know exactly where your career stands.
          </motion.h1>
          <motion.p {...rise(0.15)} className="mt-7 max-w-lg text-lg leading-relaxed text-muted">
            Upload your resume. Get a score you can trust, the skills you are missing for the role you want, and hiring
            posts from the people who would actually be your boss.
          </motion.p>
          <motion.div {...rise(0.3)} className="mt-10 flex flex-wrap items-center gap-6">
            <PopLink href="/analyze">Score my resume</PopLink>
            <Link href="/jobs" className="text-sm font-semibold underline-offset-4 hover:underline">
              Browse hiring posts
            </Link>
          </motion.div>
        </div>

        <motion.div {...rise(0.45)} aria-label="Example report" className="relative">
          <div className="border border-line bg-surface p-7 rounded-[4px]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] text-muted">Resume score</p>
                <p className="mt-1 font-serif text-[88px] leading-none tabular-nums">
                  78<span className="font-sans text-lg text-muted">/100</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-muted">Ready for</p>
                <p className="mt-1 font-serif text-2xl">Backend Engineer</p>
                <p className="text-mint text-sm font-semibold">72% match</p>
              </div>
            </div>
            <div className="mt-6 h-[6px] bg-surface-2">
              <div className="h-full w-[72%] bg-gold" />
            </div>
            <p className="mt-6 text-[13px] text-muted">Close these gaps first</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone="bad">System Design</Chip>
              <Chip tone="bad">Docker</Chip>
              <Chip tone="neutral">AWS</Chip>
            </div>
            <div className="mt-7 grid grid-cols-3 border-t border-line pt-5 text-sm">
              {[
                ["Today", "₹9.5L"],
                ["12 months", "₹16L"],
                ["Job-ready in", "4 mo"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-muted text-[13px]">{k}</p>
                  <p className="font-serif text-3xl">{v}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Offset edge echoes the NeoPOP buttons. */}
          <div aria-hidden className="absolute inset-0 -z-10 translate-x-3 translate-y-3 border border-gold/40 rounded-[4px]" />
        </motion.div>
      </div>
    </section>
  );
}
