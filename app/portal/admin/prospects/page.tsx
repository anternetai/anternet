"use client"

import { use, Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PhoneCall, ArrowRight, Database } from "lucide-react"

function ProspectsContent() {
  const { user } = use(PortalAuthContext)

  if (!user) return null
  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Prospects</h1>
        <p className="text-sm text-muted-foreground">
          Your prospect database lives in the Cold Calls system
        </p>
      </div>

      {/* Redirect card */}
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Database className="size-8 text-primary" />
        </div>

        <h2 className="mb-2 text-xl font-semibold">
          7,288 Leads in Cold Calls
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
          Your prospect database has moved to the Cold Calls system for a unified experience.
          Manage leads, view call history, filter by state and timezone, and track dispositions
          all in one place.
        </p>

        <Button asChild size="lg" className="gap-2">
          <Link href="/portal/cold-calls">
            <PhoneCall className="size-4" />
            Go to Cold Calls
            <ArrowRight className="size-4" />
          </Link>
        </Button>

        <p className="mt-3 text-xs text-muted-foreground">
          Click the <strong>Leads</strong> tab inside Cold Calls to browse and manage all prospects
        </p>
      </div>

      {/* Quick stats strip */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-2xl font-bold">7,288</p>
          <p className="text-xs text-muted-foreground">Total Leads</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-2xl font-bold">~40%</p>
          <p className="text-xs text-muted-foreground">Have Owner Names</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-2xl font-bold">4</p>
          <p className="text-xs text-muted-foreground">Timezones Covered</p>
        </div>
      </div>
    </div>
  )
}

export default function ProspectsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ProspectsContent />
    </Suspense>
  )
}
