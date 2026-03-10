"use client"

import useSWR from "swr"
import {
  Phone,
  User,
  Globe,
  MapPin,
  Clock,
  Hash,
  ExternalLink,
  Gauge,
  XCircle,
  CalendarClock,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { DialerLead, DialerOutcome, DialerStatus, DialerCallHistory } from "@/lib/dialer/types"

// ─── Fetcher ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ─── Badge helpers ─────────────────────────────────────────────────────────────

export function statusBadgeClass(status: DialerStatus | string): string {
  switch (status) {
    case "queued":      return "bg-blue-500/15 text-blue-400 border-blue-500/30"
    case "in_progress": return "bg-orange-500/15 text-orange-400 border-orange-500/30"
    case "callback":    return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    case "completed":   return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "archived":    return "bg-muted text-muted-foreground border-border"
    default:            return "bg-muted text-muted-foreground border-border"
  }
}

export function outcomeBadgeClass(outcome: DialerOutcome | string): string {
  switch (outcome) {
    case "no_answer":      return "bg-muted text-muted-foreground border-border"
    case "voicemail":      return "bg-slate-500/15 text-slate-400 border-slate-500/30"
    case "gatekeeper":     return "bg-purple-500/15 text-purple-400 border-purple-500/30"
    case "conversation":   return "bg-blue-500/15 text-blue-400 border-blue-500/30"
    case "demo_booked":    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "not_interested": return "bg-red-500/15 text-red-400 border-red-500/30"
    case "wrong_number":   return "bg-orange-500/15 text-orange-400 border-orange-500/30"
    case "callback":       return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    default:               return "bg-muted text-muted-foreground border-border"
  }
}

function formatOutcomeLabel(outcome: string) {
  return outcome.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// ─── Extended lead detail type ─────────────────────────────────────────────────

interface LeadRecording {
  id: string
  created_at: string
  duration_seconds: number
  ai_summary: string
  ai_disposition: string
  raw_transcript: string
}

interface LeadDetailData {
  lead: DialerLead
  callHistory: (DialerCallHistory & { duration_seconds?: number; ai_summary?: string })[]
  recordings: LeadRecording[]
}

// ─── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Phone
  label: string
  value: string | null | undefined
  href?: string
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-blue-400 hover:underline truncate"
          >
            {value}
            <ExternalLink className="size-3 shrink-0" />
          </a>
        ) : (
          <p className="text-sm font-medium truncate">{value}</p>
        )}
      </div>
    </div>
  )
}

// ─── Call history card ─────────────────────────────────────────────────────────

function CallHistoryCard({ call }: { call: DialerCallHistory & { duration_seconds?: number; ai_summary?: string } }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-medium">
            Attempt #{call.attempt_number}
          </span>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 border", outcomeBadgeClass(call.outcome))}
          >
            {formatOutcomeLabel(call.outcome)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {call.duration_seconds != null && (
            <span>{formatDuration(call.duration_seconds)}</span>
          )}
          <span>{formatDate(call.created_at)}</span>
        </div>
      </div>

      {call.notes && (
        <p className="text-xs text-muted-foreground leading-relaxed">{call.notes}</p>
      )}

      {call.ai_summary && (
        <div className="rounded-md bg-orange-500/10 border border-orange-500/20 px-2.5 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400 mb-0.5">
            AI Summary
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{call.ai_summary}</p>
        </div>
      )}

      {call.callback_at && (
        <p className="text-[10px] text-amber-400">
          Callback scheduled: {formatDate(call.callback_at)}
        </p>
      )}
    </div>
  )
}

// ─── Sheet content ─────────────────────────────────────────────────────────────

interface LeadDetailSheetProps {
  leadId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCallNow?: (lead: DialerLead) => void
}

export function LeadDetailSheet({
  leadId,
  open,
  onOpenChange,
  onCallNow,
}: LeadDetailSheetProps) {
  const { data, isLoading, error, mutate } = useSWR<LeadDetailData>(
    open && leadId ? `/api/portal/dialer/leads/${leadId}` : null,
    fetcher
  )

  const lead = data?.lead
  const callHistory = data?.callHistory ?? []

  async function handleMarkNotInterested() {
    if (!leadId) return
    await fetch(`/api/portal/dialer/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived", not_interested: true }),
    })
    mutate()
  }

  async function handleScheduleCallback() {
    // Opens callback scheduling — for now just mark status=callback
    if (!leadId) return
    const callbackAt = prompt("Enter callback date/time (e.g. 2026-03-15 10:00 AM):")
    if (!callbackAt) return
    await fetch(`/api/portal/dialer/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "callback", next_call_at: new Date(callbackAt).toISOString() }),
    })
    mutate()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col gap-0 p-0"
      >
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <AlertCircle className="size-8" />
            <p className="text-sm">Failed to load lead details.</p>
          </div>
        )}

        {!isLoading && !error && lead && (
          <>
            {/* Header */}
            <SheetHeader className="border-b px-5 py-4">
              <div className="flex items-start gap-3 pr-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/15 shrink-0">
                  <Building2 className="size-5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="truncate text-base leading-tight">
                    {lead.business_name ?? "Unknown Business"}
                  </SheetTitle>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-2 py-0 border", statusBadgeClass(lead.status))}
                    >
                      {lead.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {lead.attempt_count} attempt{lead.attempt_count !== 1 ? "s" : ""}
                    </span>
                    {lead.demo_booked && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0 border border-emerald-500/30">
                        Demo Booked
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <SheetDescription className="sr-only">
                Lead details for {lead.business_name}
              </SheetDescription>
            </SheetHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Contact info */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact Info
                </p>
                <div className="divide-y divide-border/50">
                  <InfoRow
                    icon={User}
                    label="Owner"
                    value={lead.owner_name ?? lead.first_name}
                  />
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    value={lead.phone_number}
                    href={lead.phone_number ? `tel:${lead.phone_number}` : undefined}
                  />
                  <InfoRow
                    icon={MapPin}
                    label="State"
                    value={lead.state}
                  />
                  <InfoRow
                    icon={Clock}
                    label="Timezone"
                    value={lead.timezone ?? undefined}
                  />
                  <InfoRow
                    icon={Globe}
                    label="Website"
                    value={lead.website}
                    href={
                      lead.website
                        ? lead.website.startsWith("http")
                          ? lead.website
                          : `https://${lead.website}`
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Notes
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {lead.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Call history */}
              <Separator />
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Call History ({callHistory.length})
                </p>
                {callHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No calls logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {callHistory.map((call) => (
                      <CallHistoryCard key={call.id} call={call} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <SheetFooter className="border-t px-5 py-3 flex-row gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-orange-500 text-white hover:bg-orange-600"
                onClick={() => {
                  if (lead && onCallNow) onCallNow(lead)
                  onOpenChange(false)
                }}
              >
                <Gauge className="size-3.5" />
                Call Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={handleScheduleCallback}
              >
                <CalendarClock className="size-3.5" />
                Schedule Callback
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10"
                onClick={handleMarkNotInterested}
              >
                <XCircle className="size-3.5" />
                Not Interested
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
