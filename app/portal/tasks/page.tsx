"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Zap,
  Flame,
  Plus,
  Trophy,
  Clock,
  BarChart2,
  CheckCircle2,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DailyTask {
  id: string
  created_at: string
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

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; xp: number }
> = {
  HFH: {
    label: "HFH",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    xp: 100,
  },
  SQUEEGEE: {
    label: "SQUEEGEE",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    xp: 50,
  },
  DAILY: {
    label: "DAILY",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    xp: 25,
  },
  PERSONAL: {
    label: "PERSONAL",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    xp: 25,
  },
}

// ─── Format time ───────────────────────────────────────────────────────────────

function formatTime(time: string | null): string | null {
  if (!time) return null
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`
}

// ─── Confetti burst (CSS-only, clean) ─────────────────────────────────────────

function CelebrationOverlay({ onDismiss }: { onDismiss: () => void }) {
  const particles = Array.from({ length: 40 }, (_, i) => i)
  const colors = [
    "bg-orange-400",
    "bg-emerald-400",
    "bg-blue-400",
    "bg-purple-400",
    "bg-amber-300",
    "bg-pink-400",
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm cursor-pointer"
      onClick={onDismiss}
    >
      {/* Confetti particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((i) => {
          const color = colors[i % colors.length]
          const left = `${Math.random() * 100}%`
          const delay = `${Math.random() * 1.5}s`
          const duration = `${2 + Math.random() * 2}s`
          const size = Math.random() > 0.5 ? "w-2 h-2" : "w-1.5 h-1.5"
          return (
            <div
              key={i}
              className={cn(
                "absolute rounded-sm",
                color,
                size,
                "animate-bounce"
              )}
              style={{
                left,
                top: "-10px",
                animationDelay: delay,
                animationDuration: duration,
                transform: `translateY(${110 + Math.random() * 20}vh) rotate(${Math.random() * 360}deg)`,
                transition: `transform ${duration} ${delay} ease-in`,
              }}
            />
          )
        })}
      </div>

      <div className="relative text-center space-y-4 px-6">
        <div className="flex items-center justify-center mb-2">
          <Trophy className="size-20 text-amber-400 drop-shadow-[0_0_32px_rgba(251,191,36,0.6)]" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          DAY COMPLETE
        </h1>
        <p className="text-xl text-muted-foreground font-medium">
          Every task done. That&apos;s the standard.
        </p>
        <Button
          size="lg"
          className="mt-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
        >
          Let&apos;s get it
        </Button>
      </div>
    </div>
  )
}

// ─── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  optimisticCompleted,
}: {
  task: DailyTask
  onToggle: (id: string, completed: boolean) => void
  optimisticCompleted: boolean
}) {
  const cat = CATEGORY_CONFIG[task.category] ?? CATEGORY_CONFIG.DAILY
  const completed = optimisticCompleted

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 px-4 rounded-lg border transition-all duration-300",
        completed
          ? "bg-muted/20 border-border/30 opacity-60"
          : "bg-card border-border hover:bg-muted/30"
      )}
    >
      <Checkbox
        checked={completed}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
        className={cn(
          "size-5 rounded-full border-2 transition-all",
          completed ? "border-emerald-500" : "border-muted-foreground/40"
        )}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={cn(
              "text-sm font-medium transition-all duration-300",
              completed && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
        </div>
        {task.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.scheduled_time && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <span className="tabular-nums">{formatTime(task.scheduled_time)}</span>
          </div>
        )}

        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 border font-semibold tracking-wide",
            cat.bg,
            cat.border,
            cat.color
          )}
        >
          {cat.label}
        </Badge>

        <div
          className={cn(
            "flex items-center gap-0.5 text-[11px] font-bold tabular-nums",
            completed ? "text-emerald-400" : "text-muted-foreground"
          )}
        >
          <Zap className="size-3" />
          <span>{task.xp_value}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Add Task Modal ────────────────────────────────────────────────────────────

function AddTaskModal({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (task: DailyTask) => void
}) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("PERSONAL")
  const [time, setTime] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/portal/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          scheduled_time: time || null,
        }),
      })
      const data = await res.json()
      if (data.task) {
        onAdd(data.task)
        setTitle("")
        setCategory("PERSONAL")
        setTime("")
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Task</Label>
            <Input
              id="task-title"
              placeholder="What needs to get done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
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
              <Label htmlFor="task-time">Time (optional)</Label>
              <Input
                id="task-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || loading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? "Adding…" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [optimisticMap, setOptimisticMap] = useState<Record<string, boolean>>({})
  const [refreshing, setRefreshing] = useState(false)
  const celebrationShown = useRef(false)

  const fetchTasks = useCallback(async () => {
    try {
      const [todayRes, statsRes] = await Promise.all([
        fetch("/api/portal/tasks/today"),
        fetch("/api/portal/tasks/stats"),
      ])
      const todayData = await todayRes.json()
      const statsData = await statsRes.json()
      setTasks(todayData.tasks ?? [])
      setStats(statsData)
      setOptimisticMap({})
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  async function handleToggle(id: string, completed: boolean) {
    // Optimistic update
    setOptimisticMap((prev) => ({ ...prev, [id]: completed }))

    const res = await fetch(`/api/portal/tasks/${id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    })
    const data = await res.json()

    if (!res.ok) {
      // Revert
      setOptimisticMap((prev) => ({ ...prev, [id]: !completed }))
      return
    }

    // Update task in state
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed, completed_at: data.task?.completed_at } : t
      )
    )
    setOptimisticMap((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })

    // Refetch stats
    fetch("/api/portal/tasks/stats")
      .then((r) => r.json())
      .then(setStats)

    // Celebration
    if (data.allComplete && !celebrationShown.current) {
      celebrationShown.current = true
      setTimeout(() => setShowCelebration(true), 400)
    }
  }

  function handleAddTask(task: DailyTask) {
    setTasks((prev) => [...prev, task])
  }

  async function handleRefresh() {
    setRefreshing(true)
    celebrationShown.current = false
    await fetchTasks()
  }

  // Compute display values
  const total = tasks.length
  const completed = tasks.filter((t) => {
    const opt = optimisticMap[t.id]
    return opt !== undefined ? opt : t.completed
  }).length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const xpEarned = tasks.reduce((sum, t) => {
    const isCompleted = optimisticMap[t.id] !== undefined ? optimisticMap[t.id] : t.completed
    return sum + (isCompleted ? t.xp_value : 0)
  }, 0)

  // Sort tasks: scheduled first, then unscheduled; completed at bottom
  const sortedTasks = [...tasks].sort((a, b) => {
    const aCompleted = optimisticMap[a.id] !== undefined ? optimisticMap[a.id] : a.completed
    const bCompleted = optimisticMap[b.id] !== undefined ? optimisticMap[b.id] : b.completed
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1
    if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time)
    if (a.scheduled_time) return -1
    if (b.scheduled_time) return 1
    return 0
  })

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="size-8 animate-spin opacity-40" />
          <p className="text-sm">Generating your day…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {showCelebration && (
        <CelebrationOverlay onDismiss={() => setShowCelebration(false)} />
      )}

      <AddTaskModal open={addOpen} onOpenChange={setAddOpen} onAdd={handleAddTask} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Daily Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {today}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="size-3.5" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {/* Progress */}
          <Card className="col-span-3">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn(
                      "size-4 transition-colors",
                      pct === 100 ? "text-emerald-400" : "text-muted-foreground"
                    )}
                  />
                  <span className="text-sm font-semibold">
                    {completed}/{total} tasks
                  </span>
                  {pct === 100 && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] border border-emerald-500/30 px-2">
                      Complete
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* XP earned today */}
                  <div className="flex items-center gap-1 text-sm font-bold text-amber-400">
                    <Zap className="size-3.5" />
                    <span className="tabular-nums">{xpEarned} XP</span>
                  </div>
                  {/* Streak */}
                  {stats && stats.stats.current_streak > 0 && (
                    <div className="flex items-center gap-1 text-sm font-bold text-orange-400">
                      <Flame className="size-3.5" />
                      <span className="tabular-nums">
                        {stats.stats.current_streak}d
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Progress
                value={pct}
                className="h-2.5 rounded-full bg-muted"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5 text-right tabular-nums">
                {pct}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly stats */}
        {stats && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="size-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  This Week
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold tabular-nums">
                    {stats.weekly.completed}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Tasks Done
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums text-amber-400">
                    {stats.weekly.xp.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    XP Earned
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums text-orange-400">
                    {stats.stats.current_streak}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Day Streak
                  </p>
                </div>
              </div>
              {stats.stats.total_xp > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50 text-center">
                  <p className="text-xs text-muted-foreground">
                    Total XP:{" "}
                    <span className="font-bold text-foreground tabular-nums">
                      {stats.stats.total_xp.toLocaleString()}
                    </span>
                    {stats.stats.longest_streak > 1 && (
                      <>
                        {" "}
                        &middot; Best streak:{" "}
                        <span className="font-bold text-foreground">
                          {stats.stats.longest_streak}d
                        </span>
                      </>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Task list */}
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="size-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No tasks for today yet.</p>
                <p className="text-xs mt-1">Click &quot;Add Task&quot; or refresh to auto-generate.</p>
              </CardContent>
            </Card>
          ) : (
            sortedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
                optimisticCompleted={
                  optimisticMap[task.id] !== undefined
                    ? optimisticMap[task.id]
                    : task.completed
                }
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}
