"use client"

import { useState, useMemo } from "react"
import {
  Phone,
  Users,
  MessageSquare,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { DailyStats, CallLog } from "@/app/api/portal/calls/dashboard/route"

interface CallHistoryProps {
  dailyHistory: DailyStats[]
  isLoading: boolean
}

const DAILY_DIAL_TARGET = 100

function rate(num: number, den: number): string {
  if (den === 0) return "—"
  return ((num / den) * 100).toFixed(1) + "%"
}

export function CallHistory({ dailyHistory, isLoading }: CallHistoryProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily")

  const weeklyData = useMemo(() => {
    if (!dailyHistory.length) return []
    const weeks = new Map<string, DailyStats>()

    for (const day of dailyHistory) {
      const d = new Date(day.call_date + "T12:00:00")
      // Get Monday of the week
      const dayOfWeek = d.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(d)
      monday.setDate(d.getDate() + mondayOffset)
      const weekKey = monday.toISOString().split("T")[0]

      const existing = weeks.get(weekKey) || {
        id: weekKey,
        call_date: weekKey,
        total_dials: 0,
        contacts: 0,
        conversations: 0,
        demos_booked: 0,
        demos_held: 0,
        deals_closed: 0,
        hours_dialed: 0,
        notes: null,
      }

      existing.total_dials += day.total_dials
      existing.contacts += day.contacts
      existing.conversations += day.conversations
      existing.demos_booked += day.demos_booked
      existing.demos_held += day.demos_held
      existing.deals_closed += day.deals_closed
      existing.hours_dialed += day.hours_dialed

      weeks.set(weekKey, existing)
    }

    return Array.from(weeks.values()).sort(
      (a, b) => new Date(b.call_date).getTime() - new Date(a.call_date).getTime()
    )
  }, [dailyHistory])

  const monthlyData = useMemo(() => {
    if (!dailyHistory.length) return []
    const months = new Map<string, DailyStats>()

    for (const day of dailyHistory) {
      const monthKey = day.call_date.substring(0, 7) // YYYY-MM

      const existing = months.get(monthKey) || {
        id: monthKey,
        call_date: monthKey + "-01",
        total_dials: 0,
        contacts: 0,
        conversations: 0,
        demos_booked: 0,
        demos_held: 0,
        deals_closed: 0,
        hours_dialed: 0,
        notes: null,
      }

      existing.total_dials += day.total_dials
      existing.contacts += day.contacts
      existing.conversations += day.conversations
      existing.demos_booked += day.demos_booked
      existing.demos_held += day.demos_held
      existing.deals_closed += day.deals_closed
      existing.hours_dialed += day.hours_dialed

      months.set(monthKey, existing)
    }

    return Array.from(months.values()).sort(
      (a, b) => new Date(b.call_date).getTime() - new Date(a.call_date).getTime()
    )
  }, [dailyHistory])

  const displayData =
    view === "weekly" ? weeklyData : view === "monthly" ? monthlyData : dailyHistory

  if (isLoading) {
    return <Skeleton className="h-96" />
  }

  function formatDateLabel(dateStr: string): string {
    if (view === "monthly") {
      return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    }
    if (view === "weekly") {
      const start = new Date(dateStr + "T12:00:00")
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} – ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`
    }
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  // Summary totals
  const totals = displayData.reduce(
    (acc, d) => ({
      dials: acc.dials + d.total_dials,
      contacts: acc.contacts + d.contacts,
      conversations: acc.conversations + d.conversations,
      demos: acc.demos + d.demos_booked,
      deals: acc.deals + d.deals_closed,
    }),
    { dials: 0, contacts: 0, conversations: 0, demos: 0, deals: 0 }
  )

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total Dials", value: totals.dials.toLocaleString(), icon: Phone, color: "text-orange-500" },
          { label: "Contacts", value: totals.contacts.toLocaleString(), icon: Users, color: "text-blue-500" },
          { label: "Conversations", value: totals.conversations.toLocaleString(), icon: MessageSquare, color: "text-amber-500" },
          { label: "Demos", value: totals.demos.toLocaleString(), icon: CalendarCheck, color: "text-emerald-500" },
          { label: "Contact Rate", value: rate(totals.contacts, totals.dials), icon: Phone, color: "text-purple-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <s.icon className={`mx-auto mb-1 size-4 ${s.color}`} />
            <p className="text-xl font-bold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border bg-muted p-0.5">
          {(["daily", "weekly", "monthly"] as const).map((v) => (
            <Button
              key={v}
              variant="ghost"
              size="sm"
              onClick={() => setView(v)}
              className={`h-7 rounded-md px-3 text-xs capitalize ${
                view === v
                  ? "bg-background shadow-sm hover:bg-background"
                  : "hover:bg-transparent"
              }`}
            >
              {v}
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {displayData.length} {view === "daily" ? "days" : view === "weekly" ? "weeks" : "months"}
        </span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>{view === "daily" ? "Date" : "Period"}</TableHead>
                <TableHead className="text-right">Dials</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
                <TableHead className="text-right">Convos</TableHead>
                <TableHead className="text-right">Demos</TableHead>
                <TableHead className="text-right">Deals</TableHead>
                <TableHead className="text-right">Contact %</TableHead>
                <TableHead className="text-right">Demo %</TableHead>
                {view === "daily" && <TableHead>Progress</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={view === "daily" ? 9 : 8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No call data yet. Start logging calls to see your history.
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((row) => {
                  const progress = Math.min(
                    (row.total_dials / DAILY_DIAL_TARGET) * 100,
                    100
                  )
                  return (
                    <TableRow key={row.id || row.call_date} className="border-border">
                      <TableCell className="font-medium">
                        {formatDateLabel(row.call_date)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {row.total_dials}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {row.contacts}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {row.conversations}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-emerald-500">
                        {row.demos_booked}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-purple-500">
                        {row.deals_closed}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {rate(row.contacts, row.total_dials)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {rate(row.demos_booked, row.conversations)}
                      </TableCell>
                      {view === "daily" && (
                        <TableCell className="w-28">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className={`h-full rounded-full ${
                                  progress >= 100
                                    ? "bg-emerald-400"
                                    : progress >= 75
                                    ? "bg-orange-500"
                                    : "bg-amber-400"
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                              {Math.round(progress)}%
                            </span>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
