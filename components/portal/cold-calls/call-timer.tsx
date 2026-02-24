"use client"

import { cn } from "@/lib/utils"
import type { CallState } from "@/lib/dialer/types"

interface CallTimerProps {
  duration: number       // seconds
  callState: CallState
  className?: string
}

/**
 * CallTimer — large, visible call duration display.
 *
 * Color behavior:
 *   0–2 min  → emerald (on-track)
 *   2–5 min  → yellow (getting long)
 *   5+ min   → red (too long for cold call)
 *
 * Pulses when connected.
 */
export function CallTimer({ duration, callState, className }: CallTimerProps) {
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`

  const isConnected = callState === "connected"
  const isActive = callState === "connecting" || callState === "ringing" || callState === "connected"

  // Color based on duration
  const timerColor =
    !isConnected
      ? "text-muted-foreground"
      : minutes < 2
        ? "text-emerald-400"
        : minutes < 5
          ? "text-yellow-400"
          : "text-red-400"

  const stateLabel: Record<CallState, string> = {
    idle: "Ready",
    connecting: "Connecting...",
    ringing: "Ringing...",
    connected: "Live Call",
    disconnected: "Call Ended",
  }

  return (
    <div className={cn("flex flex-col items-center gap-1 select-none", className)}>
      {/* Timer digits */}
      <div
        className={cn(
          "font-mono font-bold tabular-nums transition-colors duration-500",
          "text-5xl leading-none tracking-tight",
          timerColor,
          isConnected && "animate-pulse"
        )}
        aria-label={`Call duration ${formatted}`}
      >
        {formatted}
      </div>

      {/* Status text */}
      <div
        className={cn(
          "text-xs font-medium uppercase tracking-widest transition-colors duration-300",
          isConnected
            ? minutes < 2
              ? "text-emerald-500/80"
              : minutes < 5
                ? "text-yellow-500/80"
                : "text-red-500/80"
            : isActive
              ? "text-orange-400/80"
              : "text-muted-foreground/60"
        )}
      >
        {stateLabel[callState]}
      </div>

      {/* Duration warning badge */}
      {isConnected && minutes >= 5 && (
        <div className="mt-1 flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-red-400 font-medium">Wrap it up</span>
        </div>
      )}
    </div>
  )
}
