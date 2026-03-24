"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Zap,
  TrendingUp,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trophy,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProvenHook {
  id: string
  hook_text: string
  trade_vertical: string | null
  times_used: number
  conversations: number
  demos_booked: number
  demo_rate: number
  gatekeeper_pass_rate: number
  updated_at: string | null
}

interface HookSelectorProps {
  /** Current lead's trade — used to filter relevant hooks to the top */
  tradeVertical?: string | null
  /** Called when user selects a hook. Passes hook id + text for post-call logging. */
  onSelect?: (hookId: string, hookText: string) => void
  /** Currently selected hook id (controlled) */
  selectedHookId?: string | null
  className?: string
}

// ─── Performance Tier ─────────────────────────────────────────────────────────

type PerfTier = "top" | "good" | "low" | "unproven"

function getPerfTier(hook: ProvenHook): PerfTier {
  if (hook.times_used < 3) return "unproven"
  if (hook.demo_rate >= 0.1) return "top"
  if (hook.demo_rate >= 0.05) return "good"
  return "low"
}

const TIER_CONFIG: Record<PerfTier, { label: string; badgeClass: string; borderClass: string }> = {
  top: {
    label: "Top",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    borderClass: "border-emerald-500/30 hover:border-emerald-500/50",
  },
  good: {
    label: "Good",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    borderClass: "border-blue-500/20 hover:border-blue-500/40",
  },
  low: {
    label: "Low",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    borderClass: "border-red-500/20 hover:border-red-500/30",
  },
  unproven: {
    label: "New",
    badgeClass: "bg-muted text-muted-foreground border-border",
    borderClass: "border-border/60 hover:border-border",
  },
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

// ─── Hook Card ────────────────────────────────────────────────────────────────

interface HookCardProps {
  hook: ProvenHook
  isSelected: boolean
  isTradeMatch: boolean
  onSelect: () => void
}

function HookCard({ hook, isSelected, isTradeMatch, onSelect }: HookCardProps) {
  const [expanded, setExpanded] = useState(false)
  const tier = getPerfTier(hook)
  const tierCfg = TIER_CONFIG[tier]

  const isTop = tier === "top"

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/60 transition-all duration-150",
        tierCfg.borderClass,
        isSelected && "ring-1 ring-orange-500/60 bg-orange-500/5",
        isTop && "bg-emerald-500/5",
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        {/* Select button */}
        <button
          onClick={onSelect}
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            isSelected
              ? "border-orange-500 bg-orange-500"
              : "border-border/60 hover:border-orange-500/50",
          )}
        >
          {isSelected && <Check className="size-2.5 text-white" />}
        </button>

        {/* Hook text + meta */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm leading-snug cursor-pointer",
              expanded ? "text-foreground" : "line-clamp-2 text-foreground/90",
            )}
            onClick={() => setExpanded((v) => !v)}
          >
            {hook.hook_text}
          </p>

          {/* Stats row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {/* Tier badge */}
            <Badge variant="outline" className={cn("h-4 text-[10px] px-1.5 border", tierCfg.badgeClass)}>
              {isTop && <Trophy className="mr-0.5 size-2.5" />}
              {tierCfg.label}
            </Badge>

            {/* Trade match */}
            {isTradeMatch && hook.trade_vertical && (
              <Badge variant="outline" className="h-4 text-[10px] px-1.5 border-orange-500/30 text-orange-400">
                {hook.trade_vertical.replace(/_/g, " ")}
              </Badge>
            )}

            {/* Stats */}
            {hook.times_used >= 3 ? (
              <>
                <span className="text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground">{formatRate(hook.demo_rate)}</span> demo rate
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {hook.times_used} uses
                </span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                {hook.times_used} use{hook.times_used !== 1 ? "s" : ""} (unproven)
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-0">
          <Separator className="mb-2.5 bg-border/30" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-muted/30 p-1.5">
              <p className="text-xs font-semibold">{formatRate(hook.demo_rate)}</p>
              <p className="text-[10px] text-muted-foreground">Demo Rate</p>
            </div>
            <div className="rounded bg-muted/30 p-1.5">
              <p className="text-xs font-semibold">{formatRate(hook.gatekeeper_pass_rate)}</p>
              <p className="text-[10px] text-muted-foreground">Contact Rate</p>
            </div>
            <div className="rounded bg-muted/30 p-1.5">
              <p className="text-xs font-semibold">{hook.demos_booked}</p>
              <p className="text-[10px] text-muted-foreground">Demos</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HookSelector({
  tradeVertical,
  onSelect,
  selectedHookId,
  className,
}: HookSelectorProps) {
  const [hooks, setHooks] = useState<ProvenHook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localSelected, setLocalSelected] = useState<string | null>(null)

  // Use controlled value if provided, else internal state
  const activeSelected = selectedHookId !== undefined ? selectedHookId : localSelected

  const fetchHooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/cold-calls/hooks")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { hooks: ProvenHook[] }
      setHooks(data.hooks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hooks")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHooks()
  }, [fetchHooks])

  function handleSelect(hook: ProvenHook) {
    const isDeselecting = activeSelected === hook.id
    const newId = isDeselecting ? null : hook.id

    if (selectedHookId === undefined) {
      setLocalSelected(newId)
    }

    if (!isDeselecting && onSelect) {
      onSelect(hook.id, hook.hook_text)
    }
  }

  // ── Sort: trade matches first, then by demo_rate ──────────────────────────
  const sortedHooks = [...hooks].sort((a, b) => {
    const aMatch = tradeVertical && a.trade_vertical === tradeVertical ? 1 : 0
    const bMatch = tradeVertical && b.trade_vertical === tradeVertical ? 1 : 0
    if (aMatch !== bMatch) return bMatch - aMatch
    return b.demo_rate - a.demo_rate
  })

  const topPerformer = sortedHooks.find((h) => h.times_used >= 3 && getPerfTier(h) === "top")

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className={cn("border-border/60 bg-card/80 backdrop-blur-sm", className)}>
        <CardContent className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-orange-500" />
          <span className="text-sm">Loading hooks...</span>
        </CardContent>
      </Card>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className={cn("border-border/60 bg-card/80 backdrop-blur-sm", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <AlertCircle className="size-6 text-red-400" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchHooks} className="gap-1.5 h-7 text-xs">
            <RefreshCw className="size-3" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-border/60 bg-card/80 backdrop-blur-sm", className)}>
      {/* Header */}
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="size-4 text-orange-400" />
            Hook Selector
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeSelected && (
              <Badge
                variant="outline"
                className="h-5 text-[10px] border-orange-500/30 text-orange-400"
              >
                <Check className="mr-1 size-2.5" />
                Selected
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={fetchHooks}
              title="Refresh"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Top performer callout */}
        {topPerformer && (
          <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1 mb-1">
              <Trophy className="size-3" />
              Top Performer — {formatRate(topPerformer.demo_rate)} demo rate
            </p>
            <p className="text-xs text-foreground/80 line-clamp-2">{topPerformer.hook_text}</p>
          </div>
        )}

        {/* Stats row */}
        {hooks.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3 text-emerald-400" />
              {hooks.filter((h) => getPerfTier(h) === "top").length} top performers
            </span>
            <span>{hooks.length} total hooks</span>
            {tradeVertical && (
              <span className="ml-auto text-orange-400/70">
                Filtered for {tradeVertical.replace(/_/g, " ")}
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <Separator className="bg-border/40" />

      {/* Hook list */}
      <CardContent className="px-4 pb-4 pt-3 space-y-2">
        {sortedHooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50 gap-2">
            <Zap className="size-7" />
            <p className="text-sm">No hooks yet</p>
            <p className="text-xs text-center">
              Hooks are created automatically when you log calls using the post-call logger.
            </p>
          </div>
        ) : (
          sortedHooks.map((hook) => (
            <HookCard
              key={hook.id}
              hook={hook}
              isSelected={activeSelected === hook.id}
              isTradeMatch={!!tradeVertical && hook.trade_vertical === tradeVertical}
              onSelect={() => handleSelect(hook)}
            />
          ))
        )}

        {activeSelected && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (selectedHookId === undefined) setLocalSelected(null)
            }}
          >
            Clear selection
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
