"use client"

import { useEffect, useRef } from "react"
import {
  Brain,
  WifiOff,
  Zap,
  Activity,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CoachingMessage, WSSessionSummary } from "@/lib/dialer/gemini-types"

// ─── Types ──────────────────────────────────────────────────────────────────

interface LiveCoachPanelProps {
  messages: CoachingMessage[]
  isConnected: boolean
  isEnabled: boolean
  latency: number | null
  error: string | null
  sessionSummary: WSSessionSummary | null
  onEnable: () => void
  onDisable: () => void
  className?: string
}

// ─── Urgency Config ─────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  critical: {
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-500",
    label: "ACT NOW",
  },
  adjust: {
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-400",
    dot: "bg-amber-500",
    label: "ADJUST",
  },
  positive: {
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    label: "GREAT",
  },
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LiveCoachPanel({
  messages,
  isConnected,
  isEnabled,
  latency,
  error,
  sessionSummary,
  onEnable,
  onDisable,
  className,
}: LiveCoachPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-purple-400" />
          <span className="text-sm font-medium">Live Coach</span>
          {isEnabled && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0",
                isConnected
                  ? "border-emerald-500/30 text-emerald-400"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {isConnected ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              ) : (
                "CONNECTING"
              )}
            </Badge>
          )}
          {latency !== null && isConnected && (
            <span className="text-[10px] text-muted-foreground/60">
              {latency}ms
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2.5 text-xs",
            isEnabled
              ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
              : "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          )}
          onClick={isEnabled ? onDisable : onEnable}
        >
          {isEnabled ? (
            <>
              <WifiOff className="mr-1 size-3" />
              Stop
            </>
          ) : (
            <>
              <Zap className="mr-1 size-3" />
              Enable
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      {!isEnabled ? (
        // Disabled state
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <Brain className="size-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            AI coaching will appear here during calls
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            Click Enable to start • Powered by Gemini
          </p>
        </div>
      ) : error ? (
        // Error state
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
          <WifiOff className="size-6 text-red-400/50" />
          <p className="text-xs text-red-400">{error}</p>
          <p className="text-[10px] text-muted-foreground/50">
            Make sure the coaching proxy is running
          </p>
        </div>
      ) : messages.length === 0 && !sessionSummary ? (
        // Waiting for coaching
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
          <Activity className="size-6 text-purple-400/40 animate-pulse" />
          <p className="text-xs text-muted-foreground">
            {isConnected ? "Listening..." : "Connecting to Gemini..."}
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            Coaching prompts appear when AI detects a moment
          </p>
        </div>
      ) : (
        // Message feed
        <div ref={scrollRef} className="max-h-[300px] overflow-y-auto">
          {/* Live messages */}
          <div className="flex flex-col gap-1.5 p-3">
            {messages.map((msg) => {
              const config = URGENCY_CONFIG[msg.urgency]
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 transition-all duration-300",
                    config.bg,
                    // Critical messages get extra emphasis
                    msg.urgency === "critical" && "ring-1 ring-red-500/20"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1 inline-block size-2 shrink-0 rounded-full",
                        config.dot,
                        msg.urgency === "critical" && "animate-pulse"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium leading-snug", config.text)}>
                        {msg.text}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Session summary (shown after call ends) */}
          {sessionSummary && (
            <div className="border-t px-3 py-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Session Summary
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-red-500/10 px-2 py-1.5">
                  <p className="text-lg font-bold text-red-400">
                    {sessionSummary.criticalCount}
                  </p>
                  <p className="text-[10px] text-red-400/70">Critical</p>
                </div>
                <div className="rounded-md bg-amber-500/10 px-2 py-1.5">
                  <p className="text-lg font-bold text-amber-400">
                    {sessionSummary.adjustCount}
                  </p>
                  <p className="text-[10px] text-amber-400/70">Adjust</p>
                </div>
                <div className="rounded-md bg-emerald-500/10 px-2 py-1.5">
                  <p className="text-lg font-bold text-emerald-400">
                    {sessionSummary.positiveCount}
                  </p>
                  <p className="text-[10px] text-emerald-400/70">Great</p>
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
                {sessionSummary.totalMessages} coaching moments •{" "}
                {Math.round(sessionSummary.sessionDurationMs / 1000)}s session
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
