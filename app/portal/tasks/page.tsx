"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Zap, Flame, Plus, Trophy, Clock, RefreshCw, Target, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DailyTask {
  id: string
  task_date: string
  title: string
  category: "HFH" | "SQUEEGEE" | "DAILY" | "PERSONAL"
  scheduled_time: string | null
  xp_value: number
  completed: boolean
  completed_at: string | null
  source: string
  notes: string | null
}

interface TaskStats {
  stats: {
    total_xp: number
    current_streak: number
    longest_streak: number
    last_completed_date: string | null
  }
  weekly: {
    completed: number
    total: number
    xp: number
    byDate: Record<string, { total: number; completed: number; xp: number }>
  }
}

// ─── Category config ───────────────────────────────────────────────────────────

const CAT = {
  HFH:      { label: "HFH",      dot: "bg-emerald-400", text: "text-emerald-400", ring: "ring-emerald-400/20", pill: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" },
  SQUEEGEE: { label: "SQUEEGEE", dot: "bg-sky-400",     text: "text-sky-400",     ring: "ring-sky-400/20",     pill: "bg-sky-400/10 text-sky-400 border-sky-400/20"           },
  DAILY:    { label: "DAILY",    dot: "bg-orange-400",  text: "text-orange-400",  ring: "ring-orange-400/20",  pill: "bg-orange-400/10 text-orange-400 border-orange-400/20"   },
  PERSONAL: { label: "PERSONAL", dot: "bg-violet-400",  text: "text-violet-400",  ring: "ring-violet-400/20",  pill: "bg-violet-400/10 text-violet-400 border-violet-400/20"   },
} as const

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(t: string | null) {
  if (!t) return null
  const [h, m] = t.split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const COLORS = ["#f97316", "#34d399", "#38bdf8", "#a78bfa", "#fbbf24", "#f472b6"]

function Particle({ i }: { i: number }) {
  const color = COLORS[i % COLORS.length]
  const x = Math.sin(i * 2.39996) * 50 // golden angle spread
  const rotate = (i * 137.5) % 360
  const delay = (i * 0.04) % 1.2
  const size = i % 3 === 0 ? 8 : 5

  return (
    <div
      className="absolute left-1/2 top-0 rounded-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        transform: `translateX(${x}px)`,
        animation: `confetti-fall 1.8s ${delay}s ease-in both`,
      }}
    />
  )
}

function DayCompleteScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={onDismiss}
      style={{ background: "oklch(0.045 0.005 265 / 0.97)", backdropFilter: "blur(8px)" }}
    >
      {/* Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-start justify-center">
        {Array.from({ length: 60 }).map((_, i) => (
          <Particle key={i} i={i} />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-5 text-center px-8">
        <div
          className="flex items-center justify-center w-24 h-24 rounded-full"
          style={{ background: "oklch(0.65 0.18 55 / 0.12)", boxShadow: "0 0 60px oklch(0.65 0.18 55 / 0.3)" }}
        >
          <Trophy className="w-12 h-12" style={{ color: "oklch(0.8 0.18 55)" }} />
        </div>

        <div>
          <p className="text-sm font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: "oklch(0.65 0.18 55)" }}>
            Day Complete
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-white leading-none">
            Full send.
          </h1>
          <p className="text-lg mt-3" style={{ color: "oklch(0.65 0.025 265)" }}>
            Every task. Every rep. That&apos;s the standard.
          </p>
        </div>

        <Button
          onClick={(e) => { e.stopPropagation(); onDismiss() }}
          className="mt-2 h-11 px-8 font-semibold"
          style={{ background: "oklch(0.65 0.18 55)", color: "white" }}
        >
          Back to work
        </Button>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateX(var(--x, 0)) translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateX(calc(var(--x, 0) * 3)) translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── Progress arc ─────────────────────────────────────────────────────────────

function RingProgress({ pct, xp }: { pct: number; xp: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center justify-center gap-0.5 relative w-32 h-32">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke="oklch(0.65 0.18 55)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <span className="relative text-2xl font-bold tabular-nums leading-none">{pct}%</span>
      <span className="relative text-[11px] text-muted-foreground font-medium">{xp} XP</span>
    </div>
  )
}

// ─── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  isCompleted,
  onToggle,
  onDelete,
}: {
  task: DailyTask
  isCompleted: boolean
  onToggle: (id: string, val: boolean) => void
  onDelete: (id: string) => void
}) {
  const cat = CAT[task.category] ?? CAT.DAILY

  return (
    <div
      className={cn(
        "group flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-all duration-200",
        isCompleted
          ? "opacity-50 border-transparent bg-transparent"
          : "bg-card border-border hover:border-border/80 hover:bg-card/80"
      )}
    >
      {/* Custom checkbox */}
      <button
        onClick={() => onToggle(task.id, !isCompleted)}
        className={cn(
          "shrink-0 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200",
          isCompleted
            ? "border-emerald-500 bg-emerald-500"
            : "border-muted-foreground/30 hover:border-muted-foreground/60 bg-transparent"
        )}
        aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
      >
        {isCompleted && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium leading-snug transition-all duration-200",
          isCompleted ? "line-through text-muted-foreground" : "text-foreground"
        )}>
          {task.title}
        </p>
        {task.notes && !isCompleted && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.notes}</p>
        )}
      </div>

      {/* Right side meta */}
      <div className="flex items-center gap-2 shrink-0">
        {task.scheduled_time && !isCompleted && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
            <Clock className="w-3 h-3" />
            {fmtTime(task.scheduled_time)}
          </span>
        )}

        <span className={cn(
          "text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded-md border",
          cat.pill
        )}>
          {cat.label}
        </span>

        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-500/10 hover:text-red-400 text-muted-foreground/30"
          aria-label="Delete task"
          title="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <span className={cn(
          "text-[11px] font-bold tabular-nums flex items-center gap-0.5 transition-colors",
          isCompleted ? "text-emerald-400" : "text-muted-foreground/60"
        )}>
          <Zap className="w-3 h-3" />
          {task.xp_value}
        </span>
      </div>
    </div>
  )
}

// ─── Week strip ───────────────────────────────────────────────────────────────

