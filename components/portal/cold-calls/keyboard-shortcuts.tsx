"use client"

import { useEffect, useCallback } from "react"
import {
  Keyboard,
  Phone,
  PhoneOff,
  FileText,
  Shield,
  CheckSquare,
  Navigation,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ShortcutEntry {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  label: string
  icon: typeof Phone
  color: string
  entries: ShortcutEntry[]
}

interface KeyboardShortcutsProps {
  open: boolean
  onClose: () => void
}

// ─── Shortcut Data ─────────────────────────────────────────────────────────────

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: "Calling",
    icon: Phone,
    color: "text-emerald-400",
    entries: [
      { keys: ["Ctrl", "D"], description: "Start dialing current lead" },
      { keys: ["Ctrl", "E"], description: "End / hang up call" },
      { keys: ["Esc"], description: "Cancel auto-dial countdown" },
    ],
  },
  {
    label: "Script",
    icon: FileText,
    color: "text-blue-400",
    entries: [
      { keys: ["Ctrl", "S"], description: "Toggle script auto-scroll" },
      { keys: ["←"], description: "Previous script section" },
      { keys: ["→"], description: "Next script section" },
    ],
  },
  {
    label: "Objections",
    icon: Shield,
    color: "text-amber-400",
    entries: [
      { keys: ["Ctrl", "1"], description: 'Objection: "What is this?"' },
      { keys: ["Ctrl", "2"], description: 'Objection: "I\'m busy"' },
      { keys: ["Ctrl", "3"], description: 'Objection: "Send email"' },
      { keys: ["Ctrl", "4"], description: 'Objection: "Already have someone"' },
      { keys: ["Ctrl", "5"], description: 'Objection: "Not interested"' },
      { keys: ["Ctrl", "6"], description: 'Objection: "How much?"' },
      { keys: ["Ctrl", "7"], description: 'Objection: "No budget"' },
      { keys: ["Ctrl", "8"], description: 'Objection: "Call back later"' },
    ],
  },
  {
    label: "Disposition",
    icon: CheckSquare,
    color: "text-purple-400",
    entries: [
      { keys: ["1"], description: "No Answer" },
      { keys: ["2"], description: "Voicemail" },
      { keys: ["3"], description: "Answered / Conversation" },
      { keys: ["4"], description: "Wrong Number" },
      { keys: ["5"], description: "Not Interested" },
      { keys: ["6"], description: "Booked Demo 🎉" },
    ],
  },
  {
    label: "Navigation",
    icon: Navigation,
    color: "text-orange-400",
    entries: [
      { keys: ["P"], description: "Toggle Power Mode (minimal view)" },
      { keys: ["?"], description: "Show / hide keyboard shortcuts" },
      { keys: ["Tab"], description: "Move focus between panels" },
    ],
  },
]

// ─── Key Badge ─────────────────────────────────────────────────────────────────

function KeyBadge({ k }: { k: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center rounded border border-border",
        "bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground",
        "min-w-[1.5rem] shadow-sm"
      )}
    >
      {k}
    </kbd>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  // Close on Esc
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        onInteractOutside={onClose}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5 text-orange-400" />
            Keyboard Shortcuts
            <Badge variant="outline" className="ml-auto font-mono text-xs">
              ? to toggle
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 grid gap-5 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => {
            const Icon = group.icon
            return (
              <div key={group.label} className="space-y-2">
                {/* Group header */}
                <div className="flex items-center gap-2 border-b pb-1.5">
                  <Icon className={cn("size-4", group.color)} />
                  <span className="text-sm font-semibold">{group.label}</span>
                </div>

                {/* Entries */}
                <div className="space-y-1.5">
                  {group.entries.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-md px-1 py-0.5"
                    >
                      <span className="text-xs text-muted-foreground">{entry.description}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        {entry.keys.map((k, ki) => (
                          <KeyBadge key={ki} k={k} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground/60">
          Disposition shortcuts (1–6) only active when focus is outside a text field
        </p>
      </DialogContent>
    </Dialog>
  )
}
