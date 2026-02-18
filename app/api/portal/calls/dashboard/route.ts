import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface CallDashboardData {
  today: {
    total_dials: number
    contacts: number
    conversations: number
    demos_booked: number
    demos_held: number
    deals_closed: number
    hours_dialed: number
  }
  todayLogs: CallLog[]
  rolling7: RollingStats
  rolling30: RollingStats
  dailyHistory: DailyStats[]
  hourlyBreakdown: HourlyBreakdown[]
}

export interface CallLog {
  id: string
  created_at: string
  call_date: string
  call_time: string | null
  business_name: string | null
  phone_number: string | null
  contact_made: boolean
  conversation: boolean
  demo_booked: boolean
  demo_held: boolean
  deal_closed: boolean
  outcome: string | null
  notes: string | null
  call_duration_seconds: number | null
  lead_id: string | null
}

export interface DailyStats {
  id: string
  call_date: string
  total_dials: number
  contacts: number
  conversations: number
  demos_booked: number
  demos_held: number
  deals_closed: number
  hours_dialed: number
  notes: string | null
}

export interface RollingStats {
  avg_dials: number
  avg_contacts: number
  avg_conversations: number
  avg_demos: number
  total_dials: number
  total_contacts: number
  total_conversations: number
  total_demos: number
  total_deals: number
  days_with_data: number
  contact_rate: number
  conversation_rate: number
  demo_rate: number
  close_rate: number
}

export interface HourlyBreakdown {
  hour: number
  dials: number
  contacts: number
  contact_rate: number
}

function computeRolling(stats: DailyStats[]): RollingStats {
  if (!stats.length) {
    return {
      avg_dials: 0, avg_contacts: 0, avg_conversations: 0, avg_demos: 0,
      total_dials: 0, total_contacts: 0, total_conversations: 0, total_demos: 0,
      total_deals: 0, days_with_data: 0,
      contact_rate: 0, conversation_rate: 0, demo_rate: 0, close_rate: 0,
    }
  }

  const total_dials = stats.reduce((s, d) => s + (d.total_dials || 0), 0)
  const total_contacts = stats.reduce((s, d) => s + (d.contacts || 0), 0)
  const total_conversations = stats.reduce((s, d) => s + (d.conversations || 0), 0)
  const total_demos = stats.reduce((s, d) => s + (d.demos_booked || 0), 0)
  const total_deals = stats.reduce((s, d) => s + (d.deals_closed || 0), 0)
  const days = stats.length

  return {
    avg_dials: Math.round(total_dials / days),
    avg_contacts: Math.round(total_contacts / days),
    avg_conversations: Math.round(total_conversations / days),
    avg_demos: Math.round((total_demos / days) * 10) / 10,
    total_dials,
    total_contacts,
    total_conversations,
    total_demos,
    total_deals,
    days_with_data: days,
    contact_rate: total_dials > 0 ? (total_contacts / total_dials) * 100 : 0,
    conversation_rate: total_contacts > 0 ? (total_conversations / total_contacts) * 100 : 0,
    demo_rate: total_conversations > 0 ? (total_demos / total_conversations) * 100 : 0,
    close_rate: total_demos > 0 ? (total_deals / total_demos) * 100 : 0,
  }
}

// GET /api/portal/calls/dashboard - get full dashboard data
export async function GET() {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const today = new Date().toISOString().split("T")[0]
  const d7 = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]

  // Fetch today's stats
  const { data: todayStats } = await admin
    .from("daily_call_stats")
    .select("*")
    .eq("call_date", today)
    .single()

  // Fetch today's individual call logs
  const { data: todayLogs } = await admin
    .from("call_logs")
    .select("*")
    .eq("call_date", today)
    .order("created_at", { ascending: false })

  // Fetch 7-day stats
  const { data: stats7 } = await admin
    .from("daily_call_stats")
    .select("*")
    .gte("call_date", d7)
    .lte("call_date", today)
    .order("call_date", { ascending: false })

  // Fetch 30-day stats
  const { data: stats30 } = await admin
    .from("daily_call_stats")
    .select("*")
    .gte("call_date", d30)
    .lte("call_date", today)
    .order("call_date", { ascending: false })

  // Hourly breakdown from today's call logs
  const hourlyMap = new Map<number, { dials: number; contacts: number }>()
  for (const log of todayLogs || []) {
    if (log.call_time) {
      const hour = parseInt(log.call_time.split(":")[0])
      const existing = hourlyMap.get(hour) || { dials: 0, contacts: 0 }
      existing.dials++
      if (log.contact_made) existing.contacts++
      hourlyMap.set(hour, existing)
    }
  }

  const hourlyBreakdown: HourlyBreakdown[] = Array.from(hourlyMap.entries())
    .map(([hour, data]) => ({
      hour,
      dials: data.dials,
      contacts: data.contacts,
      contact_rate: data.dials > 0 ? (data.contacts / data.dials) * 100 : 0,
    }))
    .sort((a, b) => a.hour - b.hour)

  const dashboard: CallDashboardData = {
    today: {
      total_dials: todayStats?.total_dials || 0,
      contacts: todayStats?.contacts || 0,
      conversations: todayStats?.conversations || 0,
      demos_booked: todayStats?.demos_booked || 0,
      demos_held: todayStats?.demos_held || 0,
      deals_closed: todayStats?.deals_closed || 0,
      hours_dialed: todayStats?.hours_dialed || 0,
    },
    todayLogs: todayLogs || [],
    rolling7: computeRolling((stats7 || []) as DailyStats[]),
    rolling30: computeRolling((stats30 || []) as DailyStats[]),
    dailyHistory: (stats30 || []) as DailyStats[],
    hourlyBreakdown,
  }

  return NextResponse.json(dashboard)
}
