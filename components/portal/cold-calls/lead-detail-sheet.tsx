"use client"

import { useState, useRef, useCallback } from "react"
import useSWR from "swr"
import {
  Phone,
  User,
  Globe,
  MapPin,
  Clock,
  ExternalLink,
  Gauge,
  XCircle,
  CalendarClock,
  Loader2,
  AlertCircle,
  Building2,
  FileText,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  CalendarX,
  PhoneOff,
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
import { Textarea } from "@/components/ui/textarea"
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

function formatDateET(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " ET"
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// ─── Telnyx call log type ──────────────────────────────────────────────────────

interface TelnyxCallLog {
  id: string
  created_at: string
  duration: number | null
  status: string | null
  direction: string | null
  from_number: string | null
  to_number: string | null
  ai_summary: string | null
  transcription: string | null
  notes: string | null
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
  lead: DialerLead & { last_transcript?: string | null; last_ai_summary?: string | null }
  callHistory: (DialerCallHistory & { duration_seconds?: number; ai_summary?: string })[]
  recordings: LeadRecording[]
  telnyxLogs: TelnyxCallLog[]
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

// ─── Collapsible section ───────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string
  icon: typeof FileText
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left mb-2 hover:opacity-80 transition-opacity"
      >
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-1">
          {title}
        </span>
        {badge && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mr-1">
            {badge}
          </Badge>
        )}
        {open ? (
          <ChevronUp className="size-3.5 text-muted-foreground/60" />
        ) : (
          <ChevronDown className="size-3.5 text-muted-foreground/60" />
        )}
      </button>
      {open && <div className="animate-in slide-in-from-top-1 duration-150">{children}</div>}
    </div>
  )
}

// ─── Notes renderer ────────────────────────────────────────────────────────────

function NotesRenderer({ notes }: { notes: string }) {
  // Parse timestamp-prefixed lines like "[Mar 11, 2026, 10:30 AM ET] note text"
  const lines = notes.split("\n")
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const tsMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/)
        if (tsMatch) {
          return (
            <div key={i} className="text-sm">
              <span className="text-[10px] font-mono text-muted-foreground mr-1.5">
                [{tsMatch[1]}]
              </span>
              <span>{tsMatch[2]}</span>
            </div>
          )
        }
        if (!line.trim()) return null
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {line}
          </p>
        )
      })}
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

// ─── Telnyx call log card ──────────────────────────────────────────────────────

