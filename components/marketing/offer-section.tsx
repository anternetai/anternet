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
  visible: { transition: { staggerChildren: 0.08 } },
};

const offerItems = [
  "$200 per showed appointment",
  "$50/day ad spend (your budget, our management)",
  "$0 monthly retainer",
  "$0 setup fee (waived until $50K revenue together)",
  "No long-term contract",
];

export function OfferSection() {
  return (
    <section id="pricing" className="relative py-32 bg-[#050505]">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="rounded-3xl border border-white/5 bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] p-10 md:p-16"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.1]"
          >
            Pay for results.
            <br />
            Not promises.
          </motion.h2>

          <motion.div variants={stagger} className="mt-10 space-y-4">
            {offerItems.map((item) => (
              <motion.div
                key={item}
                variants={fadeUp}
                className="flex items-start gap-3"
              >
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                <span className="text-lg text-zinc-300">{item}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-10 text-zinc-400"
          >
            When your calendar&apos;s full, we win together. Simple as that.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8">
            <Link
              href="/call"
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-8 py-3.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Claim Your Market
              <span aria-hidden="true">→</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
