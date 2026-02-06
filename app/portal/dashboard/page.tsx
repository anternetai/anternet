"use client"

import { use } from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { KpiCards } from "@/components/portal/kpi-cards"
import { PipelineFunnel } from "@/components/portal/pipeline-funnel"
import { DateRangeFilter } from "@/components/portal/date-range-filter"
import { Skeleton } from "@/components/ui/skeleton"

function DashboardContent() {
  const { user } = use(PortalAuthContext)
  const searchParams = useSearchParams()

  if (!user) return null

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const from = searchParams.get("from") || thirtyDaysAgo.toISOString().split("T")[0]
  const to = searchParams.get("to") || now.toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ textWrap: "balance" }}>
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of your lead generation performance
          </p>
        </div>
        <DateRangeFilter />
      </div>

      <KpiCards clientId={user.id} from={from} to={to} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Lead Pipeline</h2>
        <PipelineFunnel clientId={user.id} from={from} to={to} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-32" />
    </div>
  )
}
