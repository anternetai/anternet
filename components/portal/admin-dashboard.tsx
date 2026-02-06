"use client"

import { AlertTriangle, Users, TrendingDown } from "lucide-react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatPercent, getRelativeTime } from "@/lib/portal/format"
import type { AdminClientMetrics } from "@/lib/portal/types"

async function fetchAdminData() {
  const res = await fetch("/api/portal/admin")
  if (!res.ok) throw new Error("Failed to fetch admin data")
  const data = await res.json()
  return data.clients as AdminClientMetrics[]
}

export function AdminDashboard() {
  const { data: clients, isLoading } = useSWR("admin-clients", fetchAdminData, {
    revalidateOnFocus: false,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    )
  }

  if (!clients?.length) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Users className="size-8" />
        <p>No clients yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => {
        const daysSinceLastLead = client.last_lead_at
          ? Math.floor(
              (Date.now() - new Date(client.last_lead_at).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null

        const noLeadsAlert = daysSinceLastLead !== null && daysSinceLastLead >= 3
        const lowShowRate = client.appointment_count > 0 && client.show_rate < 50

        return (
          <Card key={client.id} className="relative">
            {(noLeadsAlert || lowShowRate) && (
              <div className="absolute right-3 top-3 flex gap-1">
                {noLeadsAlert && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="mr-1 size-3" />
                    No leads {daysSinceLastLead}d
                  </Badge>
                )}
                {lowShowRate && (
                  <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400">
                    <TrendingDown className="mr-1 size-3" />
                    Low show rate
                  </Badge>
                )}
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{client.legal_business_name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {client.first_name} {client.last_name} &middot; {client.service_type}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Leads</p>
                  <p className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {client.lead_count}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Appointments</p>
                  <p className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {client.appointment_count}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Show Rate</p>
                  <p className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {client.appointment_count > 0
                      ? formatPercent(client.show_rate)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Charged</p>
                  <p className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(client.total_charged)}
                  </p>
                </div>
              </div>
              {client.last_lead_at && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Last lead: {getRelativeTime(client.last_lead_at)}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
