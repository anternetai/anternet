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
  visible: { transition: { staggerChildren: 0.1 } },
};

const resultMetrics = [
  "First appointment within 7 days",
  "5x ROI on ad spend",
  "Zero wasted budget",
];

export function SocialProof() {
  return (
    <section id="results" className="relative py-32 bg-[#050505]">
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
            Results
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white"
          >
            Contractors trust HomeField.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="mt-16 mx-auto max-w-2xl"
        >
          {/* Testimonial Card */}
          <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-8 md:p-10">
            {/* Stars */}
            <div className="flex gap-1 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className="h-5 w-5 text-orange-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <blockquote className="text-lg md:text-xl text-zinc-300 leading-relaxed italic">
              &ldquo;HomeField Hub brought us qualified roofing appointments
              within the first week. We paid for what showed — nothing else.
              That&apos;s the only model that makes sense.&rdquo;
            </blockquote>

            <div className="mt-6 border-t border-white/5 pt-6">
              <p className="text-sm font-medium text-white">
                Elite Contracting Group
              </p>
              <p className="text-sm text-zinc-500">
                Arizona Roofing Contractor
              </p>
            </div>
          </div>
        </motion.div>

        {/* Result Metrics */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mt-12 grid gap-4 sm:grid-cols-3"
        >
          {resultMetrics.map((metric) => (
            <motion.div
              key={metric}
              variants={fadeUp}
              className="rounded-xl border border-white/5 bg-[#0a0a0a] px-6 py-5 text-center"
            >
              <p className="text-sm font-medium text-white">{metric}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
