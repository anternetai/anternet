"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

function useCounter(target: number, duration = 2000, inView: boolean) {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!inView || hasRun.current) return;
    hasRun.current = true;

    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return count;
}

interface StatItemProps {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  inView: boolean;
}

function StatItem({ value, prefix = "", suffix = "", label, inView }: StatItemProps) {
  const count = useCounter(value, 1800, inView);

  return (
    <div className="flex flex-col items-center gap-1 px-6 py-8">
      <span className="text-4xl md:text-5xl font-bold tracking-tight text-white">
        {prefix}
        {count}
        {suffix}
      </span>
      <span className="text-sm text-zinc-500">{label}</span>
    </div>
  );
}

const stats = [
  { value: 40, suffix: "+", label: "Appointments Delivered" },
  { value: 200, prefix: "$", label: "Per Showed Appointment" },
  { value: 0, prefix: "$", label: "Monthly Retainer" },
  { value: 48, suffix: "hr", label: "Launch Timeline" },
];

export function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative border-y border-white/5 bg-[#080808]">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5"
        >
          {stats.map((stat) => (
            <StatItem
              key={stat.label}
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              label={stat.label}
              inView={inView}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
