"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Phone,
  CalendarCheck,
  MessageSquare,
  TrendingUp,
  PhoneCall,
  RefreshCw,
  AlertTriangle,
  Info,
  Zap,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardAlert {
  type: string
  severity: "info" | "warning" | "critical"
  message: string
}

interface TopHook {
  text: string
  demo_rate: number
  times_used: number
}

interface DashboardData {
  today: {
    calls_made: number
    demos_booked: number
    conversations: number
    demo_rate: number
    callbacks_remaining: number
  }
  pipeline: {
    contacted: number
    interested: number
    demo_scheduled: number
    signed: number
    onboarding: number
    setup: number
    launch: number
    active: number
  }
  alerts: DashboardAlert[]
  top_hooks: TopHook[]
  generated_at: string
}

// ─── Pipeline Stage Config ────────────────────────────────────────────────────

const PIPELINE_STAGES: { key: keyof DashboardData["pipeline"]; label: string; color: string; bar: string }[] = [
  { key: "contacted",     label: "Contacted",     color: "text-zinc-400",   bar: "bg-zinc-500" },
  { key: "interested",    label: "Interested",    color: "text-sky-400",    bar: "bg-sky-500" },
  { key: "demo_scheduled",label: "Demo Sched.",   color: "text-indigo-400", bar: "bg-indigo-500" },
  { key: "signed",        label: "Signed",        color: "text-violet-400", bar: "bg-violet-500" },
  { key: "onboarding",    label: "Onboarding",    color: "text-amber-400",  bar: "bg-amber-500" },
  { key: "setup",         label: "Setup",         color: "text-orange-400", bar: "bg-orange-500" },
  { key: "launch",        label: "Launch",        color: "text-rose-400",   bar: "bg-rose-500" },
  { key: "active",        label: "Active",        color: "text-emerald-400",bar: "bg-emerald-500" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }) + " ET"
}

function severityStyles(severity: DashboardAlert["severity"]) {
  switch (severity) {
    case "critical":
      return {
        card: "border-red-500/40 bg-red-500/10",
        icon: "text-red-400",
        text: "text-red-300",
        dot: "bg-red-500",
      }
    case "warning":
      return {
        card: "border-amber-500/40 bg-amber-500/10",
        icon: "text-amber-400",
        text: "text-amber-300",
        dot: "bg-amber-500",
      }
    default:
      return {
        card: "border-sky-500/30 bg-sky-500/10",
        icon: "text-sky-400",
        text: "text-sky-300",
        dot: "bg-sky-500",
      }
  }
}

