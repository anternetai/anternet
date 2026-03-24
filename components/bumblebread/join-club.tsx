"use client"

import { useState } from "react"

export function JoinClub() {
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [smsOptIn, setSmsOptIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("Please enter your email.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/bumblebread/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          phone: smsOptIn ? phone.trim() : null,
          sms_opt_in: smsOptIn && !!phone.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to subscribe")
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="px-6 py-16 md:py-24 max-w-xl mx-auto text-center">
      <h2
        className="text-2xl md:text-3xl font-bold mb-3"
        style={{ fontFamily: "var(--font-bb-heading)", color: "var(--bb-navy)" }}
      >
        Never Miss a Batch Drop
      </h2>
      <p
        className="text-sm mb-8"
        style={{ fontFamily: "var(--font-bb-body)", color: "var(--bb-text-muted)" }}
      >
        Join the club &mdash; get notified when new batches go live.
      </p>

      {success ? (
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: "var(--bb-cream-dark)" }}
        >
          <p
            className="text-lg font-semibold mb-1"
            style={{ fontFamily: "var(--font-bb-heading)", color: "var(--bb-navy)" }}
          >
            Welcome to the club!
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: "var(--font-bb-body)", color: "var(--bb-text-muted)" }}
          >
            You&apos;ll be the first to know when fresh bread drops.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-full border text-center text-base outline-none transition-colors"
            style={{
              fontFamily: "var(--font-bb-body)",
              borderColor: "var(--bb-cream-dark)",
              backgroundColor: "white",
              color: "var(--bb-text)",
            }}
          />

          {/* SMS opt-in */}
          <div className="text-left">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={smsOptIn}
                onChange={(e) => setSmsOptIn(e.target.checked)}
                className="rounded"
              />
              <span
                className="text-sm"
                style={{ fontFamily: "var(--font-bb-body)", color: "var(--bb-text-muted)" }}
              >
                Also text me batch drops
              </span>
            </label>
          </div>

          {smsOptIn && (
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(704) 555-1234"
              className="w-full px-4 py-3 rounded-full border text-center text-base outline-none transition-colors"
              style={{
                fontFamily: "var(--font-bb-body)",
                borderColor: "var(--bb-cream-dark)",
                backgroundColor: "white",
                color: "var(--bb-text)",
              }}
            />
          )}

          {error && (
            <p className="text-sm text-red-600" style={{ fontFamily: "var(--font-bb-body)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-full font-semibold text-base transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            style={{
              fontFamily: "var(--font-bb-body)",
              backgroundColor: "var(--bb-gold)",
              color: "var(--bb-navy)",
            }}
          >
            {submitting ? "Joining..." : "Join The Club"}
          </button>
        </form>
      )}
    </section>
  )
}
