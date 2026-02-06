"use client"

import { use, Suspense } from "react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { LeadsTable } from "@/components/portal/leads-table"
import { Skeleton } from "@/components/ui/skeleton"

function LeadsContent() {
  const { user } = use(PortalAuthContext)
  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          All leads from your campaigns
        </p>
      </div>
      <LeadsTable clientId={user.id} />
    </div>
  )
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <LeadsContent />
    </Suspense>
  )
}
