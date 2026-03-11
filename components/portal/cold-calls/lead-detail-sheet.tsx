"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import {
  Phone,
  User,
  Globe,
  MapPin,
  Clock,
  ExternalLink,
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
  PhoneForwarded,
  Ban,
  Gauge,
  CalendarClock,
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

// ─── Badge utils ───────────────────────────────────────────────────────────────

export function statusBadgeClass(status: DialerStatus | string): string {
  const m: Record<string, string> = {
    queued:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
    in_progress: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    callback:    "bg-amber-500/10 text-amber-400 border-amber-500/20",
    completed:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    archived:    "bg-muted text-muted-foreground border-border",
  }
  return m[status] ?? "bg-muted text-muted-foreground border-border"
}

export function outcomeBadgeClass(outcome: DialerOutcome | string): string {
  const m: Record<string, string> = {
    no_answer:      "bg-muted text-muted-foreground border-border",
    voicemail:      "bg-slate-500/10 text-slate-400 border-slate-500/20",
    gatekeeper:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
    conversation:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
    demo_booked:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    not_interested: "bg-red-500/10 text-red-400 border-red-500/20",
    wrong_number:   "bg-orange-500/10 text-orange-400 border-orange-500/20",
    callback:       "bg-amber-500/10 text-amber-400 border-amber-500/20",
  }
  return m[outcome] ?? "bg-muted text-muted-foreground border-border"
}

function fmtOutcome(o: string) {
  return o.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  })
}

function fmtDateET(s: string) {
  return new Date(s).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }) + " ET"
}

function fmtDuration(sec: number | null | undefined) {
  if (!sec) return null
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TelnyxLog {
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

interface LeadRecording {
  id: string; created_at: string; duration_seconds: number
  ai_summary: string; ai_disposition: string; raw_transcript: string
}

type RichLead = DialerLead & { last_transcript?: string | null; last_ai_summary?: string | null }

interface LeadDetailData {
  lead: RichLead
  callHistory: (DialerCallHistory & { duration_seconds?: number; ai_summary?: string })[]
  recordings: LeadRecording[]
  telnyxLogs: TelnyxLog[]
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, href, mono }: {
  icon: typeof Phone; label: string; value: string | null | undefined; href?: string; mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 py-1.5 first:pt-0 last:pb-0">
      <Icon className="mt-[3px] w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 leading-none mb-0.5">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors truncate">
            <span className="truncate">{value}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <p className={cn("text-sm font-medium truncate", mono && "font-mono text-xs")}>{value}</p>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, badge, defaultOpen = true, children }: {
  title: string; icon: typeof FileText; badge?: string | number
  defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 py-1 hover:opacity-70 transition-opacity">
        <Icon className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
        <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          {title}
        </span>
        {badge !== undefined && (
          <span className="text-[10px] font-mono text-muted-foreground/50 mr-1">{badge}</span>
        )}
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
        }
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

function NotesBlock({ text }: { text: string }) {
  // Parse timestamp lines like "[Mar 11, 2026, 10:30 AM ET] note text"
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return null
        const m = line.match(/^\[([^\]]+)\]\s*(.*)$/)
        if (m) {
          return (
            <div key={i}>
              <span className="font-mono text-[10px] text-muted-foreground/50 mr-1.5">[{m[1]}]</span>
              <span className="text-muted-foreground">{m[2]}</span>
            </div>
          )
        }
        return <p key={i} className="text-muted-foreground">{line}</p>
      })}
    </div>
  )
}

function AISummaryBlock({ text }: { text: string }) {
  return (
    <div className="rounded-lg px-3.5 py-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap"
      style={{ background: "oklch(0.65 0.18 55 / 0.06)", border: "1px solid oklch(0.65 0.18 55 / 0.15)" }}>
      {text}
    </div>
  )
}

function TranscriptBlock({ text }: { text: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 max-h-56 overflow-y-auto p-3">
      <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">{text}</pre>
    </div>
  )
}

function CallHistoryItem({ call }: {
  call: DialerCallHistory & { duration_seconds?: number; ai_summary?: string }
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground/50">#{call.attempt_number}</span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", outcomeBadgeClass(call.outcome))}>
            {fmtOutcome(call.outcome)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
          {call.duration_seconds && <span>{fmtDuration(call.duration_seconds)}</span>}
          <span>{fmtDate(call.created_at)}</span>
        </div>
      </div>
      {call.notes && <p className="text-xs text-muted-foreground">{call.notes}</p>}
      {call.ai_summary && (
        <div className="rounded px-2.5 py-1.5 text-xs text-muted-foreground"
          style={{ background: "oklch(0.65 0.18 55 / 0.06)", border: "1px solid oklch(0.65 0.18 55 / 0.12)" }}>
          <span className="font-semibold text-orange-400 text-[10px] uppercase tracking-wide mr-1">AI:</span>
          {call.ai_summary}
        </div>
      )}
    </div>
  )
}

