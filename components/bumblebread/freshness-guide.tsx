import Image from "next/image"

const tips = [
  {
    step: "Slice it",
    detail: "Slice the whole loaf when you get home — even if you're not eating it all today.",
  },
  {
    step: "Bag it",
    detail: "Place slices in a Ziplock bag, squeeze out the air, and freeze.",
  },
  {
    step: "Freeze it",
    detail: "Sourdough freezes beautifully for up to 3 months. Pull slices as you need them.",
  },
  {
    step: "Reheat it",
    detail: "Air Fryer at 400\u00B0F for 2\u20135 minutes. Toaster works too. Tastes fresh-baked every time.",
  },
]

export function FreshnessGuide() {
  return (
    <section className="px-6 py-16 md:py-24 max-w-xl mx-auto">
      <h2
        className="text-2xl md:text-3xl font-bold text-center mb-4"
        style={{ fontFamily: "var(--font-bb-heading)", color: "var(--bb-navy)" }}
      >
        Keeping Your Sourdough Fresh
      </h2>
      <p
        className="text-center text-sm mb-8"
        style={{ fontFamily: "var(--font-bb-accent)", color: "var(--bb-text-muted)", fontSize: "1rem" }}
      >
        Make every slice taste like it just came out of the oven
      </p>

      {/* Freshness photo */}
      <div className="rounded-2xl overflow-hidden mb-10">
        <Image
          src="/bumblebread/freshness-guide.webp"
          alt="Sliced sourdough bread on a cutting board"
          width={600}
          height={400}
          className="w-full h-auto"
          loading="lazy"
        />
      </div>

      <div className="space-y-6">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                fontFamily: "var(--font-bb-heading)",
                backgroundColor: "var(--bb-gold)",
                color: "var(--bb-navy)",
              }}
            >
              {i + 1}
            </div>
            <div>
              <h3
                className="font-bold mb-0.5"
                style={{ fontFamily: "var(--font-bb-heading)", color: "var(--bb-navy)" }}
              >
                {tip.step}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: "var(--font-bb-body)", color: "var(--bb-text-muted)" }}
              >
                {tip.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
