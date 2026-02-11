"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { CLIENT_PIPELINE_STAGES, CLIENT_PIPELINE_CONFIG } from "@/lib/portal/constants"
import { formatDate } from "@/lib/portal/format"
import type { ClientTask, ClientPipelineStage } from "@/lib/portal/types"

interface ClientTasksProps {
  clientId: string
  pipelineStage: ClientPipelineStage
}

async function fetchTasks(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch tasks")
  return res.json() as Promise<{ tasks: ClientTask[] }>
}

export function ClientTasks({ clientId, pipelineStage }: ClientTasksProps) {
  const [showAddInput, setShowAddInput] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [addingTask, setAddingTask] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [expandedStages, setExpandedStages] = useState<Set<ClientPipelineStage>>(
    new Set([pipelineStage])
  )

  const { data, isLoading, mutate } = useSWR(
    `tasks-${clientId}`,
    () => fetchTasks(`/api/portal/admin/clients/${clientId}/tasks`),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const tasks = data?.tasks ?? []

  // Group tasks by pipeline stage
  const tasksByStage = CLIENT_PIPELINE_STAGES.reduce<
    Record<ClientPipelineStage, ClientTask[]>
  >(
    (acc, stage) => {
      acc[stage] = tasks.filter((t) => t.pipeline_stage === stage)
      return acc
    },
    {} as Record<ClientPipelineStage, ClientTask[]>
  )

  // Tasks without a stage
  const unstagedTasks = tasks.filter((t) => !t.pipeline_stage)

  function toggleStage(stage: ClientPipelineStage) {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) {
        next.delete(stage)
      } else {
        next.add(stage)
      }
      return next
    })
  }

  async function handleToggleTask(task: ClientTask) {
    setTogglingId(task.id)

    // Optimistic update
    const updatedTasks = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            completed: !t.completed,
            completed_at: !t.completed ? new Date().toISOString() : null,
          }
        : t
    )
    mutate({ tasks: updatedTasks }, false)

    try {
      const res = await fetch(`/api/portal/admin/clients/${clientId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, completed: !task.completed }),
      })
      if (!res.ok) throw new Error("Failed to update")
      mutate()
    } catch {
      // Revert on error
      mutate()
    } finally {
      setTogglingId(null)
    }
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return
    setAddingTask(true)

    try {
      const res = await fetch(`/api/portal/admin/clients/${clientId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          pipeline_stage: pipelineStage,
        }),
      })
      if (!res.ok) throw new Error("Failed to create")
      setNewTaskTitle("")
      setShowAddInput(false)
      mutate()
    } catch {
      // Silently fail - user can retry
    } finally {
      setAddingTask(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Tasks</CardTitle>
            <span className="text-xs text-muted-foreground">
              {tasks.filter((t) => t.completed).length}/{tasks.length} completed
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddInput(!showAddInput)}
          >
            <Plus className="mr-1.5 size-3.5" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add task input */}
        {showAddInput && (
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="New task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              disabled={addingTask}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask()
                if (e.key === "Escape") {
                  setShowAddInput(false)
                  setNewTaskTitle("")
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleAddTask}
              disabled={addingTask || !newTaskTitle.trim()}
            >
              {addingTask ? <Loader2 className="size-3.5 animate-spin" /> : "Add"}
            </Button>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            No tasks yet. Add one to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current stage first, then the rest */}
            {CLIENT_PIPELINE_STAGES.map((stage) => {
              const stageTasks = tasksByStage[stage]
              if (stageTasks.length === 0) return null

              const isExpanded = expandedStages.has(stage)
              const isCurrent = stage === pipelineStage
              const completedCount = stageTasks.filter((t) => t.completed).length
              const stageConfig = CLIENT_PIPELINE_CONFIG[stage]

              // Sort: incomplete first, then completed
              const sortedTasks = [...stageTasks].sort((a, b) => {
                if (a.completed === b.completed) return a.sort_order - b.sort_order
                return a.completed ? 1 : -1
              })

              return (
                <div key={stage}>
                  <button
                    type="button"
                    onClick={() => toggleStage(stage)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <span
                      className={`text-xs font-medium ${
                        isCurrent ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                      }`}
                    >
                      {isExpanded ? "\u25BC" : "\u25B6"} {stageConfig.label}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {completedCount}/{stageTasks.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1 pl-1">
                      {sortedTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          toggling={togglingId === task.id}
                          onToggle={() => handleToggleTask(task)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Unstaged tasks */}
            {unstagedTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">General</p>
                <div className="mt-2 space-y-1 pl-1">
                  {unstagedTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      toggling={togglingId === task.id}
                      onToggle={() => handleToggleTask(task)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Individual task row ---

function TaskRow({
  task,
  toggling,
  onToggle,
}: {
  task: ClientTask
  toggling: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50 ${
        toggling ? "opacity-60" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={onToggle}
        disabled={toggling}
        className="size-4 shrink-0 cursor-pointer rounded border-muted-foreground/50 accent-blue-600"
      />
      <span
        className={`flex-1 text-sm ${
          task.completed
            ? "text-muted-foreground line-through"
            : "text-foreground"
        }`}
      >
        {task.title}
      </span>
      {task.due_at && !task.completed && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(task.due_at)}
        </span>
      )}
    </label>
  )
}