function TelnyxItem({ log }: { log: TelnyxLog }) {
  const [showTranscript, setShowTranscript] = useState(false)
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize border-border">
            {log.status ?? "—"}
          </Badge>
          {log.direction && (
            <span className="text-[10px] text-muted-foreground/50 capitalize">{log.direction}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
          {log.duration != null && <span>{fmtDuration(log.duration)}</span>}
          <span>{fmtDate(log.created_at)}</span>
        </div>
      </div>
      {log.ai_summary && (
        <div className="rounded px-2.5 py-1.5 text-xs text-muted-foreground"
          style={{ background: "oklch(0.65 0.18 55 / 0.06)", border: "1px solid oklch(0.65 0.18 55 / 0.12)" }}>
          <span className="font-semibold text-orange-400 text-[10px] uppercase tracking-wide mr-1">AI:</span>
          {log.ai_summary}
        </div>
      )}
      {log.transcription && (
        <>
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            {showTranscript ? "Hide" : "Show"} transcript
          </button>
          {showTranscript && <TranscriptBlock text={log.transcription} />}
        </>
      )}
    </div>
  )
}

function AddNote({ leadId, onSaved }: { leadId: string; onSaved: (notes: string) => void }) {
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!text.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/portal/dialer/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appendNote: text.trim() }),
      })
      const data = await res.json()
      if (data.lead?.notes !== undefined) {
        onSaved(data.lead.notes)
        setText("")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Add a note…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="text-sm resize-none bg-muted/30"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save() }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/40">⌘ Enter to save</span>
        <Button
          size="sm"
          disabled={!text.trim() || saving}
          onClick={save}
          className="h-7 px-3 gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold"
        >
          <Send className="w-3 h-3" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

interface LeadDetailSheetProps {
  leadId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCallNow?: (lead: DialerLead) => void
}

