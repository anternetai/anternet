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
  visible: { transition: { staggerChildren: 0.08 } },
};

const features = [
  {
    icon: "🎯",
    title: "Precision Ad Targeting",
    desc: "We find homeowners in your market who are actively searching for your service.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Follow-Up",
    desc: "Automated SMS and voice follow-up converts cold leads into booked appointments.",
  },
  {
    icon: "📅",
    title: "Calendar Integration",
    desc: "Appointments land directly on your Google Calendar. No back-and-forth.",
  },
  {
    icon: "📊",
    title: "Real-Time Dashboard",
    desc: "See every lead, call, and appointment in your client portal.",
  },
  {
    icon: "🔒",
    title: "Exclusive Leads",
    desc: "Every lead is yours. We never sell the same lead to competitors.",
  },
  {
    icon: "⚡",
    title: "48-Hour Launch",
    desc: "We can have your campaigns live within 48 hours of onboarding.",
  },
];

export function FeaturesGrid() {
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
            What&apos;s Included
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white"
          >
            Everything you need to scale.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              className="group rounded-2xl border border-white/5 bg-[#0a0a0a] p-8 transition-all duration-300 hover:border-orange-500/20"
            >
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
