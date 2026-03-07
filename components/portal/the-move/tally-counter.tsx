"use client"

import { useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface TallyCounterProps {
  label: string
  value: number
  onChange: (n: number) => void
  color?: string
}

export function TallyCounter({ label, value, onChange, color = "amber" }: TallyCounterProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressedRef = useRef(false)

  const colorMap: Record<string, { ring: string; bg: string; text: string }> = {
    amber: { ring: "ring-amber-500/50", bg: "bg-amber-500/10", text: "text-amber-400" },
    green: { ring: "ring-green-500/50", bg: "bg-green-500/10", text: "text-green-400" },
    blue: { ring: "ring-blue-500/50", bg: "bg-blue-500/10", text: "text-blue-400" },
    rose: { ring: "ring-rose-500/50", bg: "bg-rose-500/10", text: "text-rose-400" },
  }

  const c = colorMap[color] || colorMap.amber

  const handlePointerDown = useCallback(() => {
    longPressedRef.current = false
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true
      if (value > 0) {
        onChange(value - 1)
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([30, 50, 30])
        }
      }
    }, 500)
  }, [value, onChange])

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!longPressedRef.current) {
      onChange(value + 1)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }, [value, onChange])

  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
        {label}
      </span>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "flex h-20 w-20 select-none items-center justify-center rounded-full",
          "border-2 border-stone-700 bg-stone-900 transition-all",
          "active:scale-95 active:ring-4",
          c.ring,
          value > 0 && c.bg
        )}
      >
        <span className={cn("text-2xl font-black tabular-nums", value > 0 ? c.text : "text-stone-500")}>
          {value}
        </span>
      </button>
      <span className="text-[10px] text-stone-600">hold to undo</span>
    </div>
  )
}
