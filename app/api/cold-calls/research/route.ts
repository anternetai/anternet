/**
 * POST /api/cold-calls/research
 *
 * Generates personalized pre-call research briefs for a list of dialer_lead IDs.
 * Each brief includes trade-specific pain points, personalization hooks, and a
 * suggested opener. No external calls — all generated from our own playbook data
 * so there's zero latency hit during a session.
 *
 * Body: { lead_ids: string[] }
 * Returns: { briefs: ResearchBrief[] }
 */

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResearchBrief {
  lead_id: string
  business_name: string | null
  trade: string | null
  phone: string | null
  location: string | null
  pain_points: string[]
  personalization_hooks: string[]
  suggested_opener: string
  prior_call_count: number
  last_outcome: string | null
  last_called_at: string | null
}

// ─── Trade Playbook ───────────────────────────────────────────────────────────
// Pain points and hooks keyed by normalized trade vertical.
// Pulled from field experience — update as you learn more.

interface TradeBrief {
  pain_points: string[]
  hooks: string[]
  opener_template: string
}

const TRADE_PLAYBOOK: Record<string, TradeBrief> = {
  roofing: {
    pain_points: [
      "Storm season creates feast-or-famine revenue swings",
      "Insurance adjuster fights eat into margins",
      "Word-of-mouth dries up in winter months",
      "Competing crews lowball on every estimate",
      "No consistent pipeline — always chasing the next job",
    ],
    hooks: [
      "Roofing is one of the highest-converting trades for Facebook lead ads",
      "Storm-damaged homeowners are actively searching — most contractors miss them",
      "Exclusive leads mean you're not bidding against 5 other guys from the same list",
    ],
    opener_template:
      "Hey [Name], this is Anthony over at HomeField Hub. I work specifically with roofing contractors to fill their calendar with exclusive storm and replacement leads — no shared leads, no monthly retainer. Got 90 seconds?",
  },
  hvac: {
    pain_points: [
      "Seasonal demand spikes make staffing and scheduling chaotic",
      "Service agreement renewals are hard to track manually",
      "Emergency call volume unpredictable — hard to staff for",
      "New install leads dominated by big box retailers and franchises",
      "Reviews and reputation are everything but hard to systematize",
    ],
    hooks: [
      "HVAC homeowners have high urgency — broken AC in July = immediate buyer",
      "Maintenance agreement upsells are easy to automate after initial booking",
      "We target homeowners by equipment age — catch them before they call a competitor",
    ],
    opener_template:
      "Hey [Name], Anthony from HomeField Hub. We run Facebook ads that bring in HVAC service and replacement leads — exclusive to one contractor per area. Worth 90 seconds to see if your market's available?",
  },
  plumbing: {
    pain_points: [
      "Emergency jobs pay well but are impossible to predict or market to",
      "Scheduled service bookings are thin without a consistent lead source",
      "Homeowners often call multiple plumbers — hard to win on price alone",
      "Google Ads are expensive and dominated by big national franchises",
      "Technician time gets eaten by no-shows and tire-kickers",
    ],
    hooks: [
      "We pre-qualify leads before they hit your calendar — no tire-kickers",
      "Remodels and water heater replacements are high-ticket and easy to target",
      "Our AI follows up with leads instantly so no opportunity goes cold",
    ],
    opener_template:
      "Hey [Name], this is Anthony over at HomeField Hub. We help plumbing contractors book more scheduled service calls — exclusive leads, AI follow-up, no retainer. Quick 90 seconds?",
  },
  electrical: {
    pain_points: [
      "Panel upgrades and EV charger installs are high demand but hard to find buyers",
      "Permit-heavy work scares off cheap competition but needs consistent pipeline",
      "Residential electrical is relationship-based — hard to scale through referrals alone",
      "Insurance inspections create an unpredictable busy season",
      "Homeowners don't know who to trust — reviews are critical",
    ],
    hooks: [
      "Panel upgrades average $3,500+ — one booked job pays for months of ad spend",
      "EV charger installs are exploding — most electricians aren't marketing to EV owners yet",
      "We filter for homeowners, not renters — only leads who can actually authorize the work",
    ],
    opener_template:
      "Hey [Name], Anthony from HomeField Hub. I work with electrical contractors on exclusive lead gen — panel upgrades, EV chargers, service calls. No retainer, you only pay per booked appointment. 90 seconds?",
  },
  pressure_washing: {
    pain_points: [
      "Highly seasonal — spring surge then summer slowdown",
      "Low ticket average means volume is everything",
      "Competitors race to the bottom on price",
      "Equipment-intensive with high fuel and chemical costs",
      "Most leads come from door-knocking or yard signs — not scalable",
    ],
    hooks: [
      "Recurring maintenance packages are easy to upsell after the first job",
      "Before/after photos go viral on Facebook — great creative content built in",
      "Neighborhoods cluster — one booked job can seed an entire subdivision",
    ],
    opener_template:
      "Hey [Name], this is Anthony at HomeField Hub. We run Facebook lead ads for pressure washing contractors — exclusive to your area, zero monthly retainer. I'll keep it fast — got 90 seconds?",
  },
  landscaping: {
    pain_points: [
      "Winter kills revenue — no consistent year-round income",
      "Residential clients are price-sensitive and churn fast",
      "Labor is the biggest cost and hardest to plan when jobs are inconsistent",
      "Most new clients come from driving neighborhoods and knocking — slow and exhausting",
      "HOA and commercial contracts are hard to break into",
    ],
    hooks: [
      "Recurring lawn care clients are worth 10x a one-time job over a year",
      "Spring onboarding season = massive demand — get ahead of it now",
      "We book the free estimate consultation, you show up and close",
    ],
    opener_template:
      "Hey [Name], Anthony from HomeField Hub. We help landscaping contractors build a recurring client base through Facebook ads and AI follow-up — no retainer, you pay per showed appointment. Quick 90 seconds?",
  },
  painting: {
    pain_points: [
      "Estimating is time-intensive and most estimates don't close",
      "Interior vs exterior demand shifts seasonally — hard to stay booked year-round",
      "New construction is competitive and margins are thin",
      "Customer acquisition is almost entirely word-of-mouth or repeat — not scalable",
      "Weather cancellations create costly scheduling gaps",
    ],
    hooks: [
      "Pre-qualified homeowners mean fewer drive-out estimates that go nowhere",
      "Interior painting is a year-round category — good for off-season stability",
      "We target homeowners 2-5 years into ownership — prime repainting window",
    ],
    opener_template:
      "Hey [Name], this is Anthony over at HomeField Hub. I work with painting contractors on exclusive lead gen — pre-qualified homeowners, AI-booked appointments, no monthly retainer. Got 90 seconds?",
  },
  fencing: {
    pain_points: [
      "Material costs are volatile — hard to lock in estimates",
      "Permit requirements slow down jobs and frustrate clients",
      "Seasonal demand spikes are hard to staff for",
      "Lead quality from Angi and HomeAdvisor is notoriously low",
      "Long install windows mean fewer jobs per crew per week",
    ],
    hooks: [
      "Fencing is high-ticket — average job $3k-$8k — one close covers weeks of ad spend",
      "Privacy fence demand has exploded post-COVID as more people work from home",
      "Exclusive leads mean you're not in a bidding war with 3 other fence companies",
    ],
    opener_template:
      "Hey [Name], Anthony from HomeField Hub. We bring fencing contractors exclusive install leads — private homeowners, not Angi leads, no retainer. Quick 90 seconds to see if your market's open?",
  },
  default: {
    pain_points: [
      "Most revenue comes from word-of-mouth — hard to predict or scale",
      "Seasonal slowdowns create cashflow stress",
      "Lead services like Angi and HomeAdvisor sell the same lead to 5 competitors",
      "No time to manage marketing on top of running jobs",
      "Growth is stuck because the owner is the marketer, estimator, and technician",
    ],
    hooks: [
      "Exclusive leads — you're the only contractor who gets each one",
      "AI handles follow-up so you're not chasing people manually",
      "No retainer — you only pay $200 per appointment that actually shows",
    ],
    opener_template:
      "Hey [Name], this is Anthony over at HomeField Hub. We run Facebook ads for home service contractors — exclusive leads, AI follow-up, you only pay per showed appointment. Worth 90 seconds?",
  },
}

