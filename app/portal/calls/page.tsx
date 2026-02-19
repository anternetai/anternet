"use client"

import { use, Suspense, useState, useCallback } from "react"
import { redirect } from "next/navigation"
import useSWR from "swr"
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Filter,
  RefreshCw,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PhoneOff,
  Loader2,
  FileText,
  Download,
} from "lucide-react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

// ─── Types ────────────────────────────────────────────────

interface TelnyxCallLog {
  id: string
  created_at: string
  updated_at: string
  lead_id: string | null
  telnyx_call_control_id: string | null
  telnyx_call_session_id: string | null
  direction: "inbound" | "outbound"
  from_number: string | null
  to_number: string | null
  status: string
  duration: number
  recording_url: string | null
  recording_id: string | null
  transcription: string | null
  ai_summary: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
}

interface CallsResponse {
  calls: TelnyxCallLog[]
  count: number
}

// ─── Status config ────────────────────────────────────────

const CALL_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Phone }
> = {
  initiated: {
    label: "Initiated",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: Phone,
  },
  ringing: {
    label: "Ringing",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    icon: Phone,
  },
  answered: {
    label: "Answered",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: CheckCircle2,
  },
  bridged: {
    label: "Bridged",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    icon: Phone,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: XCircle,
  },
  busy: {
    label: "Busy",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    icon: PhoneOff,
  },
  no_answer: {
    label: "No Answer",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    icon: AlertCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    icon: XCircle,
  },
}

// ─── Helpers ──────────────────────────────────────────────

function formatPhone(phone: string | null): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith("1"))
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return phone
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── Fetcher ──────────────────────────────────────────────

async function fetchCalls(
  params: Record<string, string>
): Promise<CallsResponse> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`/api/telnyx/calls?${qs}`)
  if (!res.ok) throw new Error("Failed to fetch calls")
  return res.json()
}

// ─── Components ───────────────────────────────────────────

function CallStatusBadge({ status }: { status: string }) {
  const config = CALL_STATUS_CONFIG[status] || {
    label: status,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    icon: Phone,
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
    >
      <config.icon className="size-3" />
      {config.label}
    </span>
  )
}

function DirectionIcon({ direction }: { direction: "inbound" | "outbound" }) {
  if (direction === "inbound") {
    return (
      <span title="Inbound call">
        <PhoneIncoming className="size-4 text-blue-500" />
      </span>
    )
  }
  return (
    <span title="Outbound call">
      <PhoneOutgoing className="size-4 text-emerald-500" />
    </span>
  )
}

function RecordingPlayer({
  url,
  callId,
}: {
  url: string
  callId: string
}) {
  return (
    <div className="flex items-center gap-2">
      <audio controls preload="none" className="h-8 w-48">
        <source src={url} type="audio/mpeg" />
        Your browser does not support audio playback.
      </audio>
      <a
        href={url}
        download={`call-${callId}.mp3`}
        className="text-muted-foreground hover:text-foreground"
        title="Download recording"
      >
        <Download className="size-4" />
      </a>
    </div>
  )
}

// ─── Call Detail Dialog ───────────────────────────────────