export function LeadDetailSheet({ leadId, open, onOpenChange, onCallNow }: LeadDetailSheetProps) {
  const { data, isLoading, error, mutate } = useSWR<LeadDetailData>(
    open && leadId ? `/api/portal/dialer/leads/${leadId}` : null,
    fetcher
  )

  // Local note override so UI updates instantly after note save
  const [localNotes, setLocalNotes] = useState<string | null>(null)

  const lead = data?.lead
  const callHistory = data?.callHistory ?? []
  const telnyxLogs = data?.telnyxLogs ?? []

  const notes = localNotes !== null ? localNotes : (lead?.notes ?? null)
  const aiSummary = lead?.last_ai_summary ?? null
  const transcript = lead?.last_transcript ?? null

  const handleNotesSaved = useCallback((n: string) => setLocalNotes(n), [])

  function handleOpenChange(v: boolean) {
    if (!v) setLocalNotes(null)
    onOpenChange(v)
  }

  async function handleMarkNoShow() {
    if (!leadId) return
    await fetch(`/api/portal/dialer/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo_booked: false, status: "in_progress" }),
    })
    mutate()
  }

  async function handleNotInterested() {
    if (!leadId) return
    await fetch(`/api/portal/dialer/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived", not_interested: true }),
    })
    mutate()
  }

  async function handleReschedule() {
    if (!leadId) return
    const raw = prompt("New demo date/time (e.g. 2026-03-20 2:00 PM):")
    if (!raw) return
    const d = new Date(raw)
    if (isNaN(d.getTime())) return alert("Invalid date")
    await fetch(`/api/portal/dialer/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo_date: d.toISOString(), demo_booked: true }),
    })
    mutate()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col gap-0 p-0">

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground px-6 text-center">
            <AlertCircle className="w-8 h-8 opacity-50" />
            <p className="text-sm">Couldn&apos;t load lead details.</p>
            <Button variant="outline" size="sm" onClick={() => mutate()}>Retry</Button>
          </div>
        )}

        {!isLoading && !error && lead && (
          <>
            {/* ── Header ── */}
            <SheetHeader className="border-b px-5 pt-5 pb-4 shrink-0">
              <div className="flex items-start gap-3 pr-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                  style={{ background: "oklch(0.65 0.18 55 / 0.12)" }}>
                  <Building2 className="w-5 h-5" style={{ color: "oklch(0.65 0.18 55)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-base font-semibold leading-tight truncate">
                    {lead.business_name ?? "Unknown Business"}
                  </SheetTitle>
                  {lead.owner_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">{lead.owner_name}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusBadgeClass(lead.status))}>
                      {lead.status.replace(/_/g, " ")}
                    </Badge>
                    {lead.demo_booked && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        Demo booked
                      </Badge>
                    )}
                    {lead.last_outcome && (
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", outcomeBadgeClass(lead.last_outcome))}>
                        {fmtOutcome(lead.last_outcome)}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground/50 ml-0.5">
                      {lead.attempt_count} {lead.attempt_count === 1 ? "call" : "calls"}
                    </span>
                  </div>
                </div>
              </div>
              <SheetDescription className="sr-only">
                Lead details for {lead.business_name}
              </SheetDescription>
            </SheetHeader>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Contact */}
              <Section title="Contact" icon={User} defaultOpen={true}>
                <div className="divide-y divide-border/40">
                  <InfoRow icon={User} label="Owner" value={lead.owner_name ?? lead.first_name} />
                  <InfoRow icon={Phone} label="Phone" value={lead.phone_number} mono
                    href={lead.phone_number ? `tel:${lead.phone_number}` : undefined} />
                  <InfoRow icon={MapPin} label="State" value={lead.state} />
                  <InfoRow icon={Clock} label="Timezone" value={lead.timezone} />
                  <InfoRow icon={Globe} label="Website" value={lead.website}
                    href={lead.website ? (lead.website.startsWith("http") ? lead.website : `https://${lead.website}`) : undefined} />
                  {lead.demo_booked && lead.demo_date && (
                    <InfoRow icon={CalendarClock} label="Demo date (ET)" value={fmtDateET(lead.demo_date)} />
                  )}
                </div>
              </Section>

              <Separator className="opacity-50" />

              {/* Notes */}
              <Section title="Notes" icon={FileText} defaultOpen={true}>
                {notes ? (
                  <div className="rounded-lg border bg-muted/20 p-3 mb-3">
                    <NotesBlock text={notes} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50 mb-3">No notes yet.</p>
                )}
                <AddNote leadId={lead.id} onSaved={handleNotesSaved} />
              </Section>

              {/* AI Summary */}
              {aiSummary && (
                <>
                  <Separator className="opacity-50" />
                  <Section title="AI Summary" icon={Sparkles} defaultOpen={true}>
                    <AISummaryBlock text={aiSummary} />
                  </Section>
                </>
              )}

              {/* Transcript */}
              {transcript && (
                <>
                  <Separator className="opacity-50" />
                  <Section title="Last Transcript" icon={MessageSquare} defaultOpen={false}>
                    <TranscriptBlock text={transcript} />
                  </Section>
                </>
              )}

              {/* Telnyx call logs */}
              {telnyxLogs.length > 0 && (
                <>
                  <Separator className="opacity-50" />
                  <Section title="Call Logs" icon={Phone} badge={telnyxLogs.length} defaultOpen={false}>
                    <div className="space-y-2">
                      {telnyxLogs.map((log) => <TelnyxItem key={log.id} log={log} />)}
                    </div>
                  </Section>
                </>
              )}

              {/* Dialer history */}
              {callHistory.length > 0 && (
                <>
                  <Separator className="opacity-50" />
                  <Section title="Dialer History" icon={Phone} badge={callHistory.length} defaultOpen={false}>
                    <div className="space-y-2">
                      {callHistory.map((c) => <CallHistoryItem key={c.id} call={c} />)}
                    </div>
                  </Section>
                </>
              )}

            </div>

            {/* ── Footer ── */}
            <SheetFooter className="border-t px-4 py-3 flex-row gap-2 shrink-0 flex-wrap">
              {onCallNow && (
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold"
                  onClick={() => { onCallNow(lead); onOpenChange(false) }}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  Call now
                </Button>
              )}
              {lead.demo_booked && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleReschedule}>
                    <PhoneForwarded className="w-3.5 h-3.5" />
                    Reschedule
                  </Button>
                  <Button size="sm" variant="outline"
                    className="gap-1.5 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300"
                    onClick={handleMarkNoShow}>
                    <CalendarX className="w-3.5 h-3.5" />
                    No-show
                  </Button>
                </>
              )}
              {!lead.demo_booked && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleReschedule}>
                  <CalendarClock className="w-3.5 h-3.5" />
                  Callback
                </Button>
              )}
              <Button size="sm" variant="outline"
                className="gap-1.5 text-xs text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
                onClick={handleNotInterested}>
                <Ban className="w-3.5 h-3.5" />
                Not interested
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
