import Image from "next/image"
import { BeeDecoration } from "./bee-decoration"

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-between px-6 pt-12 pb-8 text-center overflow-hidden">
      {/* Background bread photo — very subtle texture */}
      <div className="absolute inset-0 opacity-[0.05]">
        <Image
          src="/bumblebread/hero-bread.webp"
          alt=""
          fill
          className="object-cover"
          priority
          aria-hidden="true"
        />
      </div>

      {/* Floating bees */}
      <div className="absolute top-16 right-6 md:right-20">
        <BeeDecoration className="w-8 h-8" />
      </div>
      <div className="absolute top-44 left-4 md:left-16 opacity-60">
        <BeeDecoration className="w-6 h-6" />
      </div>

      {/* Top — The name comes FIRST */}
      <div className="relative z-10 mt-4">
        <p
          className="text-sm tracking-[0.3em] uppercase mb-3 opacity-60"
          style={{ fontFamily: "var(--font-bb-body)", color: "var(--bb-navy)" }}
        >
          Welcome to
        </p>
        <h1
          className="text-4xl md:text-6xl font-black leading-[1.1] mb-2"
          style={{ fontFamily: "var(--font-bb-heading)", color: "var(--bb-navy)" }}
        >
          The<br />
          Bumblebread<br />
          Club
        </h1>
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className="h-px w-10" style={{ backgroundColor: "var(--bb-gold)" }} />
          <BeeDecoration className="w-5 h-5" />
          <span className="h-px w-10" style={{ backgroundColor: "var(--bb-gold)" }} />
        </div>
      </div>

      {/* Middle — Mascot walking naturally in the flow */}
      <div className="relative z-10 flex-1 flex items-center justify-center -my-2">
        <div className="w-44 md:w-52">
          <Image
            src="/bumblebread/logo-full-t.webp"
            alt="The Bumblebread Club mascot"
            width={400}
            height={768}
            className="w-full h-auto drop-shadow-sm"
            priority
          />
        </div>
      </div>

      {/* Bottom — Tagline + CTA */}
      <div className="relative z-10 space-y-6">
        <p
          className="text-lg md:text-xl max-w-xs mx-auto leading-relaxed italic"
          style={{
            fontFamily: "var(--font-bb-accent)",
            color: "var(--bb-text-muted)",
            fontSize: "1.2rem",
          }}
        >
          A microbakery offering weekly limited sourdough
        </p>

        <a
          href="#batch"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg"
          style={{
            fontFamily: "var(--font-bb-body)",
            backgroundColor: "var(--bb-navy)",
            color: "var(--bb-cream)",
          }}
        >
          See This Week&apos;s Batch
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3v10M3 8l5 5 5-5" />
          </svg>
        </a>
      </div>
    </section>
  )
}
