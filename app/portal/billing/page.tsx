"use client"

import { use, Suspense } from "react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { BillingTable } from "@/components/portal/billing-table"
import { Skeleton } from "@/components/ui/skeleton"

function BillingContent() {
  const { user } = use(PortalAuthContext)
  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Your charges and payment history
        </p>
      </div>
      <BillingTable clientId={user.id} />
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <BillingContent />
    </Suspense>
  )
}
