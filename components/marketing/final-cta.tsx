"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export function FinalCta() {
  return (
    <section className="relative py-32 bg-[rgba(249,115,22,0.03)]">
      {/* Subtle orange glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(249,115,22,0.04),transparent)]" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white"
        >
          Ready to fill your calendar?
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mt-6 text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed"
        >
          Book a free 30-minute strategy call. We&apos;ll show you exactly how
          we&apos;d run lead gen in your market — no pitch, just a plan.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10">
          <Link
            href="/call"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-10 py-4 text-base font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Book Your Free Strategy Call
            <span aria-hidden="true">→</span>
          </Link>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mt-6 text-sm text-zinc-600"
        >
          No commitment. No contracts. Just results or you don&apos;t pay.
        </motion.p>
      </motion.div>
    </section>
  );
}