function CallDetailDialog({
  call,
  open,
  onClose,
  onNotesUpdate,
}: {
  call: TelnyxCallLog
  open: boolean
  onClose: () => void
  onNotesUpdate: (id: string, notes: string) => void
}) {
  const [notes, setNotes] = useState(call.notes || "")
  const [saving, setSaving] = useState(false)

  const saveNotes = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/telnyx/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: call.id, notes }),
      })
      if (res.ok) {
        onNotesUpdate(call.id, notes)
      }
    } catch (err) {
      console.error("Failed to save notes:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DirectionIcon direction={call.direction} />
            Call Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Call info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">From</span>
              <p className="font-mono font-medium">
                {formatPhone(call.from_number)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">To</span>
              <p className="font-mono font-medium">
                {formatPhone(call.to_number)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <div className="mt-0.5">
                <CallStatusBadge status={call.status} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-mono font-medium">
                {formatDuration(call.duration)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Time</span>
              <p>{formatDateTime(call.created_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Direction</span>
              <p className="capitalize">{call.direction}</p>
            </div>
          </div>

          {/* Recording */}
          {call.recording_url && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Recording</span>
              <RecordingPlayer url={call.recording_url} callId={call.id} />
            </div>
          )}

          {/* Transcription */}
          {call.transcription && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">
                Transcription
              </span>
              <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm">
                {call.transcription}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {call.ai_summary && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">AI Summary</span>
              <div className="rounded-lg border bg-blue-500/5 p-3 text-sm">
                {call.ai_summary}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Notes</span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this call..."
              rows={3}
              className="resize-none"
            />
            <Button
              size="sm"
              onClick={saveNotes}
              disabled={saving || notes === (call.notes || "")}
            >
              {saving ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <FileText className="mr-1 size-3" />
              )}
              Save Notes
            </Button>
          </div>

          {/* Metadata */}
          {call.metadata && Object.keys(call.metadata).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Raw metadata
              </summary>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2">
                {JSON.stringify(call.metadata, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Content ─────────────────────────────────────────

function CallsContent() {
  const { user } = use(PortalAuthContext)

  if (!user) return null
  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  const [statusFilter, setStatusFilter] = useState("all")
  const [directionFilter, setDirectionFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCall, setSelectedCall] = useState<TelnyxCallLog | null>(null)

  const params: Record<string, string> = { limit: "50" }
  if (statusFilter && statusFilter !== "all") params.status = statusFilter
  if (directionFilter && directionFilter !== "all") params.direction = directionFilter
  if (searchQuery) params.search = searchQuery

  const {
    data,
    isLoading,
    mutate,
  } = useSWR(
    ["telnyx-calls", statusFilter, directionFilter, searchQuery],
    () => fetchCalls(params),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  )

  const calls = data?.calls || []
  const totalCount = data?.count || 0

  const handleNotesUpdate = useCallback(
    (id: string, notes: string) => {
      mutate(
        (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            calls: prev.calls.map((c) =>
              c.id === id ? { ...c, notes } : c
            ),
          }
        },
        false
      )
    },
    [mutate]
  )

  // Stats
  const completedCalls = calls.filter((c) => c.status === "completed").length
  const answeredCalls = calls.filter(
    (c) => c.status === "answered" || c.status === "completed"
  ).length
  const avgDuration =
    calls.filter((c) => c.duration > 0).length > 0
      ? Math.round(
          calls
            .filter((c) => c.duration > 0)
            .reduce((sum, c) => sum + c.duration, 0) /
            calls.filter((c) => c.duration > 0).length
        )
      : 0
  const withRecording = calls.filter((c) => c.recording_url).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Call Logs</h1>
          <p className="text-sm text-muted-foreground">
            Telnyx voice call history, recordings, and transcriptions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="gap-1.5"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Phone className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <CheckCircle2 className="size-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{answeredCalls}</p>
                <p className="text-xs text-muted-foreground">Answered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2">
                <Clock className="size-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatDuration(avgDuration)}</p>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Play className="size-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{withRecording}</p>
                <p className="text-xs text-muted-foreground">Recordings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search phone or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-1.5 size-3.5" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Call list */}
      <Card>
        <CardContent className="p-0">
          {isLoading && calls.length === 0 ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Phone className="mb-4 size-12 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold">No calls yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Call logs will appear here as calls are made through Telnyx.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Recording</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCall(call)}
                  >
                    <TableCell>
                      <DirectionIcon direction={call.direction} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono text-sm font-medium">
                          {formatPhone(
                            call.direction === "outbound"
                              ? call.to_number
                              : call.from_number
                          )}
                        </p>
                        {call.notes && (
                          <p className="max-w-xs truncate text-xs text-muted-foreground">
                            {call.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CallStatusBadge status={call.status} />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {formatDuration(call.duration)}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {call.recording_url ? (
                        <RecordingPlayer
                          url={call.recording_url}
                          callId={call.id}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(call.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {(call.transcription || call.ai_summary) && (
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          title="Has transcription"
                        >
                          <FileText className="size-3" />
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination info */}
      {totalCount > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {calls.length} of {totalCount} calls
        </p>
      )}

      {/* Detail dialog */}
      {selectedCall && (
        <CallDetailDialog
          call={selectedCall}
          open={!!selectedCall}
          onClose={() => setSelectedCall(null)}
          onNotesUpdate={handleNotesUpdate}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────

export default function CallsPage() {
  return (
    <Suspense fallback={<CallsSkeleton />}>
      <CallsContent />
    </Suspense>
  )
}

function CallsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-96" />
    </div>
  )
}