function normalizeTrade(trade: string | null): string {
  if (!trade) return "default"
  const t = trade.toLowerCase()
  if (t.includes("roof")) return "roofing"
  if (t.includes("hvac") || t.includes("air") || t.includes("heat") || t.includes("cool")) return "hvac"
  if (t.includes("plumb")) return "plumbing"
  if (t.includes("electr")) return "electrical"
  if (t.includes("pressure") || t.includes("wash") || t.includes("power")) return "pressure_washing"
  if (t.includes("landscape") || t.includes("lawn") || t.includes("mow")) return "landscaping"
  if (t.includes("paint")) return "painting"
  if (t.includes("fence")) return "fencing"
  return "default"
}

function buildOpener(template: string, ownerName: string | null, businessName: string | null): string {
  const name = ownerName?.split(" ")[0] || businessName?.split(" ")[0] || "there"
  return template.replace("[Name]", name)
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { lead_ids: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { lead_ids } = body
  if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
    return NextResponse.json({ error: "lead_ids must be a non-empty array" }, { status: 400 })
  }

  // Cap at 50 to avoid abuse
  const ids = lead_ids.slice(0, 50)

  const admin = getAdmin()

  // ── Fetch leads ───────────────────────────────────────────────────────────
  const { data: leads, error: leadsErr } = await admin
    .from("dialer_leads")
    .select("id, business_name, owner_name, phone_number, state, last_outcome, last_called_at, attempt_count, notes")
    .in("id", ids)

  if (leadsErr) {
    console.error("[research] leads query error:", leadsErr)
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }

  // ── Fetch prior call counts from dialer_call_history ─────────────────────
  const { data: callHistory } = await admin
    .from("dialer_call_history")
    .select("lead_id, outcome")
    .in("lead_id", ids)

  // Build a map: lead_id → count of prior calls
  const priorCallMap: Record<string, number> = {}
  for (const row of callHistory ?? []) {
    priorCallMap[row.lead_id] = (priorCallMap[row.lead_id] ?? 0) + 1
  }

  // ── Build briefs ──────────────────────────────────────────────────────────
  const briefs: ResearchBrief[] = (leads ?? []).map((lead) => {
    // Derive trade from notes or business_name heuristics
    // dialer_leads doesn't have a dedicated trade column — we infer from business_name
    const inferredTrade = lead.business_name
      ? normalizeTrade(lead.business_name)
      : "default"

    const playbook = TRADE_PLAYBOOK[inferredTrade] ?? TRADE_PLAYBOOK.default

    const location = lead.state ? lead.state : null

    return {
      lead_id: lead.id,
      business_name: lead.business_name,
      trade: inferredTrade === "default" ? null : inferredTrade,
      phone: lead.phone_number,
      location,
      pain_points: playbook.pain_points,
      personalization_hooks: playbook.hooks,
      suggested_opener: buildOpener(playbook.opener_template, lead.owner_name, lead.business_name),
      prior_call_count: priorCallMap[lead.id] ?? 0,
      last_outcome: lead.last_outcome,
      last_called_at: lead.last_called_at,
    }
  })

  return NextResponse.json({ briefs })
}
