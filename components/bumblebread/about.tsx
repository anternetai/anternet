import Image from "next/image"
import { BeeDecoration } from "./bee-decoration"

export function About() {
  return (
    <section className="px-6 py-16 md:py-24" style={{ backgroundColor: "var(--bb-cream-dark)" }}>
      <div className="max-w-xl mx-auto text-center">
        <BeeDecoration className="w-8 h-8 mx-auto mb-6" />

        <h2
          className="text-2xl md:text-3xl font-bold mb-6"
          style={{ fontFamily: "var(--font-bb-heading)", color: "var(--bb-navy)" }}
        >
          About The Club
        </h2>

        {/* Baking photo */}
        <div className="rounded-2xl overflow-hidden mb-8 max-w-sm mx-auto">
          <Image
            src="/bumblebread/about-baking.webp"
            alt="Hands shaping sourdough bread dough"
            width={480}
            height={360}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>

        <div
          className="space-y-4 text-base leading-relaxed"
          style={{ fontFamily: "var(--font-bb-body)", color: "var(--bb-text-muted)" }}
        >
          <p>
            The Bumblebread Club started with a simple love for sourdough &mdash;
            the slow ferment, the golden crust, the way a warm loaf brings people together.
          </p>
          <p>
            Every loaf is handmade in small batches using quality ingredients and a whole lot of patience.
            No shortcuts, no preservatives, just real bread the way it&apos;s meant to be.
          </p>
          <p>
            The names? They each have a story. Doja, Ed, Livet &mdash; every loaf is named
            for someone or something that inspires the bake. That&apos;s what makes this a club, not just a bakery.
          </p>
        </div>

        <p
          className="mt-8 text-lg italic"
          style={{ fontFamily: "var(--font-bb-accent)", color: "var(--bb-gold)", fontSize: "1.25rem" }}
        >
          A microbakery born from love of sourdough and community
        </p>
      </div>
    </section>
  )
}
