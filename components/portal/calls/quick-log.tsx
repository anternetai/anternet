"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  Phone,
  PhoneOff,
  UserCheck,
  MessageSquare,
  CalendarCheck,
  XCircle,
  Voicemail,
  Clock,
  ArrowRight,
  RotateCcw,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { CallLog } from "@/app/api/portal/calls/dashboard/route"

type Outcome =
  | "no_answer"
  | "voicemail"
  | "gatekeeper"
  | "conversation"
  | "demo_booked"
  | "not_interested"
  | "callback"

const OUTCOME_CONFIG: Record<
  Outcome,
  { label: string; icon: typeof Phone; color: string; bgColor: string }
> = {
  no_answer: {
    label: "No Answer",
    icon: PhoneOff,
    color: "text-muted-foreground",
    bgColor: "border-muted-foreground/20 hover:border-muted-foreground/50 hover:bg-muted",
  },
  voicemail: {
    label: "Voicemail",
    icon: Voicemail,
    color: "text-blue-500",
    bgColor: "border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/10",
  },
  gatekeeper: {
    label: "Gatekeeper",
    icon: XCircle,
    color: "text-amber-500",
    bgColor: "border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10",
  },
  conversation: {
    label: "Conversation",
    icon: MessageSquare,
    color: "text-emerald-500",
    bgColor: "border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10",
  },
  demo_booked: {
    label: "Demo Booked!",
    icon: CalendarCheck,
    color: "text-purple-500",
    bgColor: "border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/10",
  },
  not_interested: {
    label: "Not Interested",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10",
  },
  callback: {
    label: "Callback",
    icon: Clock,
    color: "text-orange-500",
    bgColor: "border-orange-500/20 hover:border-orange-500/50 hover:bg-orange-500/10",
  },
}

interface QuickLogProps {
  todayLogs: CallLog[]
  todayStats: {
    total_dials: number
    contacts: number
    conversations: number
    demos_booked: number
  }
  onLogCall: (log: Partial<CallLog>) => Promise<void>
  onUpdateStats: (stats: Record<string, number>) => Promise<void>
}

export function QuickLog({
  todayLogs,
  todayStats,
  onLogCall,
  onUpdateStats,
}: QuickLogProps) {
  const [businessName, setBusinessName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null)
  const [sessionCount, setSessionCount] = useState(0)
  const businessInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the business name input for speed
  useEffect(() => {
    businessInputRef.current?.focus()
  }, [])

  const handleOutcome = useCallback(
    async (outcome: Outcome) => {
      setSaving(true)
      setLastOutcome(outcome)

      const contactMade = ["conversation", "demo_booked", "callback", "not_interested"].includes(outcome)
      const isConversation = ["conversation", "demo_booked"].includes(outcome)
      const isDemoBooked = outcome === "demo_booked"

      try {
        // Log the individual call
        await onLogCall({
          business_name: businessName || undefined,
          phone_number: phoneNumber || undefined,
          outcome,
          contact_made: contactMade,
          conversation: isConversation,
          demo_booked: isDemoBooked,
          notes: notes || undefined,
        })

        // Update daily stats
        const newStats = {
          total_dials: todayStats.total_dials + 1,
          contacts: todayStats.contacts + (contactMade ? 1 : 0),
          conversations: todayStats.conversations + (isConversation ? 1 : 0),
          demos_booked: todayStats.demos_booked + (isDemoBooked ? 1 : 0),
        }
        await onUpdateStats(newStats)

        setSessionCount((c) => c + 1)
        // Clear form for next call
        setBusinessName("")
        setPhoneNumber("")
        setNotes("")

        // Re-focus for next call
        setTimeout(() => businessInputRef.current?.focus(), 100)
      } catch (e) {
        console.error("Failed to log call:", e)
      } finally {
        setSaving(false)
      }
    },
    [businessName, phoneNumber, notes, todayStats, onLogCall, onUpdateStats]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "1":
            e.preventDefault()
            handleOutcome("no_answer")
            break
          case "2":
            e.preventDefault()
            handleOutcome("voicemail")
            break
          case "3":
            e.preventDefault()
            handleOutcome("gatekeeper")
            break
          case "4":
            e.preventDefault()
            handleOutcome("conversation")
            break
          case "5":
            e.preventDefault()
            handleOutcome("demo_booked")
            break
          case "6":
            e.preventDefault()
            handleOutcome("not_interested")
            break
          case "7":
            e.preventDefault()
            handleOutcome("callback")
            break
        }
      }
    },
    [handleOutcome]
  )

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      {/* Session Stats Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-orange-500" />
          <span className="text-sm font-medium">Quick Log Session</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="tabular-nums">
            {sessionCount} logged this session
          </Badge>
          <Badge variant="outline" className="tabular-nums">
            {todayStats.total_dials} total today
          </Badge>
          <Badge variant="outline" className="tabular-nums text-blue-500">
            {todayStats.contacts} contacts
          </Badge>
          <Badge variant="outline" className="tabular-nums text-emerald-500">
            {todayStats.demos_booked} demos
          </Badge>
        </div>
      </div>

      {/* Quick Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="size-4 text-orange-500" />
            Log Next Call
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              ref={businessInputRef}
              placeholder="Business name (optional)"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="h-10"
            />
            <Input
              placeholder="Phone number (optional)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="h-10"
              type="tel"
            />
          </div>
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none"
          />

          {/* Outcome Buttons - The Main UI */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Click outcome or use ⌘1-7 shortcuts
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {(Object.entries(OUTCOME_CONFIG) as [Outcome, (typeof OUTCOME_CONFIG)[Outcome]][]).map(
                ([key, config], index) => {
                  const Icon = config.icon
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      className={`h-auto flex-col gap-1 py-3 ${config.bgColor} ${
                        lastOutcome === key ? "ring-2 ring-offset-2 ring-offset-background" : ""
                      }`}
                      disabled={saving}
                      onClick={() => handleOutcome(key)}
                    >
                      <Icon className={`size-5 ${config.color}`} />
                      <span className="text-xs font-medium">{config.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ⌘{index + 1}
                      </span>
                    </Button>
                  )
                }
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Call Log (Today) */}
      {todayLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>Recent Calls Today ({todayLogs.length})</span>
              <RotateCcw className="size-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {todayLogs.slice(0, 20).map((log) => {
                const outcomeConfig = log.outcome
                  ? OUTCOME_CONFIG[log.outcome as Outcome]
                  : null
                const Icon = outcomeConfig?.icon || Phone
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <Icon
                      className={`size-3.5 shrink-0 ${
                        outcomeConfig?.color || "text-muted-foreground"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {log.business_name || log.phone_number || "Unknown"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${
                        outcomeConfig?.color || ""
                      }`}
                    >
                      {outcomeConfig?.label || log.outcome || "Logged"}
                    </Badge>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {log.call_time
                        ? new Date(`2000-01-01T${log.call_time}`).toLocaleTimeString(
                            "en-US",
                            { hour: "numeric", minute: "2-digit" }
                          )
                        : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
