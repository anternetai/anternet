"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
  ChevronUp,
  Mic,
  Timer,
  Shield,
  Target,
  Zap,
  AlertTriangle,
  Info,
  TrendingUp,
  Award,
} from "lucide-react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
} from "recharts"
import type { CallGrades, CoachingTip } from "@/lib/dialer/ai-types"

interface CoachingPanelProps {
  grades?: CallGrades
  tips?: CoachingTip[]
  className?: string
}

const GRADE_CONFIG = [
  {
    key: "tonality" as keyof CallGrades,
    label: "Tonality",
    icon: Mic,
    color: "text-orange-500",
    bg: "bg-orange-500",
    description: "Confidence, warmth, and vocal energy",
  },
  {
    key: "pacing" as keyof CallGrades,
    label: "Pacing",
    icon: Timer,
    color: "text-blue-500",
    bg: "bg-blue-500",
    description: "Speaking rate and natural pauses",
  },
  {
    key: "objectionHandling" as keyof CallGrades,
    label: "Objections",
    icon: Shield,
    color: "text-purple-500",
    bg: "bg-purple-500",
    description: "How well objections were addressed",
  },
  {
    key: "closeAttempt" as keyof CallGrades,
    label: "Close",
    icon: Target,
    color: "text-emerald-500",
    bg: "bg-emerald-500",
    description: "Effectiveness of the ask",
  },
  {
    key: "overall" as keyof CallGrades,
    label: "Overall",
    icon: Award,
    color: "text-yellow-500",
    bg: "bg-yellow-500",
    description: "Overall call performance",
  },
]

const TIP_ICON = {
  info: Info,
  warning: AlertTriangle,
  critical: Zap,
}

const TIP_COLOR = {
  info: "text-blue-400 border-blue-500/20 bg-blue-500/5",
  warning: "text-orange-400 border-orange-500/20 bg-orange-500/5",
  critical: "text-red-400 border-red-500/20 bg-red-500/5",
}

function GradeBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(Math.max((value / 10) * 100, 0), 100)
  const colorClass =
    pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-orange-500" : "bg-red-500"

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function GradeEmoji(score: number) {
  if (score >= 8) return "🔥"
  if (score >= 6) return "✅"
  if (score >= 4) return "⚠️"
  return "❌"
}

// Default placeholder grades for demo/loading state
const PLACEHOLDER_GRADES: CallGrades = {
  tonality: 0,
  pacing: 0,
  objectionHandling: 0,
  closeAttempt: 0,
  overall: 0,
}

export function CoachingPanel({ grades, tips = [], className }: CoachingPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const g = grades || PLACEHOLDER_GRADES
  const hasGrades = grades && Object.values(grades).some((v) => v > 0)

  // Radar chart data
  const radarData = [
    { subject: "Tonality", value: g.tonality, fullMark: 10 },
    { subject: "Pacing", value: g.pacing, fullMark: 10 },
    { subject: "Objections", value: g.objectionHandling, fullMark: 10 },
    { subject: "Close", value: g.closeAttempt, fullMark: 10 },
    { subject: "Overall", value: g.overall, fullMark: 10 },
  ]

  const filteredTips = activeCategory
    ? tips.filter((t) => t.category === activeCategory)
    : tips

  const tipCategories = [...new Set(tips.map((t) => t.category))]

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4 text-orange-500" />
            Coaching
            {hasGrades && (
              <Badge variant="outline" className="text-xs">
                {GradeEmoji(g.overall)} {g.overall}/10 overall
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-4 pt-0">
          {!hasGrades ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Grades will appear after AI analyzes the call recording.
            </p>
          ) : (
            <>
              {/* Radar Chart + Bar grades side by side */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Radar chart */}
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid
                        stroke="hsl(var(--border))"
                        strokeOpacity={0.5}
                      />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="hsl(var(--orange-500, 249 115 22))"
                        fill="rgba(249, 115, 22, 0.15)"
                        strokeWidth={2}
                      />
                      <ChartTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number | undefined) => [`${value ?? 0}/10`, "Score"]}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar grades */}
                <div className="space-y-2.5">
                  {GRADE_CONFIG.map((cfg) => {
                    const score = g[cfg.key] as number
                    const Icon = cfg.icon
                    return (
                      <div key={cfg.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`size-3 ${cfg.color}`} />
                            <span className="text-xs font-medium">{cfg.label}</span>
                          </div>
                          <span className="tabular-nums text-xs text-muted-foreground">
                            {score > 0 ? `${score}/10` : "—"}
                          </span>
                        </div>
                        <GradeBar value={score} color={cfg.color} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tips */}
              {tips.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Coaching Tips
                    </p>
                    {tipCategories.length > 1 && (
                      <div className="flex gap-1">
                        {tipCategories.map((cat) => (
                          <Button
                            key={cat}
                            variant="ghost"
                            size="sm"
                            className={`h-5 px-2 text-[10px] capitalize ${
                              activeCategory === cat ? "bg-muted" : ""
                            }`}
                            onClick={() =>
                              setActiveCategory(activeCategory === cat ? null : cat)
                            }
                          >
                            {cat}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {filteredTips.map((tip, i) => {
                      const Icon = TIP_ICON[tip.severity]
                      return (
                        <div
                          key={i}
                          data-pii
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                            TIP_COLOR[tip.severity]
                          }`}
                        >
                          <Icon className="mt-0.5 size-3 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p>{tip.tip}</p>
                            {tip.timestamp !== undefined && (
                              <p className="mt-0.5 text-[10px] opacity-60">
                                @ {Math.floor(tip.timestamp / 60)}:
                                {(tip.timestamp % 60).toString().padStart(2, "0")}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="h-4 shrink-0 px-1 text-[9px] capitalize opacity-70"
                          >
                            {tip.category}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Generate placeholder coaching tips from an AI response.
 * Used when the API doesn't return structured coaching data.
 */
export function generateCoachingTips(keyPoints: string[], objections: string[]): CoachingTip[] {
  const tips: CoachingTip[] = []

  if (objections.length > 0) {
    tips.push({
      category: "objection",
      tip: `${objections.length} objection${objections.length > 1 ? "s" : ""} detected: "${objections[0]}"`,
      severity: "warning",
    })
  }

  if (keyPoints.length === 0) {
    tips.push({
      category: "general",
      tip: "No key talking points were identified. Make sure to mention your core value proposition.",
      severity: "info",
    })
  }

  return tips
}
