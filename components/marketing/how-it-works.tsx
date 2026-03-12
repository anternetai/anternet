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
  visible: { transition: { staggerChildren: 0.15 } },
};

const steps = [
  {
    num: "01",
    title: "We Run the Ads",
    desc: "Targeted Meta and Google campaigns in your specific market. We write the copy, design the creatives, manage the spend.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "AI Qualifies & Books",
    desc: "Our AI system follows up instantly, qualifies the homeowner, and books them directly to your calendar.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "You Show Up & Close",
    desc: "Attend the appointment. Close the job. Pay $200 only if they showed up.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 bg-[#050505]">
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
            The System
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white"
          >
            Three steps to a full calendar.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mt-20 relative"
        >
          {/* Dashed connector line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-zinc-800 hidden md:block" />

          <div className="grid gap-12 md:gap-16">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                className={`flex flex-col md:flex-row items-center gap-8 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Content */}
                <div
                  className={`flex-1 ${
                    i % 2 === 1 ? "md:text-right" : "md:text-left"
                  } text-center md:text-left`}
                >
                  <div
                    className={`inline-flex items-center gap-3 ${
                      i % 2 === 1 ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    <span className="text-xs font-mono text-zinc-600">
                      {step.num}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-300">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-zinc-400 leading-relaxed max-w-md">
                    {step.desc}
                  </p>
                </div>

                {/* Center dot */}
                <div className="relative z-10 flex h-4 w-4 items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-orange-500/20 ring-2 ring-orange-500/40" />
                  <div className="absolute h-1.5 w-1.5 rounded-full bg-orange-500" />
                </div>

                {/* Spacer */}
                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
