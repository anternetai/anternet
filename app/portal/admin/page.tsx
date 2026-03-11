"use client"

import { use, Suspense, useCallback } from "react"
import { redirect } from "next/navigation"
import useSWR from "swr"
import { Columns3 } from "lucide-react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { AdminKanban } from "@/components/portal/admin-kanban"
import { AdminStatsBar } from "@/components/portal/admin-stats-bar"
import { UpcomingSchedule } from "@/components/portal/upcoming-schedule"
import { InviteClientDialog } from "@/components/portal/invite-client-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminClientMetrics, ClientPipelineStage } from "@/lib/portal/types"

async function fetchAdminClients() {
  const res = await fetch("/api/portal/admin")
  if (!res.ok) throw new Error("Failed to fetch")
  const data = await res.json()
  return data.clients as AdminClientMetrics[]
}

function AdminContent() {
  const { user } = use(PortalAuthContext)
  const { data: clients, isLoading, mutate } = useSWR(
    "admin-clients-page",
    fetchAdminClients,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )
  const handleStageChange = useCallback(
    async (clientId: string, newStage: ClientPipelineStage) => {
      // Optimistic update
      if (clients) {
        const optimistic = clients.map((c) =>
          c.id === clientId
            ? {
                ...c,
                pipeline_stage: newStage,
                pipeline_stage_changed_at: new Date().toISOString(),
              }
            : c
        )
        mutate(optimistic, false)
      }

      try {
        const res = await fetch(
          `/api/portal/admin/clients/${clientId}/pipeline`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: newStage }),
          }
        )

        if (!res.ok) {
          // Revert on failure
          mutate()
        } else {
          // Revalidate to get fresh data
          mutate()
        }
      } catch {
        // Revert on error
        mutate()
      }
    },
    [clients, mutate]
  )

  if (!user) return null

  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <AdminStatsBar clients={clients} isLoading={isLoading} />

      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            All clients at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {clients && <InviteClientDialog clients={clients} />}
        </div>
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[400px]" />
          ))}
        </div>
      ) : clients?.length ? (
        <AdminKanban
          clients={clients}
          onStageChange={handleStageChange}
        />
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Columns3 className="size-8" />
          <p>No clients yet.</p>
        </div>
      )}

      {/* Upcoming schedule */}
      <UpcomingSchedule clients={clients} />
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AdminContent />
    </Suspense>
  )
}
