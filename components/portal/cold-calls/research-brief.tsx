"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BookOpen,
  MapPin,
  Phone,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Star,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ResearchBrief } from "@/app/api/cold-calls/research/route"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResearchBriefProps {
  leadId: string | null
  businessName?: string | null
  className?: string
}

// ─── Outcome Config ───────────────────────────────────────────────────────────

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  no_answer: { label: "No Answer", color: "text-muted-foreground" },
  voicemail: { label: "Voicemail", color: "text-blue-400" },
  gatekeeper: { label: "Gatekeeper", color: "text-amber-400" },
  conversation: { label: "Talked", color: "text-emerald-400" },
  demo_booked: { label: "Demo Booked", color: "text-orange-400" },
  not_interested: { label: "Not Interested", color: "text-red-400" },
  wrong_number: { label: "Wrong #", color: "text-red-400" },
  callback: { label: "Callback", color: "text-purple-400" },
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never"
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionToggle({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon className="size-3" />
        {title}
        <span className="ml-auto">
          {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </span>
      </button>
      {open && children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResearchBriefPanel({ leadId, businessName, className }: ResearchBriefProps) {
  const [brief, setBrief] = useState<ResearchBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBrief = useCallback(async () => {
    if (!leadId) {
      setBrief(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/cold-calls/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: [leadId] }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as { briefs: ResearchBrief[] }
      setBrief(data.briefs?.[0] ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load research")
    } finally {
      setLoading(false)
    }
  }, [leadId])

  // Auto-fetch when leadId changes
  useEffect(() => {
    fetchBrief()
  }, [fetchBrief])

  // ── Render: no lead selected ──────────────────────────────────────────────
  if (!leadId) {
    return (
      <Card className={cn("border-border/60 bg-card/80 backdrop-blur-sm", className)}>
        <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
          <BookOpen className="mb-2 size-8" />
          <p className="text-sm">Select a lead to see research</p>
        </CardContent>
      </Card>
    )
  }

  // ── Render: loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className={cn("border-border/60 bg-card/80 backdrop-blur-sm", className)}>
        <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-orange-500" />
          <p className="text-sm">Loading research brief...</p>
        </CardContent>
      </Card>
    )
  }

  // ── Render: error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className={cn("border-border/60 bg-card/80 backdrop-blur-sm", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <AlertCircle className="size-6 text-red-400" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchBrief} className="gap-1.5 h-7 text-xs">
            <RefreshCw className="size-3" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Render: no data ───────────────────────────────────────────────────────
  if (!brief) {
    return (
      <Card className={cn("border-border/60 bg-card/80 backdrop-blur-sm", className)}>
        <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
          <BookOpen className="mb-2 size-8" />
          <p className="text-sm">No brief available</p>
        </CardContent>
      </Card>
    )
  }

  const lastOutcomeCfg = brief.last_outcome ? OUTCOME_LABELS[brief.last_outcome] : null

  return (
    <Card className={cn("border-border/60 bg-card/80 backdrop-blur-sm", className)}>
      {/* Header */}
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="size-4 text-orange-400" />
            Research Brief
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground shrink-0"
            onClick={fetchBrief}
            title="Refresh"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>

        {/* Company identity */}
        <div className="mt-2 space-y-1" data-pii>
          <p className="text-sm font-semibold text-foreground">
            {brief.business_name ?? businessName ?? "Unknown Business"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {brief.trade && (
              <Badge variant="outline" className="h-5 text-[10px] border-orange-500/30 text-orange-400">
                {brief.trade.replace(/_/g, " ")}
              </Badge>
            )}
            {brief.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {brief.location}
              </span>
            )}
            {brief.phone && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="size-3" />
                {brief.phone}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <Separator className="bg-border/40" />

      <CardContent className="px-4 pb-4 pt-3 space-y-4">
        {/* Prior contact history */}
        {brief.prior_call_count > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 space-y-1">
            <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
              <Clock className="size-3" />
              Prior Contact
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{brief.prior_call_count} call{brief.prior_call_count !== 1 ? "s" : ""} made</span>
              {lastOutcomeCfg && (
                <span className={cn("font-medium", lastOutcomeCfg.color)}>
                  Last: {lastOutcomeCfg.label}
                </span>
              )}
              <span className="ml-auto">{formatRelativeTime(brief.last_called_at)}</span>
            </div>
          </div>
        )}

        {/* Suggested opener */}
        <SectionToggle title="Suggested Opener" icon={MessageSquare} defaultOpen>
          <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2.5" data-pii>
            <p className="text-sm leading-relaxed text-foreground/90 italic">
              "{brief.suggested_opener}"
            </p>
          </div>
        </SectionToggle>

        {/* Pain points */}
        <SectionToggle title="Pain Points for This Trade" icon={TrendingUp} defaultOpen>
          <ul className="space-y-1.5">
            {brief.pain_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="mt-1 size-1.5 rounded-full bg-red-400 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </SectionToggle>

        {/* Personalization hooks */}
        <SectionToggle title="Personalization Hooks" icon={Star} defaultOpen={false}>
          <ul className="space-y-1.5">
            {brief.personalization_hooks.map((hook, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="text-orange-400 font-bold shrink-0">→</span>
                {hook}
              </li>
            ))}
          </ul>
        </SectionToggle>

        {/* Google reviews placeholder */}
        <SectionToggle title="Google Reviews" icon={Star} defaultOpen={false}>
          <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5 text-center">
            <p className="text-xs text-muted-foreground/60">
              Google Reviews lookup coming soon via Tavily integration.
            </p>
            {brief.business_name && (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(brief.business_name + " " + (brief.location ?? "") + " reviews")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-orange-400 hover:underline"
              >
                Search Google manually
              </a>
            )}
          </div>
        </SectionToggle>
      </CardContent>
    </Card>
  )
}
