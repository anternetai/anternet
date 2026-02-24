"use client"

import { use, Suspense } from "react"
import { redirect } from "next/navigation"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { ColdCallTracker } from "@/components/portal/cold-calls/cold-call-tracker"
import { ScriptTeleprompter } from "@/components/portal/cold-calls/script-teleprompter"
import { ObjectionHandler } from "@/components/portal/cold-calls/objection-handler"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Phone, Scroll, Shield } from "lucide-react"

function ColdCallsContent() {
  const { user } = use(PortalAuthContext)

  if (!user) return null
  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  return (
    <Tabs defaultValue="dialer" className="space-y-4">
      <TabsList className="h-9 gap-1 bg-muted/50 border border-border/60">
        <TabsTrigger value="dialer" className="gap-2 text-sm data-[state=active]:bg-background">
          <Phone className="h-3.5 w-3.5" />
          Cold Calls
        </TabsTrigger>
        <TabsTrigger value="script" className="gap-2 text-sm data-[state=active]:bg-background">
          <Scroll className="h-3.5 w-3.5" />
          Script
        </TabsTrigger>
        <TabsTrigger
          value="objections"
          className="gap-2 text-sm data-[state=active]:bg-background"
        >
          <Shield className="h-3.5 w-3.5" />
          Objections
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dialer" className="mt-0">
        <ColdCallTracker />
      </TabsContent>

      <TabsContent value="script" className="mt-0">
        <div className="max-w-2xl">
          <ScriptTeleprompter />
        </div>
      </TabsContent>

      <TabsContent value="objections" className="mt-0">
        <div className="max-w-2xl">
          <ObjectionHandler />
        </div>
      </TabsContent>
    </Tabs>
  )
}

export default function ColdCallsPage() {
  return (
    <Suspense fallback={<ColdCallsSkeleton />}>
      <ColdCallsContent />
    </Suspense>
  )
}

function ColdCallsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}
