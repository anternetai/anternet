"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  Phone,
  Gauge,
  RefreshCw,
  CalendarDays,
  CalendarClock,
  Inbox,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { DialerLead } from "@/lib/dialer/types"
import { LeadDetailSheet } from "./lead-detail-sheet"

// ─── Fetcher ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ─── Group logic ───────────────────────────────────────────────────────────────

type CallbackGroup =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this_week"
  | "next_week"
  | "later"

interface GroupedLeads {
  overdue: DialerLead[]
  today: DialerLead[]
  tomorrow: DialerLead[]
  this_week: DialerLead[]
  next_week: DialerLead[]
  later: DialerLead[]
}

function getGroup(nextCallAt: string | null): CallbackGroup {
  if (!nextCallAt) return "later"

  const now = new Date()
  const target = new Date(nextCallAt)

  // Strip to just dates for day comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(todayStart.getDate() + 1)

  // End of this week (Sunday)
  const thisWeekEnd = new Date(todayStart)
  thisWeekEnd.setDate(todayStart.getDate() + (7 - todayStart.getDay()))

  // End of next week
  const nextWeekEnd = new Date(thisWeekEnd)
  nextWeekEnd.setDate(thisWeekEnd.getDate() + 7)

  if (target < now) return "overdue"

  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate())

  if (targetDay.getTime() === todayStart.getTime()) return "today"
  if (targetDay.getTime() === tomorrowStart.getTime()) return "tomorrow"
  if (target <= thisWeekEnd) return "this_week"
  if (target <= nextWeekEnd) return "next_week"
  return "later"
}

function groupLeads(leads: DialerLead[]): GroupedLeads {
  const groups: GroupedLeads = {
    overdue: [],
    today: [],
    tomorrow: [],
    this_week: [],
    next_week: [],
    later: [],
  }
  for (const lead of leads) {
    groups[getGroup(lead.next_call_at)].push(lead)
  }
  return groups
}

// ─── Format helpers ────────────────────────────────────────────────────────────

function formatCallbackTime(dateStr: string | null) {
  if (!dateStr) return "No time set"
  const d = new Date(dateStr)
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

// ─── Lead card ─────────────────────────────────────────────────────────────────

function CallbackLeadCard({
  lead,
  isOverdue,
  onOpenDetail,
}: {
  lead: DialerLead
  isOverdue?: boolean
  onOpenDetail: (id: string) => void
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
        isOverdue
          ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
          : "border-border/60 bg-card hover:bg-muted/40 cursor-pointer"
      )}
      onClick={() => onOpenDetail(lead.id)}
    >
      {/* Left: business info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">
            {lead.business_name ?? "Unknown Business"}
          </p>
          {isOverdue && (
            <Badge className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0 border border-red-500/30">
              Overdue
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {(lead.owner_name ?? lead.first_name) && (
            <span>{lead.owner_name ?? lead.first_name}</span>
          )}
          {lead.phone_number && (
            <span className="font-mono">{lead.phone_number}</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatCallbackTime(lead.next_call_at)}
          </span>
          <span className="text-muted-foreground/60">
            {lead.attempt_count} attempt{lead.attempt_count !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Right: call now button */}
      <Button
        size="sm"
        variant="outline"
        className={cn(
          "shrink-0 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
          isOverdue && "border-red-500/40 text-red-400 hover:bg-red-500/10"
        )}
        onClick={(e) => {
          e.stopPropagation()
          // Navigate to cockpit — in a real app we'd pass the lead ID
          window.location.href = "/portal/cold-calls"
        }}
      >
        <Gauge className="size-3.5" />
        Call Now
      </Button>
    </div>
  )
}

// ─── Group section ─────────────────────────────────────────────────────────────

const GROUP_CONFIG: Record<
  CallbackGroup,
  { label: string; icon: typeof Clock; accent: string; defaultOpen: boolean }
> = {
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    accent: "text-red-400",
    defaultOpen: true,
  },
  today: {
    label: "Today",
    icon: Phone,
    accent: "text-orange-400",
    defaultOpen: true,
  },
  tomorrow: {
    label: "Tomorrow",
    icon: CalendarDays,
    accent: "text-amber-400",
    defaultOpen: true,
  },
  this_week: {
    label: "This Week",
    icon: CalendarDays,
    accent: "text-blue-400",
    defaultOpen: false,
  },
  next_week: {
    label: "Next Week",
    icon: CalendarClock,
    accent: "text-indigo-400",
    defaultOpen: false,
  },
  later: {
    label: "Later",
    icon: CalendarClock,
    accent: "text-muted-foreground",
    defaultOpen: false,
  },
}

const GROUP_ORDER: CallbackGroup[] = [
  "overdue",
  "today",
  "tomorrow",
  "this_week",
  "next_week",
  "later",
]

function GroupSection({
  group,
  leads,
  onOpenDetail,
}: {
  group: CallbackGroup
  leads: DialerLead[]
  onOpenDetail: (id: string) => void
}) {
  const config = GROUP_CONFIG[group]
  const [open, setOpen] = useState(config.defaultOpen)
  const Icon = config.icon

  return (
    <div>
      {/* Section header */}
      <button
        className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <Icon className={cn("size-4", config.accent)} />
        <span className={cn("text-sm font-semibold", config.accent)}>
          {config.label}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "ml-1 text-[10px] px-1.5 py-0 tabular-nums",
            group === "overdue"
              ? "bg-red-500/15 text-red-400 border-red-500/30"
              : "bg-muted text-muted-foreground"
          )}
        >
          {leads.length}
        </Badge>
      </button>

      {/* Leads */}
      {open && (
        <div className="mt-1 space-y-1.5 pl-2">
          {leads.map((lead) => (
            <CallbackLeadCard
              key={lead.id}
              lead={lead}
              isOverdue={group === "overdue"}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function PipelineSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-8 w-40" />
          {Array.from({ length: 3 }).map((__, j) => (
            <Skeleton key={j} className="h-16 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CallbackPipeline() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data, isLoading, error, mutate } = useSWR<{ leads: DialerLead[]; total: number }>(
    `/api/portal/dialer/leads?status=callback&sort=next_call_at&order=asc&limit=100`,
    fetcher,
    { refreshInterval: 60_000 }
  )

  const grouped = useMemo(() => {
    if (!data?.leads) return null
    return groupLeads(data.leads)
  }, [data?.leads])

  const totalCallbacks = data?.total ?? 0
  const overdueCount = grouped?.overdue.length ?? 0

  function openDetail(id: string) {
    setSelectedLeadId(id)
    setSheetOpen(true)
  }

  if (isLoading) return <PipelineSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <p className="text-sm">Failed to load callbacks.</p>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="mr-1.5 size-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  if (totalCallbacks === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Inbox className="size-10 opacity-30" />
        <p className="text-sm font-medium">No callbacks scheduled</p>
        <p className="text-xs">Callbacks you schedule from the cockpit will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {totalCallbacks.toLocaleString()}
            </span>{" "}
            callback{totalCallbacks !== 1 ? "s" : ""} scheduled
          </p>
          {overdueCount > 0 && (
            <Badge className="gap-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-2">
              <AlertTriangle className="size-3" />
              {overdueCount} overdue
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {/* Grouped sections */}
      <div className="space-y-1">
        {grouped &&
          GROUP_ORDER.map((group) => {
            const leads = grouped[group]
            if (leads.length === 0) return null
            return (
              <GroupSection
                key={group}
                group={group}
                leads={leads}
                onOpenDetail={openDetail}
              />
            )
          })}
      </div>

      {/* Lead detail sheet */}
      <LeadDetailSheet
        leadId={selectedLeadId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
