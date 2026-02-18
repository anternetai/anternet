"use client"

import { useMemo } from "react"
import {
  Phone,
  Users,
  MessageSquare,
  CalendarCheck,
  Handshake,
  TrendingUp,
  ArrowRight,
  Clock,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { CallDashboardData, RollingStats } from "@/app/api/portal/calls/dashboard/route"

interface CallDashboardProps {
  data: CallDashboardData | undefined
  isLoading: boolean
}

function FunnelStage({
  label,
  count,
  rate,
  icon: Icon,
  color,
  isLast,
}: {
  label: string
  count: number
  rate: number | null
  icon: typeof Phone
  color: string
  isLast?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-lg bg-secondary/50 p-3 text-center">
        <Icon className={`mx-auto mb-1 size-4 ${color}`} />
        <p className="text-2xl font-bold tabular-nums">{count}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {rate !== null && (
          <p className={`mt-1 text-xs font-medium ${color}`}>
            {rate.toFixed(1)}%
          </p>
        )}
      </div>
      {!isLast && (
        <ArrowRight className="size-4 shrink-0 text-muted-foreground/40" />
      )}
    </div>
  )
}

function RollingCard({ label, stats }: { label: string; stats: RollingStats }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div>
            <p className="text-xl font-bold tabular-nums">{stats.avg_dials}</p>
            <p className="text-xs text-muted-foreground">Avg Dials/Day</p>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums text-blue-500">
              {stats.contact_rate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Contact Rate</p>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums text-amber-500">
              {stats.conversation_rate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Convo Rate</p>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums text-emerald-500">
              {stats.demo_rate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Demo Rate</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{stats.days_with_data} days tracked</span>
          <span>
            {stats.total_dials} dials → {stats.total_contacts} contacts →{" "}
            {stats.total_demos} demos → {stats.total_deals} deals
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function CallDashboard({ data, isLoading }: CallDashboardProps) {
  const chartData = useMemo(() => {
    if (!data?.dailyHistory) return []
    return [...data.dailyHistory]
      .reverse()
      .map((d) => ({
        date: d.call_date,
        label: new Date(d.call_date + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        dials: d.total_dials,
        contacts: d.contacts,
        demos: d.demos_booked,
      }))
  }, [data?.dailyHistory])

  const hourlyData = useMemo(() => {
    if (!data?.hourlyBreakdown?.length) return []
    return data.hourlyBreakdown.map((h) => ({
      ...h,
      label: `${h.hour % 12 || 12}${h.hour < 12 ? "a" : "p"}`,
    }))
  }, [data?.hourlyBreakdown])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Phone className="size-8" />
        <p>No call data yet. Start logging calls!</p>
      </div>
    )
  }

  const t = data.today

  return (
    <div className="space-y-4">
      {/* Today's KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Dials", value: t.total_dials, icon: Phone, color: "text-orange-500" },
          { title: "Contacts", value: t.contacts, icon: Users, color: "text-blue-500" },
          { title: "Conversations", value: t.conversations, icon: MessageSquare, color: "text-amber-500" },
          { title: "Demos Booked", value: t.demos_booked, icon: CalendarCheck, color: "text-emerald-500" },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`size-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="size-4" />
            Today&apos;s Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <FunnelStage
              label="Dials"
              count={t.total_dials}
              rate={null}
              icon={Phone}
              color="text-orange-500"
            />
            <FunnelStage
              label="Contacts"
              count={t.contacts}
              rate={t.total_dials > 0 ? (t.contacts / t.total_dials) * 100 : 0}
              icon={Users}
              color="text-blue-500"
            />
            <FunnelStage
              label="Convos"
              count={t.conversations}
              rate={t.contacts > 0 ? (t.conversations / t.contacts) * 100 : 0}
              icon={MessageSquare}
              color="text-amber-500"
            />
            <FunnelStage
              label="Demos"
              count={t.demos_booked}
              rate={t.conversations > 0 ? (t.demos_booked / t.conversations) * 100 : 0}
              icon={CalendarCheck}
              color="text-emerald-500"
            />
            <FunnelStage
              label="Closes"
              count={t.deals_closed}
              rate={t.demos_booked > 0 ? (t.deals_closed / t.demos_booked) * 100 : 0}
              icon={Handshake}
              color="text-purple-500"
              isLast
            />
          </div>
        </CardContent>
      </Card>

      {/* Rolling Averages */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RollingCard label="7-Day Rolling Average" stats={data.rolling7} />
        <RollingCard label="30-Day Rolling Average" stats={data.rolling30} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Dials Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Activity (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!chartData.length ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Data will appear as you log calls.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDials" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          {payload.map((p) => (
                            <p key={p.dataKey} className="text-sm font-semibold" style={{ color: p.color }}>
                              {p.value} {String(p.dataKey)}
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="dials"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#colorDials)"
                  />
                  <Area
                    type="monotone"
                    dataKey="contacts"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Hourly Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="size-4" />
              Best Call Times (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hourlyData.length ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Hourly data appears as you log calls with timestamps.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-semibold text-orange-500">
                            {payload[0]?.value} dials
                          </p>
                          <p className="text-sm font-semibold text-blue-500">
                            {payload[1]?.value} contacts
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="dials" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="contacts" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
