"use client"

import { use, Suspense } from "react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { AppointmentsTable } from "@/components/portal/appointments-table"
import { Skeleton } from "@/components/ui/skeleton"

function AppointmentsContent() {
  const { user } = use(PortalAuthContext)
  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Track appointment outcomes and billing
        </p>
      </div>
      <AppointmentsTable clientId={user.id} />
    </div>
  )
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AppointmentsContent />
    </Suspense>
  )
}
