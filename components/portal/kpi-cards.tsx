"use client"

import { Users, CalendarCheck, TrendingUp, DollarSign, RefreshCw } from "lucide-react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatPercent } from "@/lib/portal/format"
import type { KpiData } from "@/lib/portal/types"

interface KpiCardsProps {
  clientId: string
  from: string
  to: string
}

async function fetchKpis([, clientId, from, to]: [string, string, string, string]): Promise<KpiData> {
  const supabase = createClient()

  const [leadsRes, apptRes, showedRes, paymentsRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59`),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59`),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "showed")
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59`),
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("client_id", clientId)
      .eq("status", "succeeded")
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59`),
  ])

  const totalLeads = leadsRes.count ?? 0
  const totalBooked = apptRes.count ?? 0
  const totalShowed = showedRes.count ?? 0
  const showRate = totalBooked > 0 ? (totalShowed / totalBooked) * 100 : 0
  const totalCharged = (paymentsRes.data ?? []).reduce(
    (sum, p) => sum + ((p.amount_cents ?? 0) / 100),
    0
  )

  return {
    total_leads: totalLeads,
    appointments_booked: totalBooked,
    show_rate: showRate,
    total_charged: totalCharged,
  }
}

export function KpiCards({ clientId, from, to }: KpiCardsProps) {
  const { data, isLoading, mutate } = useSWR(
    ["kpis", clientId, from, to],
    fetchKpis,
    { revalidateOnFocus: false }
  )

  const cards = [
    {
      title: "Total Leads",
      value: data ? String(data.total_leads) : null,
      icon: Users,
    },
    {
      title: "Appointments Booked",
      value: data ? String(data.appointments_booked) : null,
      icon: CalendarCheck,
    },
    {
      title: "Show Rate",
      value: data ? formatPercent(data.show_rate) : null,
      icon: TrendingUp,
    },
    {
      title: "Total Charged",
      value: data ? formatCurrency(data.total_charged) : null,
      icon: DollarSign,
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => mutate()}
          aria-label="Refresh data"
        >
          <RefreshCw className="mr-1 size-3.5" />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading || card.value === null ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {card.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
