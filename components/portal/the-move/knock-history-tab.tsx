"use client"

import type { DoorKnockSession } from "@/lib/the-move/types"

interface KnockHistoryTabProps {
  sessions: DoorKnockSession[]
  onEdit: (session: DoorKnockSession) => void
}

export function KnockHistoryTab({ sessions, onEdit }: KnockHistoryTabProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-500">
        <p className="text-lg font-medium">No sessions yet</p>
        <p className="text-sm">Go knock some doors</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 px-1">
      {sessions.map((s) => {
        const date = new Date(s.session_date + "T12:00:00")
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
        const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onEdit(s)}
            className="w-full rounded-xl border border-stone-800 bg-stone-900/50 p-4 text-left transition-colors active:bg-stone-800/50"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-200">{s.neighborhood}</p>
                {s.street && (
                  <p className="text-xs text-stone-500">{s.street}</p>
                )}
                <p className="mt-0.5 text-xs text-stone-500">
                  {dayName}, {dateStr}
                  {s.weather && ` · ${s.weather}`}
                </p>
              </div>
              {s.revenue_closed > 0 && (
                <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-sm font-bold text-green-400">
                  ${s.revenue_closed}
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              <Stat label="Knocked" value={s.doors_knocked} color="text-amber-400" />
              <Stat label="Opened" value={s.doors_opened} color="text-blue-400" />
              <Stat label="Pitched" value={s.pitches_given} color="text-rose-400" />
              <Stat label="Closed" value={s.jobs_closed} color="text-green-400" />
            </div>

            {s.notes && (
              <p className="mt-2 text-xs text-stone-500 line-clamp-2">{s.notes}</p>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-stone-500">{label}</p>
    </div>
  )
}