function TelnyxLogCard({ log }: { log: TelnyxCallLog }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
            {log.status ?? "unknown"}
          </Badge>
          {log.direction && (
            <span className="text-[10px] text-muted-foreground capitalize">{log.direction}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {log.duration != null && (
            <span>{formatDuration(log.duration)}</span>
          )}
          <span>{formatDate(log.created_at)}</span>
        </div>
      </div>

      {log.ai_summary && (
        <div className="rounded-md bg-orange-500/10 border border-orange-500/20 px-2.5 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400 mb-0.5">
            AI Summary
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{log.ai_summary}</p>
        </div>
      )}

      {log.transcription && (
        <CollapsibleSection title="Transcript" icon={MessageSquare}>
          <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans max-h-40 overflow-y-auto rounded bg-muted/40 p-2">
            {log.transcription}
          </pre>
        </CollapsibleSection>
      )}
    </div>
  )
}

// ─── Add Note box ──────────────────────────────────────────────────────────────

function AddNoteBox({
  leadId,
  onSaved,
}: {
  leadId: string
  onSaved: (notes: string) => void
}) {
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  async function handleSave() {
    if (!note.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/portal/dialer/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appendNote: note.trim() }),
      })
      const data = await res.json()
      if (data.lead?.notes !== undefined) {
        onSaved(data.lead.notes)
        setNote("")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        ref={textRef}
        placeholder="Add a note…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="text-sm resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSave()
          }
        }}
      />
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">⌘+Enter to save</p>
        <Button
          size="sm"
          disabled={!note.trim() || saving}
          onClick={handleSave}
          className="gap-1.5 h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Send className="size-3" />
          {saving ? "Saving…" : "Save Note"}
        </Button>
      </div>
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

  const [localNotes, setLocalNotes] = useState<string | null>(null)

  const lead = data?.lead
  const callHistory = data?.callHistory ?? []
  const telnyxLogs = data?.telnyxLogs ?? []

  // Use local notes if we've just added one (optimistic)
  const displayNotes = localNotes !== null ? localNotes : (lead?.notes ?? null)
  const displayAiSummary = lead?.last_ai_summary ?? null
  const displayTranscript = lead?.last_transcript ?? null

  const handleNotesSaved = useCallback((newNotes: string) => {
    setLocalNotes(newNotes)
  }, [])

  async function handleMarkNoShow() {
    if (!leadId) return
    await fetch(`/api/portal/dialer/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo_booked: false, status: "in_progress" }),
    })
    mutate()
  }

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

  // Reset local notes when sheet closes/reopens
  const handleOpenChange = (v: boolean) => {
    if (!v) setLocalNotes(null)
    onOpenChange(v)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
                    {lead.last_outcome && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-2 py-0 border", outcomeBadgeClass(lead.last_outcome))}
                      >
                        {formatOutcomeLabel(lead.last_outcome)}
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
                  {lead.demo_booked && lead.demo_date && (
                    <InfoRow
                      icon={CalendarClock}
                      label="Demo Date (ET)"
                      value={formatDateET(lead.demo_date)}
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <CollapsibleSection title="Notes" icon={FileText} defaultOpen={true}>
                {displayNotes ? (
                  <div className="mb-3 rounded-lg bg-muted/30 border p-3">
                    <NotesRenderer notes={displayNotes} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">No notes yet.</p>
                )}
                <AddNoteBox leadId={lead.id} onSaved={handleNotesSaved} />
              </CollapsibleSection>

              {/* AI Summary */}
              {displayAiSummary && (
                <>
                  <Separator />
                  <CollapsibleSection title="AI Summary" icon={Sparkles} defaultOpen={true}>
                    <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {displayAiSummary}
                      </p>
                    </div>
                  </CollapsibleSection>
                </>
              )}

              {/* Full Transcript */}
              {displayTranscript && (
                <>
                  <Separator />
                  <CollapsibleSection title="Last Transcript" icon={MessageSquare} defaultOpen={false}>
                    <div className="rounded-lg bg-muted/30 border p-3 max-h-64 overflow-y-auto">
                      <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                        {displayTranscript}
                      </pre>
                    </div>
                  </CollapsibleSection>
                </>
              )}

              {/* Telnyx call logs */}
              {telnyxLogs.length > 0 && (
                <>
                  <Separator />
                  <CollapsibleSection
                    title="Telnyx Call Logs"
                    icon={Phone}
                    defaultOpen={false}
                    badge={String(telnyxLogs.length)}
                  >
                    <div className="space-y-2">
                      {telnyxLogs.map((log) => (
                        <TelnyxLogCard key={log.id} log={log} />
                      ))}
                    </div>
                  </CollapsibleSection>
                </>
              )}

              {/* Dialer call history */}
              {callHistory.length > 0 && (
                <>
                  <Separator />
                  <CollapsibleSection
                    title={`Dialer Call History`}
                    icon={Phone}
                    defaultOpen={false}
                    badge={String(callHistory.length)}
                  >
                    <div className="space-y-2">
                      {callHistory.map((call) => (
                        <CallHistoryCard key={call.id} call={call} />
                      ))}
                    </div>
                  </CollapsibleSection>
                </>
              )}
            </div>

            {/* Footer actions */}
            <SheetFooter className="border-t px-5 py-3 flex-row flex-wrap gap-2">
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
              {lead.demo_booked && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-amber-400 hover:text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={handleMarkNoShow}
                >
                  <CalendarX className="size-3.5" />
                  No-Show
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleScheduleCallback}
              >
                <CalendarClock className="size-3.5" />
                Reschedule
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10"
                onClick={handleMarkNotInterested}
              >
                <PhoneOff className="size-3.5" />
                Not Interested
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
