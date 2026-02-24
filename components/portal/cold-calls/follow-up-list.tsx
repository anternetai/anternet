"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Phone,
  Calendar,
  User,
  Building2,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react"
import type { DialerLead, DialerOutcome } from "@/lib/dialer/types"

type FollowUpGroup = "today" | "tomorrow" | "this_week" | "next_week" | "later"

interface GroupedFollowUps {
  today: DialerLead[]
  tomorrow: DialerLead[]
  this_week: DialerLead[]
  next_week: DialerLead[]
  later: DialerLead[]
}

const OUTCOME_LABELS: Partial<Record<DialerOutcome, string>> = {
  no_answer: "No Answer",
  voicemail: "Voicemail",
  conversation: "Talked",
  callback: "Callback",
  gatekeeper: "Gatekeeper",
}

const GROUP_CONFIG: Record<FollowUpGroup, { label: string; color: string }> = {
  today: { label: "Today", color: "text-red-400" },
  tomorrow: { label: "Tomorrow", color: "text-orange-400" },
  this_week: { label: "This Week", color: "text-yellow-400" },
  next_week: { label: "Next Week", color: "text-blue-400" },
  later: { label: "Later", color: "text-muted-foreground" },
}

function groupFollowUps(leads: DialerLead[]): GroupedFollowUps {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const tomorrowEnd = new Date(tomorrowStart)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)
  const weekEnd = new Date(todayStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const nextWeekEnd = new Date(todayStart)
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 14)

  const result: GroupedFollowUps = {
    today: [],
    tomorrow: [],
    this_week: [],
    next_week: [],
    later: [],
  }

  for (const lead of leads) {
    if (!lead.next_call_at) continue
    const d = new Date(lead.next_call_at)
    if (d < tomorrowStart) result.today.push(lead)
    else if (d < tomorrowEnd) result.tomorrow.push(lead)
    else if (d < weekEnd) result.this_week.push(lead)
    else if (d < nextWeekEnd) result.next_week.push(lead)
    else result.later.push(lead)
  }

  // Sort each group by next_call_at ASC
  for (const group of Object.values(result)) {
    group.sort((a: DialerLead, b: DialerLead) => {
      const da = a.next_call_at ? new Date(a.next_call_at).getTime() : 0
      const db = b.next_call_at ? new Date(b.next_call_at).getTime() : 0
      return da - db
    })
  }

  return result
}

function formatCallTime(isoStr: string): string {
  const d = new Date(isoStr)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffH = Math.floor(diffMs / 3600000)

  if (diffMs < 0) return "Overdue"
  if (diffH < 1) return "< 1h"
  if (diffH < 24)
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (phone.startsWith("+")) return phone
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return `+${digits}`
}

function formatPhone(phone: string | null): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith("1"))
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return phone
}

interface FollowUpItemRowProps {
  lead: DialerLead
  onCall?: (lead: DialerLead) => void
}

function FollowUpItemRow({ lead, onCall }: FollowUpItemRowProps) {
  const isOverdue =
    lead.next_call_at && new Date(lead.next_call_at).getTime() < Date.now()

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/40 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Building2 className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">
            {lead.business_name || "Unknown Business"}
          </span>
          {lead.state && (
            <Badge variant="outline" className="shrink-0 text-[9px] h-4 px-1">
              {lead.state}
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {(lead.owner_name || lead.first_name) && (
            <span className="flex items-center gap-1">
              <User className="size-2.5" />
              {lead.owner_name || lead.first_name}
            </span>
          )}
          {lead.last_outcome && (
            <span className="flex items-center gap-1">
              <span>•</span>
              {OUTCOME_LABELS[lead.last_outcome as DialerOutcome] || lead.last_outcome}
            </span>
          )}
          {lead.attempt_count > 0 && (
            <span>#{lead.attempt_count + 1}</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div
          className={`flex items-center gap-1 text-[11px] ${
            isOverdue ? "text-red-400" : "text-muted-foreground"
          }`}
        >
          <Clock className="size-2.5" />
          {lead.next_call_at ? formatCallTime(lead.next_call_at) : "—"}
        </div>
      </div>

      {lead.phone_number && (
        <a
          href={`tel:${toE164(lead.phone_number)}`}
          onClick={(e) => {
            if (onCall) {
              e.preventDefault()
              onCall(lead)
            }
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500"
          title={formatPhone(lead.phone_number)}
        >
          <Phone className="size-3" />
        </a>
      )}
    </div>
  )
}

interface FollowUpListProps {
  leads: DialerLead[]
  onCall?: (lead: DialerLead) => void
  className?: string
}

export function FollowUpList({ leads, onCall, className }: FollowUpListProps) {
  const grouped = useMemo(() => {
    // Filter leads that have a next_call_at and are not completed
    const followUpLeads = leads.filter(
      (l) =>
        l.next_call_at &&
        l.status !== "completed" &&
        l.status !== "archived" &&
        !l.demo_booked &&
        !l.not_interested &&
        !l.wrong_number
    )
    return groupFollowUps(followUpLeads)
  }, [leads])

  const totalFollowUps = Object.values(grouped).reduce((sum, g) => sum + g.length, 0)

  if (totalFollowUps === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No follow-ups scheduled</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Follow-ups appear here after saving call outcomes.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="size-4" />
          Follow-Ups
          <Badge variant="secondary" className="ml-auto">
            {totalFollowUps}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {(Object.entries(grouped) as [FollowUpGroup, DialerLead[]][]).map(
          ([group, groupLeads]) => {
            if (groupLeads.length === 0) return null
            const cfg = GROUP_CONFIG[group]
            return (
              <div key={group}>
                <div className="mb-1 flex items-center gap-2">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({groupLeads.length})
                  </span>
                </div>
                <div className="space-y-0.5">
                  {groupLeads.map((lead) => (
                    <FollowUpItemRow key={lead.id} lead={lead} onCall={onCall} />
                  ))}
                </div>
              </div>
            )
          }
        )}
      </CardContent>
    </Card>
  )
}
