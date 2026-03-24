import Link from "next/link";

const techStack = [
  {
    category: "AI & Intelligence",
    items: [
      {
        name: "Claude (Anthropic)",
        role: "SMS lead qualification AI — 24/7 conversational follow-up",
        detail: "Haiku 3.5 for real-time SMS conversations. Learns from every interaction.",
      },
      {
        name: "GPT-4 (OpenAI)",
        role: "Call analysis & scoring engine",
        detail: "Grades every cold call on opener, pitch, objection handling, and close — automatically.",
      },
    ],
  },
  {
    category: "Infrastructure",
    items: [
      {
        name: "Supabase",
        role: "Real-time database & authentication",
        detail: "Every lead, appointment, call, and message is stored, queried, and tracked in real time.",
      },
      {
        name: "Next.js + Vercel",
        role: "Client portal & marketing platform",
        detail: "App Router, React Server Components, edge-deployed globally for sub-100ms response.",
      },
      {
        name: "n8n (Railway)",
        role: "Automation orchestration layer",
        detail: "14 active workflows handle lead ingestion, AI routing, follow-up, and daily reporting.",
      },
    ],
  },
  {
    category: "Communications",
    items: [
      {
        name: "Telnyx",
        role: "Primary voice & SMS (WebRTC)",
        detail: "Browser-based cold calling with call recording, real-time events, and 3 local numbers.",
      },
      {
        name: "Resend",
        role: "Transactional email",
        detail: "Onboarding sequences, client alerts, and appointment confirmations.",
      },
      {
        name: "Slack",
        role: "Real-time client notifications",
        detail: "Every qualified lead, booked appointment, and show triggers an instant Slack alert.",
      },
    ],
  },
  {
    category: "Lead Generation",
    items: [
      {
        name: "Meta Ads (Facebook/Instagram)",
        role: "Top-of-funnel lead capture",
        detail: "Native Lead Forms — no landing page required, friction-optimized for contractor audiences.",
      },
      {
        name: "Claude Code",
        role: "AI-native development environment",
        detail: "The entire HomeField Hub platform was built with AI-assisted development — faster iteration, higher code quality.",
      },
    ],
  },
];

const qualityLayers = [
  {
    number: "01",
    title: "Market Intelligence",
    description:
      "Before a single ad dollar is spent, we analyze your local market: search volume, competitor presence, seasonal patterns, and homeowner demographics. Your campaign is calibrated to your geography, not a generic template.",
  },
  {
    number: "02",
    title: "Audience Targeting",
    description:
      "Facebook's algorithm is pointed at homeowners who match your ideal customer profile — by income range, home value, recent life events, and behavioral signals. We're not buying impressions. We're buying intent.",
  },
  {
    number: "03",
    title: "AI Lead Qualification",
    description:
      "Every inbound lead triggers an automated SMS conversation powered by Claude AI. It qualifies intent, confirms service area, and gauges timeline — before the lead ever reaches you. Tire-kickers are filtered at the conversation layer.",
  },
  {
    number: "04",
    title: "Appointment Confirmation",
    description:
      "Booked appointments receive automated reminders via SMS and email at 24 hours and 2 hours before the scheduled time. No-show rates drop significantly with structured confirmation sequences.",
  },
  {
    number: "05",
    title: "Outcome-Based Billing",
    description:
      "You pay $200 per appointment that actually shows up. Not per lead. Not per booking. Per show. This forces every layer above to optimize for real-world results — because if they don't show, we don't get paid.",
  },
];

