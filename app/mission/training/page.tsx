"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TrainingEntry } from "@/lib/types"
import {
  Terminal,
  Plug,
  Zap,
  Bot,
  Code,
  Brain,
  BookOpen,
  CheckCircle2,
  Clock,
  RotateCcw,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react"

// ─── Course Data ─────────────────────────────────────────
const COURSES = [
  { name: "Claude Code in Action", modules: 7, icon: Terminal },
  { name: "Introduction to MCP", modules: 5, icon: Plug },
  { name: "MCP: Advanced Topics", modules: 5, icon: Zap },
  { name: "Introduction to Agent Skills", modules: 4, icon: Bot },
  { name: "Building with the Claude API", modules: 8, icon: Code },
  { name: "AI Fluency: Foundations", modules: 6, icon: Brain },
]

// ─── Helpers ─────────────────────────────────────────────
function getCourseBadge(completed: number, total: number) {
  if (completed === 0) return { label: "Not Started", className: "bg-gray-500/15 text-gray-400 border-gray-500/20" }
  if (completed >= total) return { label: "Complete", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" }
  return { label: "In Progress", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" }
}

function isDueForReview(entry: TrainingEntry): boolean {
  if (entry.completed) return false
  return new Date(entry.next_review_at) <= new Date()
}

function daysUntilReview(entry: TrainingEntry): string {
  const now = new Date()
  const review = new Date(entry.next_review_at)
  const diff = Math.ceil((review.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return "Due now"
  if (diff === 1) return "Tomorrow"
  return `In ${diff} days`
}

// ─── Component ───────────────────────────────────────────
export default function TrainingPage() {
  const [entries, setEntries] = useState<TrainingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)

  // Form state
  const [formCourse, setFormCourse] = useState("")
  const [formModule, setFormModule] = useState("")
  const [formTakeaway, setFormTakeaway] = useState("")
  const [formConnection, setFormConnection] = useState("")

  // ─── Data Loading ────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/mission/training")
      const json = await res.json()
      if (json.entries) setEntries(json.entries)
    } catch (err) {
      console.error("Failed to fetch training entries:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // ─── Course Progress ─────────────────────────────────
  const courseProgress = useMemo(() => {
    const progress: Record<string, Set<string>> = {}
    entries.forEach((e) => {
      if (!progress[e.course_name]) progress[e.course_name] = new Set()
      progress[e.course_name].add(e.module_name)
    })
    return progress
  }, [entries])

  // ─── Review Queue ────────────────────────────────────
  const reviewQueue = useMemo(() => {
    let due = entries.filter(isDueForReview)
    if (selectedCourse) {
      due = due.filter((e) => e.course_name === selectedCourse)
    }
    return due.sort(
      (a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime()
    )
  }, [entries, selectedCourse])

  // ─── Submit New Entry ────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formCourse || !formModule || !formTakeaway) return

    setSaving(true)
    try {
      const res = await fetch("/api/mission/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_name: formCourse,
          module_name: formModule,
          key_takeaway: formTakeaway,
          real_world_connection: formConnection || null,
        }),
      })
      const json = await res.json()
      if (json.entry) {
        setEntries((prev) => [json.entry, ...prev])
        setFormModule("")
        setFormTakeaway("")
        setFormConnection("")
      }
    } catch (err) {
      console.error("Failed to save entry:", err)
    } finally {
      setSaving(false)
    }
  }

  // ─── Review Action ───────────────────────────────────
  async function handleReview(id: string, action: "got_it" | "rusty") {
    setReviewingId(id)
    try {
      const res = await fetch("/api/mission/training", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      })
      const json = await res.json()
      if (json.entry) {
        setEntries((prev) => prev.map((e) => (e.id === id ? json.entry : e)))
      }
    } catch (err) {
      console.error("Failed to review entry:", err)
    } finally {
      setReviewingId(null)
    }
  }

  // ─── Render ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400" role="alert">
        <strong>Demo Mode</strong> — This page displays sample data for preview purposes. Data shown is not real.
      </div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Training Ground</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Log what you learn, connect it to what you&apos;re building, review it later
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
            <BookOpen className="h-3 w-3 mr-1" />
            {entries.length} logged
          </Badge>
          <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1" />
            {reviewQueue.length} to review
          </Badge>
        </div>
      </div>

      {/* Course Progress Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {COURSES.map((course) => {
          const Icon = course.icon
          const completed = courseProgress[course.name]?.size || 0
          const badge = getCourseBadge(completed, course.modules)
          const isSelected = selectedCourse === course.name
          const progressPct = Math.min((completed / course.modules) * 100, 100)

          return (
            <Card
              key={course.name}
              className={`border-border bg-card cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 ${
                isSelected ? "ring-2 ring-orange-500/50" : ""
              }`}
              onClick={() => setSelectedCourse(isSelected ? null : course.name)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{course.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {completed} / {course.modules} modules
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={badge.className}>
                    {badge.label}
                  </Badge>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-secondary">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Log What I Learned */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log What I Learned
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select value={formCourse} onValueChange={setFormCourse}>
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSES.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="module">Module / Section</Label>
                <Input
                  id="module"
                  value={formModule}
                  onChange={(e) => setFormModule(e.target.value)}
                  placeholder="e.g. Module 3: Tool Use Basics"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="takeaway">What did I just learn?</Label>
              <Textarea
                id="takeaway"
                value={formTakeaway}
                onChange={(e) => setFormTakeaway(e.target.value)}
                placeholder="In your own words — like you're explaining it to a friend"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connection">How will I use this?</Label>
              <Textarea
                id="connection"
                value={formConnection}
                onChange={(e) => setFormConnection(e.target.value)}
                placeholder="Connect it to HomeField Hub, Dr. Squeegee, or your workflow"
                rows={2}
              />
            </div>

            <Button type="submit" disabled={saving || !formCourse || !formModule || !formTakeaway}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Save & Start Reviews
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Review Queue */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Review Queue
            {selectedCourse && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                {selectedCourse}
                <button
                  className="ml-1 hover:text-primary"
                  onClick={() => setSelectedCourse(null)}
                >
                  x
                </button>
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviewQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-3" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">Nothing to review today.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewQueue.map((entry) => {
                const course = COURSES.find((c) => c.name === entry.course_name)
                const Icon = course?.icon || BookOpen
                const isReviewing = reviewingId === entry.id

                return (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {entry.course_name}
                          </Badge>
                          <p className="text-sm font-medium mt-0.5">{entry.module_name}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Review #{entry.review_count + 1}
                      </span>
                    </div>

                    <div className="space-y-2 pl-10">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          What I learned
                        </p>
                        <p className="text-sm">{entry.key_takeaway}</p>
                      </div>
                      {entry.real_world_connection && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            How I&apos;ll use it
                          </p>
                          <p className="text-sm">{entry.real_world_connection}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pl-10">
                      <Button
                        size="sm"
                        onClick={() => handleReview(entry.id, "got_it")}
                        disabled={isReviewing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isReviewing ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        Got It
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(entry.id, "rusty")}
                        disabled={isReviewing}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rusty
                      </Button>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {daysUntilReview(entry)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
