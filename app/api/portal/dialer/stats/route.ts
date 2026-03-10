import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface PeriodStats {
  dials: number
  contacts: number
  conversations: number
  demos: number
}

interface DailyBreakdownRow {
  date: string
  dials: number
  contacts: number
  conversations: number
  demos: number
}

interface OutcomeRow {
  outcome: string
  count: number
}

interface StatusRow {
  status: string
  count: number
}

interface ConversionRates {
  contactRate: number
  conversationRate: number
  demoRate: number
}

// GET /api/portal/dialer/stats - aggregated cold call KPIs
export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const url = new URL(req.url)

  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") || "30")))
  const specificDate = url.searchParams.get("date") // e.g. "2026-03-10"

  const today = new Date().toISOString().split("T")[0]

  // Compute period start date
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - days)
  const periodStartStr = periodStart.toISOString().split("T")[0]

  // The effective date range for history queries
  const historyDateStart = specificDate || periodStartStr
  const historyDateEnd = specificDate || today

  // Run all queries in parallel for performance
  const [
    todayStatsResult,
    periodStatsResult,
    outcomeResult,
    leadStatusResult,
  ] = await Promise.all([
    // Today's stats from daily_call_stats
    admin
      .from("daily_call_stats")
      .select("total_dials, contacts, conversations, demos_booked")
      .eq("call_date", today)
      .maybeSingle(),

    // Period stats from daily_call_stats
    admin
      .from("daily_call_stats")
      .select("call_date, total_dials, contacts, conversations, demos_booked")
      .gte("call_date", historyDateStart)
      .lte("call_date", historyDateEnd)
      .order("call_date", { ascending: true }),

    // Outcome breakdown from dialer_call_history
    admin
      .from("dialer_call_history")
      .select("outcome")
      .gte("call_date", historyDateStart)
      .lte("call_date", historyDateEnd),

    // Lead status summary from dialer_leads (always total, not date-filtered)
    admin
      .from("dialer_leads")
      .select("status"),
  ])

  // --- Today ---
  const todayRow = todayStatsResult.data
  const todayStats: PeriodStats = {
    dials: todayRow?.total_dials || 0,
    contacts: todayRow?.contacts || 0,
    conversations: todayRow?.conversations || 0,
    demos: todayRow?.demos_booked || 0,
  }

  // --- Period totals + daily breakdown ---
  const periodRows = periodStatsResult.data || []

  const periodTotals: PeriodStats = periodRows.reduce(
    (acc, row) => ({
      dials: acc.dials + (row.total_dials || 0),
      contacts: acc.contacts + (row.contacts || 0),
      conversations: acc.conversations + (row.conversations || 0),
      demos: acc.demos + (row.demos_booked || 0),
    }),
    { dials: 0, contacts: 0, conversations: 0, demos: 0 }
  )

  const dailyBreakdown: DailyBreakdownRow[] = periodRows.map((row) => ({
    date: row.call_date,
    dials: row.total_dials || 0,
    contacts: row.contacts || 0,
    conversations: row.conversations || 0,
    demos: row.demos_booked || 0,
  }))

  // --- Outcome breakdown ---
  const outcomeCounts: Record<string, number> = {}
  for (const row of outcomeResult.data || []) {
    if (row.outcome) {
      outcomeCounts[row.outcome] = (outcomeCounts[row.outcome] || 0) + 1
    }
  }
  const outcomeBreakdown: OutcomeRow[] = Object.entries(outcomeCounts)
    .map(([outcome, count]) => ({ outcome, count }))
    .sort((a, b) => b.count - a.count)

  // --- Lead status summary ---
  const statusCounts: Record<string, number> = {}
  for (const row of leadStatusResult.data || []) {
    if (row.status) {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
    }
  }
  const leadStatusSummary: StatusRow[] = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  // --- Conversion rates (safe division) ---
  const safe = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 10000) / 100) // percentage, 2 decimals
  const rates: ConversionRates = {
    contactRate: safe(periodTotals.contacts, periodTotals.dials),
    conversationRate: safe(periodTotals.conversations, periodTotals.contacts),
    demoRate: safe(periodTotals.demos, periodTotals.conversations),
  }

  return NextResponse.json({
    today: todayStats,
    period: { ...periodTotals, days },
    dailyBreakdown,
    outcomeBreakdown,
    leadStatusSummary,
    rates,
  })
}
