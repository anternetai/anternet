"use client";

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
  visible: { transition: { staggerChildren: 0.12 } },
};

const painPoints = [
  {
    title: "Pay-per-click",
    desc: "You pay whether leads convert or not.",
  },
  {
    title: "Agency retainers",
    desc: "$3,000/mo regardless of results.",
  },
  {
    title: "Shared leads",
    desc: "The same lead sold to 5 other contractors.",
  },
];

export function ProblemSection() {
  return (
    <section className="relative py-32 bg-[#050505]">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center"
        >
          <motion.span
            variants={fadeUp}
            className="text-xs font-medium uppercase tracking-widest text-orange-400"
          >
            The Problem
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white"
          >
            Traditional lead gen is bleeding
            <br className="hidden sm:block" /> your business dry.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mt-16 grid gap-6 md:grid-cols-3"
        >
          {painPoints.map((point) => (
            <motion.div
              key={point.title}
              variants={fadeUp}
              className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-8"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {point.title}.
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                {point.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="mt-12 text-center text-zinc-400 text-lg"
        >
          HomeField Hub changes the model.{" "}
          <span className="text-white font-medium">
            You only pay when someone shows up.
          </span>
        </motion.p>
      </div>
    </section>
  );
}
