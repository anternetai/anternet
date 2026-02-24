"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ChevronDown,
  ChevronUp,
  Mic,
  User,
  AlertTriangle,
  Target,
  Handshake,
  MessageSquare,
  Clock,
} from "lucide-react"
import type { TranscriptSegment } from "@/lib/dialer/ai-types"

interface CallTranscriptProps {
  segments: TranscriptSegment[]
  durationSeconds?: number
  businessName?: string
  className?: string
}

const HIGHLIGHT_CONFIG = {
  objection: {
    label: "Objection",
    color: "bg-red-500/10 border-red-500/30",
    badgeColor: "border-red-500/30 text-red-400",
    icon: AlertTriangle,
    iconColor: "text-red-400",
  },
  pitch: {
    label: "Pitch",
    color: "bg-orange-500/10 border-orange-500/30",
    badgeColor: "border-orange-500/30 text-orange-400",
    icon: Target,
    iconColor: "text-orange-400",
  },
  close: {
    label: "Close",
    color: "bg-purple-500/10 border-purple-500/30",
    badgeColor: "border-purple-500/30 text-purple-400",
    icon: Handshake,
    iconColor: "text-purple-400",
  },
  rapport: {
    label: "Rapport",
    color: "bg-emerald-500/10 border-emerald-500/30",
    badgeColor: "border-emerald-500/30 text-emerald-400",
    icon: MessageSquare,
    iconColor: "text-emerald-400",
  },
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function SpeakerLabel({ speaker }: { speaker: "agent" | "prospect" | "unknown" }) {
  if (speaker === "agent") {
    return (
      <div className="flex items-center gap-1">
        <Mic className="size-3 text-orange-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-500">You</span>
      </div>
    )
  }
  if (speaker === "prospect") {
    return (
      <div className="flex items-center gap-1">
        <User className="size-3 text-blue-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-400">Them</span>
      </div>
    )
  }
  return null
}

export function CallTranscript({
  segments,
  durationSeconds,
  businessName,
  className,
}: CallTranscriptProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [highlightFilter, setHighlightFilter] = useState<string | null>(null)

  const highlightCounts = segments.reduce(
    (acc, seg) => {
      if (seg.highlight) acc[seg.highlight] = (acc[seg.highlight] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const filteredSegments = highlightFilter
    ? segments.filter((s) => s.highlight === highlightFilter)
    : segments

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="size-4 text-orange-500" />
            Transcript
            {businessName && (
              <span className="text-xs font-normal text-muted-foreground">— {businessName}</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {durationSeconds && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {formatTime(durationSeconds)}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
            </Button>
          </div>
        </div>

        {/* Highlight filters */}
        {!collapsed && Object.keys(highlightCounts).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2 text-[10px] ${!highlightFilter ? "bg-muted" : ""}`}
              onClick={() => setHighlightFilter(null)}
            >
              All ({segments.length})
            </Button>
            {(Object.entries(highlightCounts) as [keyof typeof HIGHLIGHT_CONFIG, number][]).map(
              ([key, count]) => {
                const cfg = HIGHLIGHT_CONFIG[key]
                if (!cfg) return null
                return (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className={`h-6 gap-1 px-2 text-[10px] ${highlightFilter === key ? "bg-muted" : ""}`}
                    onClick={() => setHighlightFilter(highlightFilter === key ? null : key)}
                  >
                    <cfg.icon className={`size-2.5 ${cfg.iconColor}`} />
                    {cfg.label} ({count})
                  </Button>
                )
              }
            )}
          </div>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0">
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {filteredSegments.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No transcript segments available
              </p>
            ) : (
              <TooltipProvider>
                {filteredSegments.map((seg, i) => {
                  const isAgent = seg.speaker === "agent"
                  const highlightCfg = seg.highlight
                    ? HIGHLIGHT_CONFIG[seg.highlight]
                    : null

                  return (
                    <div
                      key={i}
                      className={`flex gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        highlightCfg
                          ? highlightCfg.color
                          : isAgent
                          ? "border-orange-500/10 bg-orange-500/5"
                          : "border-border/50 bg-muted/20"
                      }`}
                    >
                      {/* Timestamp + speaker */}
                      <div className="flex w-12 shrink-0 flex-col items-start gap-0.5 pt-0.5">
                        <span className="tabular-nums text-[10px] text-muted-foreground">
                          {formatTime(seg.startTime)}
                        </span>
                        <SpeakerLabel speaker={seg.speaker} />
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <p className="leading-relaxed text-sm">{seg.text}</p>
                      </div>

                      {/* Highlight badge */}
                      {highlightCfg && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="shrink-0 pt-0.5">
                              <Badge
                                variant="outline"
                                className={`h-4 gap-0.5 px-1 text-[9px] ${highlightCfg.badgeColor}`}
                              >
                                <highlightCfg.icon className={`size-2 ${highlightCfg.iconColor}`} />
                                {highlightCfg.label}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            {seg.highlight === "objection" &&
                              "Prospect raised an objection here"}
                            {seg.highlight === "pitch" &&
                              "Product/value pitch moment"}
                            {seg.highlight === "close" &&
                              "Close attempt or ask"}
                            {seg.highlight === "rapport" &&
                              "Rapport building moment"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )
                })}
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Parse a plain text transcript into segments.
 * Handles formats like:
 *   "Agent: text\nProspect: text"
 *   "You: text\nThem: text"
 *   Raw text (all marked as unknown)
 */
export function parseTranscript(raw: string): TranscriptSegment[] {
  if (!raw) return []

  const lines = raw.trim().split("\n").filter(Boolean)
  const segments: TranscriptSegment[] = []
  let time = 0

  for (const line of lines) {
    const agentMatch = line.match(/^(agent|you|anthony|rep|caller):\s*/i)
    const prospectMatch = line.match(/^(prospect|them|customer|client|owner):\s*/i)

    let speaker: "agent" | "prospect" | "unknown" = "unknown"
    let text = line

    if (agentMatch) {
      speaker = "agent"
      text = line.slice(agentMatch[0].length)
    } else if (prospectMatch) {
      speaker = "prospect"
      text = line.slice(prospectMatch[0].length)
    }

    const wordCount = text.split(" ").length
    const estDuration = Math.max(2, wordCount * 0.4) // ~150 wpm

    segments.push({
      speaker,
      text: text.trim(),
      startTime: time,
      endTime: time + estDuration,
    })
    time += estDuration + 0.5 // small gap between speakers
  }

  return segments
}
