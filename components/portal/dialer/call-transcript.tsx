"use client"

import { useEffect, useRef } from "react"
import {
  Mic,
  MicOff,
  Brain,
  Loader2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Target,
  ArrowRight,
  ClipboardList,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DialerOutcome, AISummaryResponse } from "@/lib/dialer/types"

const DISPOSITION_LABELS: Record<string, { label: string; color: string }> = {
  no_answer: { label: "No Answer", color: "text-muted-foreground" },
  voicemail: { label: "Voicemail", color: "text-blue-500" },
  conversation: { label: "Conversation", color: "text-emerald-500" },
  demo_booked: { label: "Demo Booked!", color: "text-purple-500" },
  not_interested: { label: "Not Interested", color: "text-red-500" },
  callback: { label: "Callback", color: "text-orange-500" },
  wrong_number: { label: "Wrong Number", color: "text-red-400" },
}

interface CallTranscriptProps {
  isRecording: boolean
  liveTranscript: string
  interimText: string
  aiSummary: {
    summary: string | null
    disposition: string | null
    notes: string | null
    keyPoints: string[]
    objections?: string[]
    nextSteps?: string[]
  } | null
  isAnalyzing: boolean
  onSelectDisposition?: (disposition: DialerOutcome) => void
  onApplyNotes?: (notes: string) => void
}

export function CallTranscript({
  isRecording,
  liveTranscript,
  interimText,
  aiSummary,
  isAnalyzing,
  onSelectDisposition,
  onApplyNotes,
}: CallTranscriptProps) {
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [liveTranscript, interimText])

  // Show AI summary post-call
  if (aiSummary) {
    return (
      <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Brain className="size-4 text-purple-500" />
            AI Call Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Suggested Disposition */}
          {aiSummary.disposition && (
            <div className="flex items-center gap-2">
              <Target className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Suggested outcome:</span>
              <Badge
                variant="outline"
                className={`cursor-pointer hover:bg-accent ${
                  DISPOSITION_LABELS[aiSummary.disposition]?.color || ""
                }`}
                onClick={() =>
                  onSelectDisposition?.(aiSummary.disposition as DialerOutcome)
                }
              >
                {DISPOSITION_LABELS[aiSummary.disposition]?.label || aiSummary.disposition}
              </Badge>
            </div>
          )}

          {/* Summary */}
          {aiSummary.summary && (
            <div className="rounded-lg border bg-background/50 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Summary</p>
              <p className="text-sm">{aiSummary.summary}</p>
            </div>
          )}

          {/* Key Points */}
          {aiSummary.keyPoints && aiSummary.keyPoints.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <MessageSquare className="size-3" />
                Key Points
              </p>
              <ul className="space-y-1">
                {aiSummary.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Objections */}
          {aiSummary.objections && aiSummary.objections.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <AlertTriangle className="size-3" />
                Objections
              </p>
              <ul className="space-y-1">
                {aiSummary.objections.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {aiSummary.nextSteps && aiSummary.nextSteps.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <ArrowRight className="size-3" />
                Next Steps
              </p>
              <ul className="space-y-1">
                {aiSummary.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="mt-0.5 size-3 shrink-0 text-blue-500" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          {aiSummary.notes && (
            <div className="flex items-start gap-2 rounded-lg border bg-background/50 p-3">
              <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Suggested Notes
                </p>
                <p className="text-sm">{aiSummary.notes}</p>
                {onApplyNotes && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 gap-1 text-xs"
                    onClick={() => onApplyNotes(aiSummary.notes!)}
                  >
                    <CheckCircle2 className="size-3" />
                    Apply to Notes
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Show analyzing spinner
  if (isAnalyzing) {
    return (
      <Card className="border-purple-500/20">
        <CardContent className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="size-5 animate-spin text-purple-500" />
          <span className="text-sm font-medium text-muted-foreground">
            Analyzing call transcript...
          </span>
        </CardContent>
      </Card>
    )
  }

  // Show live transcript during call
  if (!isRecording && !liveTranscript) return null

  return (
    <Card className={isRecording ? "border-emerald-500/20" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {isRecording ? (
            <>
              <Mic className="size-4 animate-pulse text-red-500" />
              <span>Live Transcript</span>
              <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30">
                Recording
              </Badge>
            </>
          ) : (
            <>
              <FileText className="size-4 text-muted-foreground" />
              <span>Call Transcript</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={transcriptRef}
          className="max-h-40 min-h-[60px] overflow-y-auto rounded-lg border bg-muted/20 p-3 text-sm"
        >
          {liveTranscript ? (
            <>
              <span>{liveTranscript}</span>
              {interimText && (
                <span className="text-muted-foreground italic"> {interimText}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground italic">
              {isRecording
                ? "Listening... speak to start transcription"
                : "No transcript available"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
