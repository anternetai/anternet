"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const trustItems = [
  "100% Performance-Based",
  "$0 Monthly Retainer",
  "Home Service Specialists",
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="hero-bg absolute inset-0" />
      <div className="hero-grid absolute inset-0" />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-4xl px-6 pt-32 pb-24 text-center"
      >
        {/* Eyebrow */}
        <motion.div variants={fadeUp} className="mb-8 flex justify-center">
          <span className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/5 px-4 py-1.5 text-xs font-medium tracking-wide text-orange-400 uppercase">
            Performance-Based Lead Generation
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-[-0.04em] leading-[0.9] text-white"
        >
          Your calendar, full.
          <br />
          Your pipeline, predictable.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={fadeUp}
          className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          We fill your calendar with qualified roofing and remodeling
          appointments. You pay $200 per showed appointment. No retainer. No
          contracts. Just results.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/call"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-8 py-3.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Book a Strategy Call
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-8 py-3.5 text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            See How It Works
            <span aria-hidden="true">↓</span>
          </a>
        </motion.div>

        {/* Trust Stats */}
        <motion.div
          variants={fadeUp}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
        >
          {trustItems.map((item, i) => (
            <div key={item} className="flex items-center gap-2 text-sm text-zinc-500">
              {i > 0 && (
                <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-zinc-700 -ml-5 mr-3" />
              )}
              <span>{item}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
