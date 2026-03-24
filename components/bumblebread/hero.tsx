import Image from "next/image"
import { BeeDecoration } from "./bee-decoration"

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 py-16 text-center overflow-hidden">
      {/* Background bread photo — subtle */}
      <div className="absolute inset-0 opacity-[0.07]">
        <Image
          src="/bumblebread/hero-bread.webp"
          alt=""
          fill
          className="object-cover"
          priority
          aria-hidden="true"
        />
      </div>

      {/* Decorative bee */}
      <div className="absolute top-12 right-8 md:right-16">
        <BeeDecoration className="w-10 h-10 md:w-12 md:h-12" />
      </div>

      {/* Logo */}
      <div className="relative mb-8 w-full max-w-xs mx-auto">
        <Image
          src="/bumblebread/logo-full.jpg"
          alt="The Bumblebread Club"
          width={400}
          height={400}
          className="w-full h-auto rounded-2xl"
          priority
        />
      </div>

      {/* Tagline */}
      <p
        className="relative text-lg md:text-xl max-w-md mx-auto mb-10 leading-relaxed"
        style={{
          fontFamily: "var(--font-bb-body)",
          color: "var(--bb-text-muted)",
        }}
      >
        A microbakery offering weekly limited sourdough
      </p>

      {/* CTA */}
      <a
        href="#batch"
        className="relative inline-block px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          fontFamily: "var(--font-bb-body)",
          backgroundColor: "var(--bb-navy)",
          color: "var(--bb-cream)",
        }}
      >
        See This Week&apos;s Batch
      </a>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-40">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  )
}
