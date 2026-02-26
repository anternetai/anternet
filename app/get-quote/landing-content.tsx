"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Shield,
  Star,
  MapPin,
  CheckCircle,
  Phone,
  ChevronRight,
} from "lucide-react"
import {
  SERVICES,
  REVIEWS,
  SERVICE_OPTIONS,
  PROPERTY_TYPES,
  TIMELINES,
} from "@/lib/squeegee/landing-data"

// Brand colors
const TEAL = "oklch(0.5_0.18_210)"
const TEAL_HOVER = "oklch(0.45_0.18_210)"

export function LandingContent() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const [selectedService, setSelectedService] = useState("")
  const [propertyType, setPropertyType] = useState("")
  const [timeline, setTimeline] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")

  const totalSteps = 4
  const progress = ((step - 1) / (totalSteps - 1)) * 100

  async function handleSubmit() {
    if (!name.trim() || !phone.trim() || !address.trim()) return
    setLoading(true)

    try {
      await fetch("/api/squeegee/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim(),
          services: [selectedService],
          property_type: propertyType,
          timeline,
          utm_source: searchParams.get("utm_source") ?? undefined,
          utm_medium: searchParams.get("utm_medium") ?? undefined,
          utm_campaign: searchParams.get("utm_campaign") ?? undefined,
        }),
      })
      setSubmitted(true)
    } catch (err) {
      console.error("Submit error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <span className="text-lg font-bold tracking-tight">
            Dr.&nbsp;<span style={{ color: TEAL }}>Squeegee</span>
          </span>
          <a
            href="tel:+19802428048"
            className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: TEAL }}
          >
            <Phone className="h-4 w-4" />
            (980) 242-8048
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-[oklch(0.15_0.05_210)] to-zinc-950" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
            Charlotte&apos;s Trusted{" "}
            <span style={{ color: TEAL }}>Pressure Washing</span> Pros
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
            House washing, driveways, patios — done right, every time.
          </p>
          <a
            href="#get-quote"
            className="inline-flex items-center gap-2 text-white font-semibold py-3.5 px-8 rounded-lg text-lg transition-colors"
            style={{ backgroundColor: TEAL }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = TEAL_HOVER)
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = TEAL)
            }
          >
            Get Your Free Quote
            <ChevronRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="border-y border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-zinc-300">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: TEAL }} />
            Licensed &amp; Insured
          </span>
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            5-Star Rated
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: TEAL }} />
            Charlotte, NC
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" style={{ color: TEAL }} />
            Free Estimates
          </span>
        </div>
      </section>

      {/* ── Services Grid ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          Our Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((svc) => {
            const Icon = svc.icon
            return (
              <div
                key={svc.name}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
              >
                <Icon className="h-8 w-8 mb-3" style={{ color: TEAL }} />
                <h3 className="font-semibold text-base mb-1">{svc.name}</h3>
                <p className="text-sm text-zinc-400">{svc.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="bg-zinc-900/40 border-y border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            What Our Customers Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REVIEWS.map((r) => (
              <div
                key={r.name}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 mb-3 leading-relaxed">
                  &ldquo;{r.text}&rdquo;
                </p>
                <p className="text-xs text-zinc-500">
                  {r.name} &middot; {r.neighborhood}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Multi-Step Quote Form ── */}
      <section id="get-quote" className="max-w-xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
          Get Your Free Quote
        </h2>
        <p className="text-zinc-400 text-center mb-8">
          Takes less than 60 seconds.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-8">
          {/* Progress bar */}
          {!submitted && (
            <div className="mb-6">
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: TEAL }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2 text-center">
                Step {step} of {totalSteps}
              </p>
            </div>
          )}

          {submitted ? (
            /* ── Confirmation ── */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">You&apos;re All Set!</h3>
              <p className="text-zinc-400">
                We&apos;ll call you within 2 hours to discuss your project.
              </p>
            </div>
          ) : step === 1 ? (
            /* ── Step 1: Service ── */
            <div>
              <h3 className="text-lg font-semibold mb-1 text-center">
                What do you need cleaned?
              </h3>
              <p className="text-sm text-zinc-500 mb-5 text-center">
                Select one to continue.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_OPTIONS.map((svc) => (
                  <button
                    key={svc}
                    onClick={() => {
                      setSelectedService(svc)
                      setStep(2)
                    }}
                    className="py-3 px-4 rounded-lg border border-zinc-700 bg-zinc-800 hover:border-zinc-500 transition-colors text-sm font-medium text-left"
                  >
                    {svc}
                  </button>
                ))}
              </div>
            </div>
          ) : step === 2 ? (
            /* ── Step 2: Property Type ── */
            <div>
              <h3 className="text-lg font-semibold mb-1 text-center">
                What type of property?
              </h3>
              <p className="text-sm text-zinc-500 mb-5 text-center">
                Helps us give you an accurate quote.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PROPERTY_TYPES.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => {
                      setPropertyType(pt)
                      setStep(3)
                    }}
                    className="py-3 px-4 rounded-lg border border-zinc-700 bg-zinc-800 hover:border-zinc-500 transition-colors text-sm font-medium text-left"
                  >
                    {pt}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="mt-4 text-zinc-500 hover:text-white text-sm"
              >
                &larr; Back
              </button>
            </div>
          ) : step === 3 ? (
            /* ── Step 3: Timeline ── */
            <div>
              <h3 className="text-lg font-semibold mb-1 text-center">
                When do you need this done?
              </h3>
              <p className="text-sm text-zinc-500 mb-5 text-center">
                No commitment — just helps us plan.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {TIMELINES.map((tl) => (
                  <button
                    key={tl}
                    onClick={() => {
                      setTimeline(tl)
                      setStep(4)
                    }}
                    className="py-3 px-4 rounded-lg border border-zinc-700 bg-zinc-800 hover:border-zinc-500 transition-colors text-sm font-medium text-left"
                  >
                    {tl}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="mt-4 text-zinc-500 hover:text-white text-sm"
              >
                &larr; Back
              </button>
            </div>
          ) : (
            /* ── Step 4: Contact Info ── */
            <div>
              <h3 className="text-lg font-semibold mb-1 text-center">
                Where should we send your quote?
              </h3>
              <p className="text-sm text-zinc-500 mb-5 text-center">
                We&apos;ll call you — no spam, ever.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-[oklch(0.5_0.18_210)] text-sm"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-[oklch(0.5_0.18_210)] text-sm"
                    placeholder="(704) 555-1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Email <span className="text-zinc-600">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-[oklch(0.5_0.18_210)] text-sm"
                    placeholder="john@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Address or Zip <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-[oklch(0.5_0.18_210)] text-sm"
                    placeholder="123 Main St, Charlotte NC or 28214"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={
                    !name.trim() || !phone.trim() || !address.trim() || loading
                  }
                  className="w-full font-semibold py-3.5 rounded-lg transition-colors text-white disabled:bg-zinc-700 disabled:cursor-not-allowed"
                  style={
                    !name.trim() || !phone.trim() || !address.trim() || loading
                      ? undefined
                      : { backgroundColor: TEAL }
                  }
                  onMouseOver={(e) => {
                    if (!e.currentTarget.disabled)
                      e.currentTarget.style.backgroundColor = TEAL_HOVER
                  }}
                  onMouseOut={(e) => {
                    if (!e.currentTarget.disabled)
                      e.currentTarget.style.backgroundColor = TEAL
                  }}
                >
                  {loading ? "Sending..." : "Get My Free Quote"}
                </button>
              </div>
              <button
                onClick={() => setStep(3)}
                className="mt-4 text-zinc-500 hover:text-white text-sm"
              >
                &larr; Back
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800 py-6 px-4">
        <div className="max-w-4xl mx-auto text-center text-zinc-500 text-sm space-y-1">
          <p>Dr. Squeegee LLC</p>
          <p>8623 Longnor St, Charlotte, NC 28214</p>
          <p>
            <a
              href="tel:+19802428048"
              className="hover:text-white transition-colors"
            >
              (980) 242-8048
            </a>
          </p>
        </div>
      </footer>
    </>
  )
}
