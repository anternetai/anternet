"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  StickyNote,
  ThumbsUp,
  HelpCircle,
  PhoneCall,
  UserX,
  Voicemail,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface QuickCapture {
  label: string
  icon: typeof ThumbsUp
  value: string
  color: string
}

interface LiveNotesProps {
  leadId: string | null
  leadNotes?: string | null
  onNotesChange?: (notes: string) => void
  className?: string
}

// ─── Quick Captures ────────────────────────────────────────────────────────────

const QUICK_CAPTURES: QuickCapture[] = [
  {
    label: "Interested",
    icon: ThumbsUp,
    value: "✅ Interested",
    color: "border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/10 text-emerald-400",
  },
  {
    label: "Has Questions",
    icon: HelpCircle,
    value: "❓ Has Questions",
    color: "border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/10 text-blue-400",
  },
  {
    label: "Callback",
    icon: PhoneCall,
    value: "📞 Wants Callback",
    color: "border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/10 text-orange-400",
  },
  {
    label: "Gatekeeper",
    icon: UserX,
    value: "🛡️ Gatekeeper: ",
    color: "border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 text-amber-400",
  },
  {
    label: "Left VM",
    icon: Voicemail,
    value: "📱 Left Voicemail",
    color: "border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/10 text-purple-400",
  },
]

// ─── Auto-save hook ────────────────────────────────────────────────────────────

function useAutoSave(leadId: string | null, notes: string, delay = 2000) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevLeadId = useRef<string | null>(null)

  // Persist notes per-lead in memory (session storage)
  const saveToStorage = useCallback((id: string, text: string) => {
    try {
      sessionStorage.setItem(`live-notes-${id}`, text)
    } catch {}
  }, [])

  // Auto-save to Supabase via disposition API with a debounce
  useEffect(() => {
    if (!leadId || !notes) return
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        saveToStorage(leadId, notes)
        // Lightweight "notes autosave" POST
        await fetch("/api/portal/dialer/disposition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            outcome: "conversation",
            notes,
            autosave: true,
          }),
        })
        setLastSaved(new Date())
      } catch {
        // Silently fail — notes still saved to sessionStorage
      } finally {
        setSaving(false)
      }
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [leadId, notes, delay, saveToStorage])

  return { saving, lastSaved }
}

// ─── Live Notes Component ──────────────────────────────────────────────────────

export function LiveNotes({ leadId, leadNotes, onNotesChange, className }: LiveNotesProps) {
  const [notes, setNotes] = useState("")
  const [showPrevious, setShowPrevious] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { saving, lastSaved } = useAutoSave(leadId, notes)

  // Load notes when lead changes
  useEffect(() => {
    if (!leadId) {
      setNotes("")
      return
    }
    // Try session storage first (in-progress call notes)
    try {
      const cached = sessionStorage.getItem(`live-notes-${leadId}`)
      if (cached) {
        setNotes(cached)
        onNotesChange?.(cached)
        return
      }
    } catch {}
    // Otherwise start fresh
    setNotes("")
  }, [leadId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (value: string) => {
      setNotes(value)
      if (leadId) {
        try {
          sessionStorage.setItem(`live-notes-${leadId}`, value)
        } catch {}
      }
      onNotesChange?.(value)
    },
    [leadId, onNotesChange]
  )

  const appendQuickCapture = useCallback(
    (value: string) => {
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      const line = `[${timestamp}] ${value}`
      const newNotes = notes ? `${notes}\n${line}` : line
      handleChange(newNotes)
      // Focus + move cursor to end
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const len = textareaRef.current.value.length
          textareaRef.current.setSelectionRange(len, len)
        }
      }, 50)
    },
    [notes, handleChange]
  )

  const hasPreviousNotes = leadNotes && leadNotes.trim().length > 0

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="size-4 text-orange-400" />
          <span className="text-sm font-medium">Live Notes</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Saving...
            </span>
          )}
          {lastSaved && !saving && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Save className="size-3" />
              Saved{" "}
              {lastSaved.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          )}
        </div>
      </div>

      {/* Previous notes (collapsible) */}
      {hasPreviousNotes && (
        <div className="rounded-md border border-muted bg-muted/20">
          <button
            type="button"
            onClick={() => setShowPrevious((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="size-3" />
              Previous call notes
            </span>
            {showPrevious ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </button>
          {showPrevious && (
            <div className="border-t border-muted px-3 pb-2.5 pt-2">
              <p className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">
                {leadNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick-capture buttons */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_CAPTURES.map((qc) => {
          const Icon = qc.icon
          return (
            <button
              key={qc.label}
              type="button"
              onClick={() => appendQuickCapture(qc.value)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium",
                "transition-all duration-150 cursor-pointer",
                qc.color
              )}
            >
              <Icon className="size-3" />
              {qc.label}
            </button>
          )
        })}
      </div>

      {/* Freetext area */}
      <Textarea
        ref={textareaRef}
        placeholder={
          leadId
            ? "Type notes here — auto-saved as you type..."
            : "Select a lead to take notes..."
        }
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        disabled={!leadId}
        rows={4}
        className="resize-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
      />
    </div>
  )
}
