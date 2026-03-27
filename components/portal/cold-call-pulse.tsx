"use client"

import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  Phone,
  MessageSquare,
  CalendarCheck,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Flame,
  Zap,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface StatsData {
  today: {
    dials: number
    contacts: number
    conversations: number
    demos: number
  }
  period: {
    dials: number
    contacts: number
    conversations: number
    demos: number
    days: number
  }
  rates: {
    contactRate: number
    conversationRate: number
    demoRate: number
  }
}

interface CallbackData {
  total: number
  leads: Array<{ next_call_at: string | null }>
}

function useOverdueCount(data: CallbackData | undefined): number {
  if (!data?.leads) return 0
  const now = new Date()
  return data.leads.filter((l) => {
    if (!l.next_call_at) return true // no time = overdue by default
    return new Date(l.next_call_at) < now
  }).length
}

function useTodayCallbackCount(data: CallbackData | undefined): number {
  if (!data?.leads) return 0
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(todayStart.getDate() + 1)
  return data.leads.filter((l) => {
    if (!l.next_call_at) return false
    const t = new Date(l.next_call_at)
    return t >= now && t >= todayStart && t < tomorrowStart
  }).length
}

// ─── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Phone
  label: string
  value: number | string
  accent: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
      <Icon className={cn("h-3.5 w-3.5", accent)} />
      <span className="text-xl font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ColdCallPulse() {
  const router = useRouter()

  const { data: stats, isLoading: statsLoading } = useSWR<StatsData>(
    "/api/portal/dialer/stats?days=7",
    fetcher,
    { refreshInterval: 60_000 }
  )

  const { data: callbacks, isLoading: callbacksLoading } = useSWR<CallbackData>(
    "/api/portal/dialer/leads?status=callback&sort=next_call_at&order=asc&limit=100",
    fetcher,
    { refreshInterval: 60_000 }
  )

  const overdueCount = useOverdueCount(callbacks)
  const todayCallbackCount = useTodayCallbackCount(callbacks)
  const isLoading = statsLoading || callbacksLoading

  const todayDials = stats?.today?.dials ?? 0
  const todayConvos = stats?.today?.conversations ?? 0
  const todayDemos = stats?.today?.demos ?? 0
  const weekDials = stats?.period?.dials ?? 0
  const weekDemos = stats?.period?.demos ?? 0

  const goToCockpit = () => router.push("/portal/cold-calls?tab=cockpit")
  const goToPipeline = () => router.push("/portal/cold-calls?tab=pipeline")

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-14" />)}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="p-0">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold">Cold Call Pulse</span>
            {todayDials > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                Active today
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground gap-1"
            onClick={goToCockpit}
          >
            Open Dialer <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Overdue callback alert */}
        {overdueCount > 0 && (
          <button
            onClick={goToPipeline}
            className="w-full flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-y border-amber-500/20 hover:bg-amber-500/15 transition-colors text-left"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {overdueCount} overdue callback{overdueCount !== 1 ? "s" : ""} need attention
            </span>
            <ArrowRight className="h-3 w-3 text-amber-500 ml-auto" />
          </button>
        )}

        {/* Today's scheduled callbacks (non-overdue) */}
        {todayCallbackCount > 0 && (
          <button
            onClick={goToPipeline}
            className="w-full flex items-center gap-2 px-4 py-2 bg-blue-500/8 border-b border-blue-500/15 hover:bg-blue-500/12 transition-colors text-left"
          >
            <Phone className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {todayCallbackCount} callback{todayCallbackCount !== 1 ? "s" : ""} scheduled for today
            </span>
            <ArrowRight className="h-3 w-3 text-blue-400 ml-auto" />
          </button>
        )}

        {/* Stats grid */}
        <div className="px-4 py-4">
          {/* Today's numbers */}
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">
              Today
            </p>
            {todayDials === 0 ? (
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground italic">No calls yet today</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-xs gap-1.5 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                  onClick={goToCockpit}
                >
                  <Zap className="h-3 w-3" />
                  Start Session
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <StatPill icon={Phone} label="Dials" value={todayDials} accent="text-blue-500" />
                <StatPill icon={MessageSquare} label="Convos" value={todayConvos} accent="text-purple-500" />
                <StatPill icon={CalendarCheck} label="Demos" value={todayDemos} accent="text-emerald-500" />
              </div>
            )}
          </div>

          {/* 7-day summary */}
          <div className="flex items-center gap-4 pt-3 border-t border-border/50">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                <strong className="text-foreground">{weekDials}</strong> dials
              </span>
              <span className="text-border">·</span>
              <span>
                <strong className="text-foreground">{weekDemos}</strong> demo{weekDemos !== 1 ? "s" : ""} booked
              </span>
              <span className="text-border">·</span>
              <span>last 7 days</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
