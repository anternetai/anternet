"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#050505]/80 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-0.5">
          <span className="text-lg font-bold tracking-tight text-white">
            HomeField{" "}
            <span className="text-orange-500">Hub</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a
            href="#how-it-works"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            How It Works
          </a>
          <a
            href="#results"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Results
          </a>
          <a
            href="#pricing"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Pricing
          </a>
          <a
            href="/blog"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Resources
          </a>
        </div>

        <Link
          href="/call"
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-medium text-[#050505] hover:bg-zinc-200 transition-colors"
        >
          Book a Call
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </nav>
  );
}