export default function CredentialsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-orange-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/call" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-white text-base">
              H
            </div>
            <span className="text-white font-semibold text-lg">
              <span className="text-orange-500">HomeField</span> Hub
            </span>
          </Link>
          <Link
            href="/call"
            className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
          >
            Book a Strategy Call
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-400 text-sm font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              AI-Native Lead Generation
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 tracking-tight">
              The Technology Behind{" "}
              <span className="text-orange-500">Qualified Appointments</span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Most marketing companies run ads and hope. We built an AI system
              that researches your market, qualifies every lead, and learns from
              every interaction — so you only pay for appointments that show.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/call"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 px-8 rounded-lg transition-colors"
              >
                See How AI-Powered Leads Are Different
              </Link>
              <a
                href="#tech-stack"
                className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-3.5 px-8 rounded-lg transition-colors border border-zinc-700"
              >
                Explore the Stack
              </a>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-zinc-800/60 bg-zinc-900/30">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-orange-500 mb-1">AI</div>
                <div className="text-sm text-zinc-400">Native architecture — not a plugin</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-500 mb-1">5</div>
                <div className="text-sm text-zinc-400">Quality layers per appointment</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-500 mb-1">24/7</div>
                <div className="text-sm text-zinc-400">AI lead qualification, always on</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-500 mb-1">$0</div>
                <div className="text-sm text-zinc-400">Retainer — pay per showed appointment</div>
              </div>
            </div>
          </div>
        </section>

        {/* Why AI Matters */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-orange-500 font-medium text-sm uppercase tracking-wider mb-3">
                Why AI Matters for Your Leads
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                The difference between a lead and a customer is{" "}
                <span className="text-orange-500">what happens in between</span>
              </h2>
              <p className="text-zinc-400 leading-relaxed mb-6">
                Traditional marketing agencies generate form fills. You get a
                name and a number, and then it's on you to chase them down.
                Most never answer. Most were never serious.
              </p>
              <p className="text-zinc-400 leading-relaxed mb-6">
                AI-powered lead generation is fundamentally different. The
                system qualifies intent before the lead reaches you —
                automatically, at scale, without a human on your side making
                calls.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                When you get a lead from HomeField Hub, it has already had a
                conversation with our AI, confirmed its service area, and
                expressed intent to move forward. You're not chasing. You're
                closing.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "Traditional Agency",
                  items: [
                    "Pays for clicks and impressions",
                    "Sends you every form fill",
                    "Charges monthly retainer regardless of results",
                    "No qualification before handoff",
                    "Your team chases leads all day",
                  ],
                  variant: "bad",
                },
                {
                  label: "HomeField Hub",
                  items: [
                    "AI qualifies intent before handoff",
                    "You only see appointment-ready leads",
                    "$200 per showed appointment — nothing else",
                    "24/7 automated follow-up and reminders",
                    "Every lead filtered through 5 quality layers",
                  ],
                  variant: "good",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`rounded-xl p-6 border ${
                    card.variant === "good"
                      ? "bg-orange-500/5 border-orange-500/20"
                      : "bg-zinc-900/50 border-zinc-800"
                  }`}
                >
                  <div
                    className={`text-sm font-semibold mb-3 ${
                      card.variant === "good"
                        ? "text-orange-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {card.label}
                  </div>
                  <ul className="space-y-2">
                    {card.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 flex-shrink-0 ${
                            card.variant === "good"
                              ? "text-orange-500"
                              : "text-zinc-600"
                          }`}
                        >
                          {card.variant === "good" ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                        <span
                          className={`text-sm ${
                            card.variant === "good"
                              ? "text-zinc-300"
                              : "text-zinc-500"
                          }`}
                        >
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5-Layer Quality System */}
        <section className="bg-zinc-900/30 border-y border-zinc-800/60">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-14">
              <p className="text-orange-500 font-medium text-sm uppercase tracking-wider mb-3">
                Our Technology
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                5-Layer Quality Assurance
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                Every appointment you receive has passed through five
                independently verified layers of quality control. This is the
                system, not the pitch.
              </p>
            </div>

            <div className="space-y-4">
              {qualityLayers.map((layer) => (
                <div
                  key={layer.number}
                  className="flex gap-6 bg-zinc-950/50 rounded-xl p-6 border border-zinc-800/60 group hover:border-orange-500/20 transition-colors"
                >
                  <div className="flex-shrink-0 text-orange-500/30 font-mono text-4xl font-bold leading-none group-hover:text-orange-500/50 transition-colors">
                    {layer.number}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{layer.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {layer.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section id="tech-stack" className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <p className="text-orange-500 font-medium text-sm uppercase tracking-wider mb-3">
              Built on Enterprise Infrastructure
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The Technology Stack
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              HomeField Hub is an AI-native operation — not an agency that added
              AI to an existing playbook. Every tool in this stack was chosen to
              give contractors an unfair advantage.
            </p>
          </div>

          <div className="space-y-10">
            {techStack.map((category) => (
              <div key={category.category}>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4 pb-2 border-b border-zinc-800/60">
                  {category.category}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {category.items.map((item) => (
                    <div
                      key={item.name}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-semibold text-white">{item.name}</h4>
                        <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                          Active
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mb-1.5 font-medium">
                        {item.role}
                      </p>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Claude Certified Architect Badge Placeholder */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700/60 rounded-2xl p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Badge Placeholder */}
              <div className="flex-shrink-0">
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-2 border-orange-500/30 border-dashed flex flex-col items-center justify-center gap-2 text-center">
                  <svg
                    className="w-8 h-8 text-orange-500/60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                  <span className="text-[10px] text-orange-500/60 font-medium leading-tight px-1">
                    Badge Coming
                  </span>
                </div>
              </div>

              {/* Copy */}
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 text-orange-400 text-xs font-medium mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  Certification in progress
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Claude Certified Architect
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
                  HomeField Hub is completing Anthropic's official Claude
                  Architect certification program — validating expertise in
                  multi-agent AI systems, prompt engineering, and responsible AI
                  deployment. Targeting completion Q2 2026.
                </p>
                <p className="text-zinc-600 text-xs mt-3">
                  Certification issued by Anthropic via the Anthropic Academy
                </p>
              </div>

              {/* Right side info */}
              <div className="md:ml-auto flex-shrink-0 text-center">
                <div className="text-xs text-zinc-500 mb-1">Issued by</div>
                <div className="text-sm font-semibold text-zinc-300">Anthropic</div>
                <div className="text-xs text-zinc-600 mt-3">Target date</div>
                <div className="text-sm font-semibold text-zinc-300">April 2026</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-t border-orange-500/20">
          <div className="max-w-4xl mx-auto px-6 py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to see what AI-powered leads feel like?
            </h2>
            <p className="text-zinc-400 mb-8 text-lg max-w-2xl mx-auto">
              No retainer. No contract. $200 per appointment that actually
              shows — and every lead filtered through 5 layers of AI quality
              control before it reaches you.
            </p>
            <Link
              href="/call"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-10 rounded-lg transition-colors text-lg"
            >
              Book a Strategy Call
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
            <p className="text-zinc-600 text-sm mt-4">
              30-minute call. No pitch deck. Just an honest conversation about
              your market.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-zinc-500 text-sm">
            HomeField Hub — AI-Native Lead Generation for Home Service Contractors
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-600">
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">
              Terms
            </Link>
            <Link href="/call" className="hover:text-zinc-400 transition-colors">
              Book a Call
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
