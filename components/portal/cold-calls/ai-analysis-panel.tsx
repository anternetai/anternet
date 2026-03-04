"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sparkles,
  Check,
  ChevronRight,
  Loader2,
  Calendar,
  FileText,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Edit3,
} from "lucide-react"
import type { AIAnalysisResult, AIPanelState } from "@/lib/dialer/ai-types"
import type { DialerOutcome } from "@/lib/dialer/types"
import { CallTranscript, parseTranscript } from "./call-transcript"
import { CoachingPanel, generateCoachingTips } from "./coaching-panel"

interface AIAnalysisPanelProps {
  open: boolean
  onClose: () => void
  result: AIAnalysisResult | null
  businessName?: string
  onAcceptAll: (data: {
    disposition: DialerOutcome
    notes: string
    followUpDate?: string
  }) => Promise<void>
  onOverride: (data: {
    disposition: DialerOutcome
    notes: string
    followUpDate?: string
  }) => Promise<void>
}

const OUTCOME_LABELS: Record<DialerOutcome, string> = {
  no_answer: "No Answer",
  voicemail: "Voicemail",
  gatekeeper: "Gatekeeper",
  conversation: "Answered",
  demo_booked: "Booked Demo 🎉",
  not_interested: "Not Interested",
  wrong_number: "Wrong Number",
  callback: "Callback",
}

const OUTCOME_OPTIONS: DialerOutcome[] = [
  "no_answer",
  "voicemail",
  "gatekeeper",
  "conversation",
  "demo_booked",
  "not_interested",
  "wrong_number",
  "callback",
]

