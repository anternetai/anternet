const steps = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
        <path d="M16 8v8l5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: "Watch for the drop",
    description: "New batches go live weekly on Instagram and right here.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 16l6 6 10-12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="3" width="26" height="26" rx="4" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    title: "Claim your loaf",
    description: "Order through the form above or DM @bumblebreadclub.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 22c0-4 4-6 10-6s10 2 10 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="16" cy="12" rx="8" ry="5" stroke="currentColor" strokeWidth="2" />
        <path d="M12 12v-2M16 12V9M20 12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Pick up your bread",
    description: "Local Charlotte pickup — we'll text you the details.",
  },
]

export function HowItWorks() {
  return (
    <section className="px-6 py-16 md:py-24" style={{ backgroundColor: "var(--bb-cream-dark)" }}>
      <div className="max-w-xl mx-auto">
        <h2
          className="text-2xl md:text-3xl font-bold text-center mb-12"
          style={{ fontFamily: "var(--font-bb-heading)", color: "var(--bb-navy)" }}
        >
          How It Works
        </h2>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-5">
              <div
                className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--bb-cream)", color: "var(--bb-gold)" }}
              >
                {step.icon}
              </div>
              <div>
                <h3
                  className="text-lg font-bold mb-1"
                  style={{ fontFamily: "var(--font-bb-heading)", color: "var(--bb-navy)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "var(--font-bb-body)", color: "var(--bb-text-muted)" }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
