"use client"

import { use, Suspense } from "react"
import { redirect } from "next/navigation"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { AdminDashboard } from "@/components/portal/admin-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

function AdminContent() {
  const { user } = use(PortalAuthContext)

  if (!user) return null

  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          All clients at a glance
        </p>
      </div>
      <AdminDashboard />
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
