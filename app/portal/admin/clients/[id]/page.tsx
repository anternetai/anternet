"use client"

import { use, Suspense } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { ClientDetailHeader } from "@/components/portal/client-detail-header"
import { PipelineTracker } from "@/components/portal/pipeline-tracker"
import { ClientActions } from "@/components/portal/client-actions"
import { ClientTasks } from "@/components/portal/client-tasks"
import { ActivityTimeline } from "@/components/portal/activity-timeline"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ClientDetail, ClientTask, ClientActivity, ClientPipelineStage } from "@/lib/portal/types"

interface ClientDetailResponse {
  client: ClientDetail
  metrics: {
    lead_count: number
    appointment_count: number
    showed_count: number
    show_rate: number
    total_charged: number
  }
  tasks: ClientTask[]
  recentActivity: ClientActivity[]
}

async function fetchClientDetail(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 404) throw new Error("NOT_FOUND")
    throw new Error("Failed to fetch client")
  }
  return res.json() as Promise<ClientDetailResponse>
}

function ClientDetailContent() {
  const { user } = use(PortalAuthContext)
  const params = useParams()
  const clientId = params.id as string

  const { data, isLoading, error, mutate } = useSWR(
    user ? `/api/portal/admin/clients/${clientId}` : null,
    fetchClientDetail,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  async function handleStageChange(newStage: ClientPipelineStage) {
    try {
      const res = await fetch(`/api/portal/admin/clients/${clientId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      })

      if (!res.ok) throw new Error("Failed to update stage")
      mutate()
    } catch {
      // Failed - SWR data stays unchanged
    }
  }

  function handleActionComplete() {
    mutate()
  }

  if (!user) return null

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-56" />
        <Skeleton className="h-32" />
        <div className="grid gap-6 md:grid-cols-5">
          <div className="space-y-6 md:col-span-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  // Error / not found state
  if (error || !data) {
    const isNotFound = error?.message === "NOT_FOUND"
    return (
      <div className="space-y-6">
        <Link
          href="/portal/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          All Clients
        </Link>
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
          <AlertCircle className="size-10" />
          <p className="text-lg font-medium">
            {isNotFound ? "Client not found" : "Something went wrong"}
          </p>
          <p className="text-sm">
            {isNotFound
              ? "This client may have been deleted or doesn't exist."
              : "We couldn't load this client's data. Please try again."}
          </p>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const { client, metrics } = data

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/portal/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        All Clients
      </Link>

      {/* Client Header */}
      <ClientDetailHeader client={client} metrics={metrics} />

      {/* Pipeline Tracker */}
      <PipelineTracker client={client} onStageChange={handleStageChange} />

      {/* Two-column layout: Actions + Tasks (left) | Activity (right) */}
      <div className="grid gap-6 md:grid-cols-5">
        <div className="space-y-6 md:col-span-2">
          <ClientActions
            clientId={clientId}
            client={client}
            onActionComplete={handleActionComplete}
          />
          <ClientTasks clientId={clientId} pipelineStage={client.pipeline_stage} />
        </div>
        <div className="md:col-span-3">
          <ActivityTimeline clientId={clientId} />
        </div>
      </div>
    </div>
  )
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ClientDetailContent />
    </Suspense>
  )
}
