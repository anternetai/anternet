"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  ArrowRight,
  RefreshCw,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { OnboardingStep } from "@/lib/onboarding/checklist"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientOnboardingStatus {
  id: string
  business_name: string
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  service_type: string | null
  pipeline_stage_changed_at: string
  days_in_onboarding: number
  is_stuck: boolean
  checklist: OnboardingStep[]
  progress: {
    completed: number
    total: number
    percent: number
  }
}

interface StatusResponse {
  total: number
  stuck_count: number
  clients: ClientOnboardingStatus[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetcher(url: string): Promise<StatusResponse> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch onboarding status")
  return res.json()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function serviceTypeLabel(type: string | null): string {
  const labels: Record<string, string> = {
    roofing: "Roofing",
    hvac: "HVAC",
    plumbing: "Plumbing",
    landscaping: "Landscaping",
    general: "General",
    other: "Other",
  }
  return type ? (labels[type] ?? type) : "Unknown"
}

const STEP_STATUS_CONFIG: Record<
  OnboardingStep["status"],
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  complete: { icon: CheckCircle2, color: "text-green-500", label: "Complete" },
  in_progress: { icon: Loader2, color: "text-blue-500", label: "In Progress" },
  pending: { icon: Clock, color: "text-zinc-400", label: "Pending" },
  blocked: { icon: AlertTriangle, color: "text-red-500", label: "Blocked" },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepRow({ step }: { step: OnboardingStep }) {
  const cfg = STEP_STATUS_CONFIG[step.status]
  const Icon = cfg.icon

  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon
        className={cn(
          "h-3.5 w-3.5 mt-0.5 flex-shrink-0",
          cfg.color,
          step.status === "in_progress" && "animate-spin"
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium",
              step.status === "complete"
                ? "text-zinc-500 line-through"
                : "text-zinc-800 dark:text-zinc-200"
            )}
          >
            {step.name}
          </span>
          {step.automated ? (
            <Bot className="h-3 w-3 text-indigo-400 flex-shrink-0" aria-label="Automated" />
          ) : (
            <User className="h-3 w-3 text-zinc-400 flex-shrink-0" aria-label="Manual" />
          )}
        </div>
        {step.status === "complete" && step.completedAt && (
          <p className="text-xs text-zinc-400">{formatDate(step.completedAt)}</p>
        )}
        {step.status !== "complete" && (
          <p className="text-xs text-zinc-500">{step.description}</p>
        )}
      </div>
    </div>
  )
}

function ClientCard({
  client,
  onNudge,
  onAdvance,
}: {
  client: ClientOnboardingStatus
  onNudge: (id: string, email: string | null) => void
  onAdvance: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  const handleNudge = useCallback(async () => {
    if (!client.contact_email) return
    setNudging(true)
    try {
      await onNudge(client.id, client.contact_email)
    } finally {
      setNudging(false)
    }
  }, [client.id, client.contact_email, onNudge])

  const handleAdvance = useCallback(async () => {
    setAdvancing(true)
    try {
      await onAdvance(client.id)
    } finally {
      setAdvancing(false)
    }
  }, [client.id, onAdvance])

  const automatedSteps = client.checklist.filter((s) => s.automated)
  const manualSteps = client.checklist.filter((s) => !s.automated)

  return (
    <Card
      className={cn(
        "border transition-colors",
        client.is_stuck
          ? "border-red-200 bg-red-50/30 dark:border-red-900/50 dark:bg-red-950/20"
          : "border-zinc-200 dark:border-zinc-800"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold leading-tight">
                {client.business_name}
              </CardTitle>
              <Badge
                variant="outline"
                className="text-xs py-0 px-1.5"
              >
                {serviceTypeLabel(client.service_type)}
              </Badge>
              {client.is_stuck && (
                <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 text-xs py-0 px-1.5">
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                  Stuck
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {client.contact_name}
              {client.contact_email && (
                <span className="text-zinc-400"> · {client.contact_email}</span>
              )}
            </p>
          </div>

          {/* Days badge */}
          <div
            className={cn(
              "flex flex-col items-center rounded-lg px-2.5 py-1.5 text-center flex-shrink-0",
              client.is_stuck
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-zinc-100 dark:bg-zinc-800"
            )}
          >
            <span
              className={cn(
                "text-lg font-bold leading-none",
                client.is_stuck ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"
              )}
            >
              {client.days_in_onboarding}
            </span>
            <span className="text-xs text-zinc-500 leading-none mt-0.5">days</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Automated steps</span>
            <span className="font-medium">
              {client.progress.completed}/{client.progress.total}
            </span>
          </div>
          <Progress
            value={client.progress.percent}
            className={cn(
              "h-1.5",
              client.progress.percent === 100
                ? "[&>div]:bg-green-500"
                : client.is_stuck
                  ? "[&>div]:bg-red-400"
                  : "[&>div]:bg-indigo-500"
            )}
          />
          <p className="text-xs text-zinc-400">
            Entered onboarding {formatDate(client.pipeline_stage_changed_at)}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={handleNudge}
            disabled={nudging || !client.contact_email}
            title={!client.contact_email ? "No email on file" : undefined}
          >
            {nudging ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Mail className="h-3 w-3" />
            )}
            Nudge
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={handleAdvance}
            disabled={advancing}
          >
            {advancing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowRight className="h-3 w-3" />
            )}
            Move to Setup
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 ml-auto"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Hide checklist
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show checklist
              </>
            )}
          </Button>
        </div>

        {/* Checklist — collapsible */}
        {expanded && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-1">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Bot className="h-3 w-3 text-indigo-400" /> Automated
            </p>
            {automatedSteps.map((step) => (
              <StepRow key={step.id} step={step} />
            ))}

            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mt-3 mb-1 flex items-center gap-1">
              <User className="h-3 w-3 text-zinc-400" /> Manual
            </p>
            {manualSteps.map((step) => (
              <StepRow key={step.id} step={step} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingTracker() {
  const { data, error, isLoading, mutate } = useSWR<StatusResponse>(
    "/api/onboarding/status",
    fetcher,
    { refreshInterval: 60_000 } // auto-refresh every minute
  )

  const handleNudge = useCallback(
    async (clientId: string, email: string | null) => {
      if (!email) return

      await fetch(`/api/portal/admin/clients/${clientId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: "Quick check-in on your HomeField Hub onboarding",
          body: `
            <div style="font-family: sans-serif; max-width: 600px; color: #1a1a1a;">
              <p>Hey there,</p>
              <p>Just wanted to check in on your onboarding progress with HomeField Hub. We're ready to get your campaigns live as soon as we have a few things set up on your end.</p>
              <p>Specifically, we're waiting on:</p>
              <ul>
                <li>Meta Business Manager access</li>
                <li>Lead form approval</li>
              </ul>
              <p>Reply to this email or call/text us directly and we'll get you sorted fast.</p>
              <p>— HomeField Hub Team</p>
            </div>
          `,
        }),
      })

      // Optimistic UI — no state change needed, just a toast would be nice
      // (toast system not imported here to avoid coupling)
    },
    []
  )

  const handleAdvance = useCallback(
    async (clientId: string) => {
      await fetch(`/api/portal/admin/clients/${clientId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "setup" }),
      })

      // Re-fetch — this client should disappear from the list (no longer "onboarding")
      await mutate()
    },
    [mutate]
  )

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-20" />
        </div>
        {[1, 2].map((i) => (
          <Card key={i} className="border border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-1.5 w-full mt-3" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // ─── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/30 dark:border-red-900/50">
        <CardContent className="pt-6 flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Failed to load onboarding status.</span>
          <Button size="sm" variant="ghost" onClick={() => mutate()} className="ml-auto h-7 text-xs">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const clients = data?.clients ?? []
  const stuckCount = data?.stuck_count ?? 0

  // ─── Empty state ────────────────────────────────────────────────────────────
  if (clients.length === 0) {
    return (
      <Card className="border border-zinc-200 dark:border-zinc-800">
        <CardContent className="pt-8 pb-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No clients in onboarding
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Run the onboarding pipeline when a new contractor signs.
          </p>
        </CardContent>
      </Card>
    )
  }

  // ─── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Onboarding Tracker
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {clients.length} client{clients.length !== 1 ? "s" : ""} in onboarding
            {stuckCount > 0 && (
              <span className="text-red-500 font-medium ml-1">
                · {stuckCount} stuck {stuckCount === 1 ? "(>3 days)" : "(>3 days each)"}
              </span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={() => mutate()}
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Stuck clients first, then the rest */}
      {[...clients]
        .sort((a, b) => (b.is_stuck ? 1 : 0) - (a.is_stuck ? 1 : 0))
        .map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onNudge={handleNudge}
            onAdvance={handleAdvance}
          />
        ))}
    </div>
  )
}