function AlertIcon({ severity }: { severity: DashboardAlert["severity"] }) {
  if (severity === "critical") return <Zap className="h-4 w-4 flex-shrink-0" />
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 flex-shrink-0" />
  return <Info className="h-4 w-4 flex-shrink-0" />
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-72 bg-zinc-800" />
        <Skeleton className="h-9 w-32 bg-zinc-800" />
      </div>
      {/* Today's stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />
        ))}
      </div>
      {/* Pipeline */}
      <Skeleton className="h-36 rounded-xl bg-zinc-800" />
      {/* Bottom two cols */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl bg-zinc-800" />
        <Skeleton className="h-48 rounded-xl bg-zinc-800" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OpsDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await fetch("/api/ops/dashboard", { credentials: "include" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json: DashboardData = await res.json()
      setData(json)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Initial load + auto-refresh every 60 s
  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(), 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="rounded-full bg-red-500/10 p-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <p className="text-lg font-semibold text-zinc-100">Failed to load dashboard</p>
          <p className="mt-1 text-sm text-zinc-400">{error}</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          className="mt-2 flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    )
  }

  if (!data) return null

  const { today, pipeline, alerts, top_hooks, generated_at } = data

  // Max pipeline value for bar scaling
  const pipelineMax = Math.max(...PIPELINE_STAGES.map((s) => pipeline[s.key]), 1)

  // Today's stat cards config
  const statCards = [
    {
      label: "Calls Made",
      value: today.calls_made,
      icon: Phone,
      color: "text-sky-400",
      bg: "bg-sky-400/10",
      format: (v: number) => String(v),
    },
    {
      label: "Demos Booked",
      value: today.demos_booked,
      icon: CalendarCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      format: (v: number) => String(v),
    },
    {
      label: "Conversations",
      value: today.conversations,
      icon: MessageSquare,
      color: "text-indigo-400",
      bg: "bg-indigo-400/10",
      format: (v: number) => String(v),
    },
    {
      label: "Demo Rate",
      value: today.demo_rate,
      icon: TrendingUp,
      color: today.demo_rate >= 5 ? "text-emerald-400" : today.demo_rate >= 2 ? "text-amber-400" : "text-red-400",
      bg: today.demo_rate >= 5 ? "bg-emerald-400/10" : today.demo_rate >= 2 ? "bg-amber-400/10" : "bg-red-400/10",
      format: (v: number) => `${v}%`,
    },
    {
      label: "Callbacks Left",
      value: today.callbacks_remaining,
      icon: PhoneCall,
      color: today.callbacks_remaining > 0 ? "text-amber-400" : "text-zinc-400",
      bg: today.callbacks_remaining > 0 ? "bg-amber-400/10" : "bg-zinc-400/10",
      format: (v: number) => String(v),
    },
  ]

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Ops Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-zinc-400">Mission Control — real-time operations</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 self-start rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ── Today's Stats ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Today&apos;s Stats
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((stat) => (
            <Card
              key={stat.label}
              className="border-zinc-800 bg-zinc-900 shadow-none"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-400">{stat.label}</p>
                    <p className={`text-3xl font-bold tracking-tight ${stat.color}`}>
                      {stat.format(stat.value)}
                    </p>
                  </div>
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Pipeline Health ────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Pipeline Health
        </h2>
        <Card className="border-zinc-800 bg-zinc-900 shadow-none">
          <CardContent className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              {PIPELINE_STAGES.map((stage) => {
                const count = pipeline[stage.key]
                const pct = Math.round((count / pipelineMax) * 100)
                return (
                  <div key={stage.key} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">{stage.label}</span>
                      <span className={`text-sm font-bold ${stage.color}`}>{count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={`h-full rounded-full ${stage.bar} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Alerts + Top Hooks ────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerts */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Alerts
          </h2>
          {alerts.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-900 shadow-none">
              <CardContent className="flex items-center gap-3 p-5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-400/10">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-sm text-zinc-300">No active alerts — all clear.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => {
                const styles = severityStyles(alert.severity)
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-xl border p-4 ${styles.card}`}
                  >
                    <span className={styles.icon}>
                      <AlertIcon severity={alert.severity} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${styles.text}`}>
                        {alert.message}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 capitalize">
                        {alert.type.replace(/_/g, " ")} · {alert.severity}
                      </p>
                    </div>
                    <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${styles.dot}`} />
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Top Hooks */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Top Hooks
          </h2>
          <Card className="border-zinc-800 bg-zinc-900 shadow-none">
            {top_hooks.length === 0 ? (
              <CardContent className="flex items-center gap-3 p-5">
                <p className="text-sm text-zinc-400">
                  No hook data yet — hooks appear after calls with notes are logged today.
                </p>
              </CardContent>
            ) : (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">
                          Hook
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-zinc-500">
                          Used
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-widest text-zinc-500">
                          Demo Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {top_hooks.map((hook, i) => (
                        <tr
                          key={i}
                          className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <p className="max-w-xs truncate text-zinc-200" title={hook.text}>
                              {hook.text}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-400">
                            {hook.times_used}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span
                              className={`font-semibold ${
                                hook.demo_rate >= 10
                                  ? "text-emerald-400"
                                  : hook.demo_rate >= 5
                                  ? "text-sky-400"
                                  : "text-zinc-400"
                              }`}
                            >
                              {hook.demo_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        </section>
      </div>

      {/* ── Last Updated ──────────────────────────────────────────────────── */}
      <p className="text-right text-xs text-zinc-600">
        Last updated: {formatTime(generated_at)} · auto-refreshes every 60 s
      </p>
    </div>
  )
}
