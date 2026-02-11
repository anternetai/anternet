"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  ArrowRightLeft,
  MessageSquare,
  Mail,
  Phone,
  CheckCircle2,
  StickyNote,
  UserPlus,
  CalendarCheck,
  DollarSign,
  Plus,
  Loader2,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRelativeTime } from "@/lib/portal/format"
import type { ClientActivity } from "@/lib/portal/types"

interface ActivityTimelineProps {
  clientId: string
}

const ACTIVITY_ICON_MAP: Record<
  ClientActivity["type"],
  { icon: typeof ArrowRightLeft; color: string }
> = {
  stage_change: { icon: ArrowRightLeft, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/50" },
  slack_message: { icon: MessageSquare, color: "text-purple-500 bg-purple-100 dark:bg-purple-900/50" },
  email_sent: { icon: Mail, color: "text-green-500 bg-green-100 dark:bg-green-900/50" },
  call: { icon: Phone, color: "text-orange-500 bg-orange-100 dark:bg-orange-900/50" },
  task_completed: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/50" },
  note: { icon: StickyNote, color: "text-gray-500 bg-gray-100 dark:bg-gray-800" },
  lead_in: { icon: UserPlus, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/50" },
  appointment: { icon: CalendarCheck, color: "text-indigo-500 bg-indigo-100 dark:bg-indigo-900/50" },
  payment: { icon: DollarSign, color: "text-green-500 bg-green-100 dark:bg-green-900/50" },
}

const PAGE_SIZE = 20

interface ActivityResponse {
  activity: ClientActivity[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function fetchActivity(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch activity")
  return res.json() as Promise<ActivityResponse>
}

export function ActivityTimeline({ clientId }: ActivityTimelineProps) {
  const [page, setPage] = useState(1)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  const { data, isLoading, mutate } = useSWR(
    `activity-${clientId}-${page}`,
    () => fetchActivity(`/api/portal/admin/clients/${clientId}/activity?page=${page}&limit=${PAGE_SIZE}`),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const activities = data?.activity ?? []
  const total = data?.pagination?.total ?? 0
  const hasMore = activities.length >= PAGE_SIZE && page * PAGE_SIZE < total

  async function handleAddNote() {
    if (!noteText.trim()) return
    setSavingNote(true)

    try {
      const res = await fetch(`/api/portal/admin/clients/${clientId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "note",
          title: "Note added",
          detail: noteText.trim(),
        }),
      })

      if (!res.ok) throw new Error("Failed to add note")
      setNoteText("")
      setShowNoteInput(false)
      mutate()
    } catch {
      // Silently fail - user can retry
    } finally {
      setSavingNote(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
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
          <CardTitle className="text-base">Activity</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNoteInput(!showNoteInput)}
          >
            <Plus className="mr-1.5 size-3.5" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Inline note input */}
        {showNoteInput && (
          <div className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-3">
            <Textarea
              placeholder="Write a note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              disabled={savingNote}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNoteInput(false)
                  setNoteText("")
                }}
                disabled={savingNote}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={savingNote || !noteText.trim()}
              >
                {savingNote ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-3.5" />
                )}
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        {activities.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No activity yet. Add a note to get started.
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical connecting line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            {activities.map((activity) => {
              const config = ACTIVITY_ICON_MAP[activity.type]
              const Icon = config.icon

              return (
                <div key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {/* Icon dot */}
                  <div
                    className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${config.color}`}
                  >
                    <Icon className="size-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium leading-tight">
                      {activity.title}
                    </p>
                    {activity.detail && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {activity.detail}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {getRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
            >
              Load more
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