export function AIAnalysisPanel({
  open,
  onClose,
  result,
  businessName,
  onAcceptAll,
  onOverride,
}: AIAnalysisPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedDisposition, setEditedDisposition] = useState<DialerOutcome | "">("")
  const [editedNotes, setEditedNotes] = useState("")
  const [editedFollowUp, setEditedFollowUp] = useState("")
  const [saving, setSaving] = useState(false)

  const isLoading = result?.panelState === "loading"
  const isReady = result?.panelState === "ready"
  const isAccepted = result?.panelState === "accepted"
  const isOverridden = result?.panelState === "overridden"

  const disposition = isEditing
    ? (editedDisposition as DialerOutcome) || result?.suggestedDisposition
    : result?.suggestedDisposition

  const notes = isEditing ? editedNotes : result?.suggestedNotes
  const followUp = isEditing ? editedFollowUp : result?.suggestedFollowUpDate

  // Parse transcript segments from raw text
  const transcriptSegments = result?.transcript?.length
    ? result.transcript
    : result?.rawTranscript
    ? parseTranscript(result.rawTranscript)
    : []

  // Generate coaching tips if not provided
  const coachingTips =
    result?.coachingTips ||
    generateCoachingTips(result?.keyPoints || [], result?.objections || [])

  function startEditing() {
    setEditedDisposition(result?.suggestedDisposition || "")
    setEditedNotes(result?.suggestedNotes || "")
    setEditedFollowUp(result?.suggestedFollowUpDate || "")
    setIsEditing(true)
  }

  async function handleAcceptAll() {
    if (!result?.suggestedDisposition) return
    setSaving(true)
    try {
      await onAcceptAll({
        disposition: result.suggestedDisposition,
        notes: result.suggestedNotes || "",
        followUpDate: result.suggestedFollowUpDate,
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveOverride() {
    if (!editedDisposition) return
    setSaving(true)
    try {
      await onOverride({
        disposition: editedDisposition as DialerOutcome,
        notes: editedNotes,
        followUpDate: editedFollowUp || undefined,
      })
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        {/* Header */}
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-orange-500" />
            AI Call Analysis
            {businessName && (
              <span className="text-sm font-normal text-muted-foreground" data-pii>
                — {businessName}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-orange-500" />
              <p className="text-sm">Analyzing your call...</p>
              <p className="text-xs opacity-60">Transcribing audio and generating insights</p>
            </div>
          )}

          {(isAccepted || isOverridden) && (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="text-sm font-medium">
                {isAccepted ? "AI suggestions accepted!" : "Override saved!"}
              </p>
              <p className="text-xs text-muted-foreground">Call logged successfully.</p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {isReady && result && (
            <Tabs defaultValue="disposition" className="flex h-full flex-col">
              <TabsList className="mx-4 mt-3 grid grid-cols-3">
                <TabsTrigger value="disposition" className="text-xs">
                  <FileText className="mr-1.5 size-3" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="transcript" className="text-xs">
                  <MessageSquare className="mr-1.5 size-3" />
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="coaching" className="text-xs">
                  <TrendingUp className="mr-1.5 size-3" />
                  Coaching
                </TabsTrigger>
              </TabsList>

              {/* ── Summary Tab ─────────────────────────── */}
              <TabsContent value="disposition" className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
                {/* AI Suggested Disposition */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Sparkles className="size-3 text-orange-400" />
                    AI-Suggested Outcome
                  </label>
                  {!isEditing ? (
                    <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className="border-orange-500/40 text-orange-400 text-sm"
                      >
                        {result.suggestedDisposition
                          ? OUTCOME_LABELS[result.suggestedDisposition]
                          : "Unknown"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">AI suggested</span>
                    </div>
                  ) : (
                    <Select
                      value={editedDisposition}
                      onValueChange={(v) => setEditedDisposition(v as DialerOutcome)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select outcome..." />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTCOME_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o} className="text-sm">
                            {OUTCOME_LABELS[o]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* AI Notes */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <FileText className="size-3" />
                    AI-Generated Notes
                  </label>
                  {!isEditing ? (
                    <div className="rounded-lg border bg-muted/20 px-3 py-2.5" data-pii>
                      <p className="whitespace-pre-wrap text-sm">
                        {result.suggestedNotes || (
                          <span className="text-muted-foreground">No notes generated</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <Textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                      placeholder="Add your notes..."
                    />
                  )}
                </div>

                {/* Follow-up date */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Calendar className="size-3" />
                    Follow-Up Date
                  </label>
                  {!isEditing ? (
                    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                      <p className="text-sm">
                        {result.suggestedFollowUpDate ? (
                          new Date(result.suggestedFollowUpDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        ) : (
                          <span className="text-muted-foreground">No follow-up suggested</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <Input
                      type="datetime-local"
                      value={editedFollowUp}
                      onChange={(e) => setEditedFollowUp(e.target.value)}
                      className="h-9 text-sm"
                    />
                  )}
                </div>

                {/* Summary */}
                {result.summary && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Call Summary
                    </label>
                    <Card data-pii>
                      <CardContent className="py-3">
                        <p className="text-sm text-muted-foreground">{result.summary}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Key Points */}
                {result.keyPoints && result.keyPoints.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Key Points
                    </label>
                    <ul className="space-y-1" data-pii>
                      {result.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Objections */}
                {result.objections && result.objections.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Objections Raised
                    </label>
                    <ul className="space-y-1" data-pii>
                      {result.objections.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-orange-400" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Steps */}
                {result.nextSteps && result.nextSteps.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Recommended Next Steps
                    </label>
                    <ul className="space-y-1" data-pii>
                      {result.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-blue-400" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              {/* ── Transcript Tab ───────────────────────── */}
              <TabsContent value="transcript" className="flex-1 overflow-y-auto px-4 pb-4">
                <div data-pii>
                  <CallTranscript
                    segments={transcriptSegments}
                    businessName={businessName}
                    className="border-0 shadow-none p-0"
                  />
                </div>
              </TabsContent>

              {/* ── Coaching Tab ─────────────────────────── */}
              <TabsContent value="coaching" className="flex-1 overflow-y-auto px-4 pb-4">
                <CoachingPanel
                  grades={result.grades}
                  tips={coachingTips}
                  className="border-0 shadow-none p-0"
                />
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer actions */}
        {isReady && (
          <div className="border-t bg-muted/20 p-4">
            {!isEditing ? (
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 bg-orange-600 text-white hover:bg-orange-500"
                  onClick={handleAcceptAll}
                  disabled={saving || !result?.suggestedDisposition}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Accept All
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={startEditing}
                  disabled={saving}
                >
                  <Edit3 className="size-4" />
                  Override
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={handleSaveOverride}
                  disabled={saving || !editedDisposition}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save Override
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