function WeekStrip({ byDate }: { byDate: Record<string, { total: number; completed: number; xp: number }> }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 6 + i)
    const key = d.toISOString().split("T")[0]
    const isToday = i === 6
    const data = byDate[key]
    const pct = data?.total ? Math.round((data.completed / data.total) * 100) : 0
    return { key, label: d.toLocaleDateString("en-US", { weekday: "short" }), pct, isToday, xp: data?.xp ?? 0 }
  })

  return (
    <div className="flex items-end gap-1.5">
      {days.map(({ key, label, pct, isToday, xp }) => (
        <div key={key} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full h-10 rounded-md overflow-hidden bg-muted/40 relative" title={`${xp} XP`}>
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 rounded-md transition-all duration-700",
                pct === 100 ? "bg-emerald-500" : isToday ? "bg-orange-500" : "bg-muted-foreground/25"
              )}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
          </div>
          <span className={cn(
            "text-[10px] font-medium",
            isToday ? "text-foreground" : "text-muted-foreground/50"
          )}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Add Task Modal ────────────────────────────────────────────────────────────

function AddTaskModal({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdded: (task: DailyTask) => void
}) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<string>("PERSONAL")
  const [time, setTime] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/portal/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, scheduled_time: time || null }),
      })
      const data = await res.json()
      if (data.task) {
        onAdded(data.task)
        setTitle("")
        setTime("")
        setCategory("PERSONAL")
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Add task</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="t-title" className="text-xs text-muted-foreground">Task</Label>
            <Input
              id="t-title"
              placeholder="What needs to happen?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HFH">HFH</SelectItem>
                  <SelectItem value="SQUEEGEE">Squeegee</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="PERSONAL">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-time" className="text-xs text-muted-foreground">Time (optional)</Label>
              <Input
                id="t-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || loading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const celebFired = useRef(false)

  const load = useCallback(async () => {
    const [t, s] = await Promise.all([
      fetch("/api/portal/tasks/today").then((r) => r.json()),
      fetch("/api/portal/tasks/stats").then((r) => r.json()),
    ])
    setTasks(t.tasks ?? [])
    setStats(s)
    setPending({})
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(id: string, val: boolean) {
    setPending((p) => ({ ...p, [id]: val }))
    const res = await fetch(`/api/portal/tasks/${id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: val }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPending((p) => { const n = { ...p }; delete n[id]; return n })
      return
    }
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: val, completed_at: data.task?.completed_at } : t))
    setPending((p) => { const n = { ...p }; delete n[id]; return n })
    // Refresh stats
    fetch("/api/portal/tasks/stats").then((r) => r.json()).then(setStats)
    // Celebrate
    if (data.allComplete && !celebFired.current) {
      celebFired.current = true
      setTimeout(() => setShowCelebration(true), 500)
    }
  }

  function getCompleted(t: DailyTask) {
    return pending[t.id] !== undefined ? pending[t.id] : t.completed
  }

  async function deleteTask(id: string) {
    // Optimistically remove from list
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/portal/tasks/${id}`, { method: "DELETE" })
    // Refresh stats in background
    fetch("/api/portal/tasks/stats").then((r) => r.json()).then(setStats)
  }

  // Sort: time-scheduled first, then unscheduled; completed last
  const sorted = [...tasks].sort((a, b) => {
    const ac = getCompleted(a), bc = getCompleted(b)
    if (ac !== bc) return ac ? 1 : -1
    if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time)
    if (a.scheduled_time) return -1
    if (b.scheduled_time) return 1
    return 0
  })

  const completedCount = tasks.filter(getCompleted).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0
  const xpToday = tasks.reduce((s, t) => s + (getCompleted(t) ? t.xp_value : 0), 0)

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <>
      {showCelebration && <DayCompleteScreen onDismiss={() => setShowCelebration(false)} />}
      <AddTaskModal open={addOpen} onOpenChange={setAddOpen} onAdded={(t) => setTasks((prev) => [...prev, t])} />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Game Day</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{todayLabel}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { celebFired.current = false; load() }}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add task
            </Button>
          </div>
        </div>

        {/* Progress + stats row */}
        <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
          <RingProgress pct={pct} xp={xpToday} />

          <div className="space-y-3">
            {/* Task count */}
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {completedCount}
                <span className="text-muted-foreground font-normal text-base">/{total}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">tasks complete</p>
            </div>

            {/* Streak + total XP */}
            <div className="flex items-center gap-4">
              {stats && stats.stats.current_streak > 0 && (
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold tabular-nums">{stats.stats.current_streak}</span>
                  <span className="text-xs text-muted-foreground">day streak</span>
                </div>
              )}
              {stats && stats.stats.total_xp > 0 && (
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-bold tabular-nums">{stats.stats.total_xp.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">total XP</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weekly strip */}
        {stats?.weekly.byDate && (
          <Card className="border-border/60">
            <CardContent className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                This week
              </p>
              <WeekStrip byDate={stats.weekly.byDate} />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{stats.weekly.completed}</span> tasks done
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="font-bold text-amber-400">{stats.weekly.xp.toLocaleString()}</span> XP earned
                </span>
                {stats.stats.longest_streak > 1 && (
                  <span className="text-xs text-muted-foreground">
                    Best: <span className="font-bold text-foreground">{stats.stats.longest_streak}d</span>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task list */}
        <div className="space-y-1.5">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 gap-3">
              <Target className="w-8 h-8" />
              <p className="text-sm">No tasks yet — click refresh or add one.</p>
            </div>
          ) : (
            sorted.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isCompleted={getCompleted(task)}
                onToggle={toggle}
                onDelete={deleteTask}
              />
            ))
          )}
        </div>

        {/* XP legend */}
        {sorted.length > 0 && (
          <div className="flex items-center justify-center gap-4 pt-1 pb-2 flex-wrap">
            {Object.entries(CAT).map(([key, val]) => {
              const hasTasks = sorted.some((t) => t.category === key)
              if (!hasTasks) return null
              return (
                <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={cn("w-1.5 h-1.5 rounded-full", val.dot)} />
                  {val.label}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
