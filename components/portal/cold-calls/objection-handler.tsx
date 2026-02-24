"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Shield,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  X,
  Keyboard,
  Trash2,
  Pencil,
  Check,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = "easy" | "moderate" | "hard"

interface Objection {
  id: string
  objection: string
  rebuttal: string
  difficulty: Difficulty
  custom?: boolean
}

// ─── Difficulty Config ─────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; badgeClass: string; borderClass: string; dotClass: string }
> = {
  easy: {
    label: "Easy Handle",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    borderClass: "border-emerald-500/20 hover:border-emerald-500/40",
    dotClass: "bg-emerald-400",
  },
  moderate: {
    label: "Moderate",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    borderClass: "border-amber-500/20 hover:border-amber-500/40",
    dotClass: "bg-amber-400",
  },
  hard: {
    label: "Hard Handle",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    borderClass: "border-red-500/20 hover:border-red-500/40",
    dotClass: "bg-red-400",
  },
}

// ─── Built-in Objections ──────────────────────────────────────────────────────

const BUILTIN_OBJECTIONS: Omit<Objection, "id">[] = [
  {
    objection: "What is this?",
    rebuttal:
      "I run Facebook ads and AI follow-up for roofing contractors. Basically you get exclusive leads, my system books them on your calendar, you show up and close. Worth 15 minutes to see if it fits your business.",
    difficulty: "easy",
  },
  {
    objection: "I'm busy right now",
    rebuttal:
      "Totally get it. I'll be quick — do you have a system for getting leads consistently, or is it more word of mouth and hoping it stays steady?",
    difficulty: "easy",
  },
  {
    objection: "Send me an email",
    rebuttal:
      "I can do that. But honestly those usually get buried. Can we just do 10 minutes on the phone? If it's not a fit, you'll know fast and I won't bother you again.",
    difficulty: "easy",
  },
  {
    objection: "I'm not interested",
    rebuttal:
      "That's fair. Out of curiosity — is it because you've got lead gen handled, or just bad timing?",
    difficulty: "moderate",
  },
  {
    objection: "I already have a guy",
    rebuttal:
      "That's great — means you know the value of consistent leads. Most of the guys we work with already have a lead source. We just add another channel so you're not dependent on one thing. Worth a 15-minute look?",
    difficulty: "moderate",
  },
  {
    objection: "How much does it cost?",
    rebuttal:
      "Fair question. There's no monthly retainer. You spend about $40/day on ads and pay us $200 per booked appointment. So you're only paying when it works. Can I show you how the math breaks down in 15 minutes?",
    difficulty: "easy",
  },
  {
    objection: "We don't need leads",
    rebuttal:
      "I hear that a lot from guys who are slammed right now. And that's awesome. But what happens when the pipeline dries up? Most of our partners came to us AFTER a slow month. We're just setting up the insurance policy now while you've got the bandwidth. 15 minutes?",
    difficulty: "moderate",
  },
  {
    objection: "Call me back later",
    rebuttal:
      "Totally — when's good? Tuesday or Thursday work better for you? I'll lock it in so I'm not bugging you randomly again.",
    difficulty: "easy",
  },
]

const STORAGE_KEY = "hfh_custom_objections"

function loadCustomObjections(): Objection[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCustomObjections(objections: Objection[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(objections))
}

function buildObjections(custom: Objection[]): Objection[] {
  const builtin: Objection[] = BUILTIN_OBJECTIONS.map((o, i) => ({
    ...o,
    id: `builtin-${i}`,
  }))
  return [...builtin, ...custom]
}

// ─── Objection Card ───────────────────────────────────────────────────────────

interface ObjectionCardProps {
  objection: Objection
  index: number
  isOpen: boolean
  onToggle: () => void
  onDelete?: () => void
  showShortcut: boolean
}

function ObjectionCard({
  objection,
  index,
  isOpen,
  onToggle,
  onDelete,
  showShortcut,
}: ObjectionCardProps) {
  const diff = DIFFICULTY_CONFIG[objection.difficulty]
  const shortcutNum = index + 1

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/60 transition-all duration-200 cursor-pointer",
        diff.borderClass,
        isOpen && "bg-card/90 shadow-sm",
      )}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Difficulty dot */}
        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", diff.dotClass)} />

        {/* Objection text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground/90 truncate">
            "{objection.objection}"
          </p>
        </div>

        {/* Right side: shortcut + difficulty + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showShortcut && shortcutNum <= 8 && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] font-mono border-border/60 text-muted-foreground/60 hidden sm:flex"
            >
              ⌃{shortcutNum}
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-[10px] border", diff.badgeClass)}>
            {diff.label}
          </Badge>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Rebuttal (animated expand) */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="px-4 pb-3 pt-1">
          <Separator className="mb-3 bg-border/40" />
          <p className="text-sm text-foreground/80 leading-relaxed">
            <span className="text-orange-400 font-semibold mr-1">→</span>
            {objection.rebuttal}
          </p>
          {objection.custom && onDelete && (
            <div className="flex justify-end mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Add Objection Form ───────────────────────────────────────────────────────

interface AddObjectionFormProps {
  onAdd: (objection: Omit<Objection, "id" | "custom">) => void
  onCancel: () => void
}

function AddObjectionForm({ onAdd, onCancel }: AddObjectionFormProps) {
  const [text, setText] = useState("")
  const [rebuttal, setRebuttal] = useState("")
  const [difficulty, setDifficulty] = useState<Difficulty>("moderate")

  const handleSubmit = () => {
    if (!text.trim() || !rebuttal.trim()) return
    onAdd({ objection: text.trim(), rebuttal: rebuttal.trim(), difficulty })
    setText("")
    setRebuttal("")
    setDifficulty("moderate")
  }

  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Add Custom Objection
      </p>
      <Input
        placeholder="The objection (e.g. We tried ads before and it didn't work)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-8 text-sm bg-background/60"
      />
      <Textarea
        placeholder="Your rebuttal..."
        value={rebuttal}
        onChange={(e) => setRebuttal(e.target.value)}
        className="text-sm resize-none bg-background/60"
        rows={3}
      />
      {/* Difficulty selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Difficulty:</span>
        {(["easy", "moderate", "hard"] as Difficulty[]).map((d) => {
          const cfg = DIFFICULTY_CONFIG[d]
          return (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium border transition-colors",
                difficulty === d ? cfg.badgeClass : "border-border/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
          onClick={handleSubmit}
          disabled={!text.trim() || !rebuttal.trim()}
        >
          <Check className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ObjectionHandler() {
  const [customObjections, setCustomObjections] = useState<Objection[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Load custom from localStorage
  useEffect(() => {
    setCustomObjections(loadCustomObjections())
  }, [])

  const allObjections = buildObjections(customObjections)

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? allObjections.filter(
        (o) =>
          o.objection.toLowerCase().includes(search.toLowerCase()) ||
          o.rebuttal.toLowerCase().includes(search.toLowerCase()),
      )
    : allObjections

  // ── Toggle objection ───────────────────────────────────────────────────────
  const toggle = useCallback(
    (id: string) => {
      setOpenId((prev) => (prev === id ? null : id))
    },
    [],
  )

  // ── Add custom objection ───────────────────────────────────────────────────
  const addCustom = (data: Omit<Objection, "id" | "custom">) => {
    const newObj: Objection = {
      ...data,
      id: `custom-${Date.now()}`,
      custom: true,
    }
    const updated = [...customObjections, newObj]
    setCustomObjections(updated)
    saveCustomObjections(updated)
    setShowAdd(false)
  }

  // ── Delete custom objection ────────────────────────────────────────────────
  const deleteCustom = (id: string) => {
    const updated = customObjections.filter((o) => o.id !== id)
    setCustomObjections(updated)
    saveCustomObjections(updated)
    if (openId === id) setOpenId(null)
  }

  // ── Keyboard shortcuts (Ctrl+1 through Ctrl+8) ────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "8") {
        const num = parseInt(e.key) - 1
        const target = filtered[num]
        if (target) {
          e.preventDefault()
          toggle(target.id)
        }
      }
      // Ctrl+/ to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [filtered, toggle])

  // ── Counts ─────────────────────────────────────────────────────────────────
  const easyCt = filtered.filter((o) => o.difficulty === "easy").length
  const modCt = filtered.filter((o) => o.difficulty === "moderate").length
  const hardCt = filtered.filter((o) => o.difficulty === "hard").length

  return (
    <TooltipProvider>
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        {/* ── Header ── */}
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-400" />
              Objection Handler
            </CardTitle>

            <div className="flex items-center gap-1.5">
              {/* Keyboard shortcut legend toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7",
                      showShortcuts
                        ? "text-orange-400 bg-orange-500/10"
                        : "text-muted-foreground",
                    )}
                    onClick={() => setShowShortcuts((v) => !v)}
                  >
                    <Keyboard className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle keyboard shortcuts</TooltipContent>
              </Tooltip>

              {/* Add custom */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  showAdd ? "text-orange-400 bg-orange-500/10" : "text-muted-foreground",
                )}
                onClick={() => setShowAdd((v) => !v)}
              >
                {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
              {easyCt} easy
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
              {modCt} moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />
              {hardCt} hard
            </span>
            {customObjections.length > 0 && (
              <span className="ml-auto text-muted-foreground/60">
                +{customObjections.length} custom
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              ref={searchRef}
              placeholder="Search objections... (⌃/)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm bg-muted/30 border-border/60 focus:border-orange-500/40"
            />
            {search && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Keyboard shortcut legend */}
          {showShortcuts && (
            <div className="mt-3 p-2.5 rounded-lg bg-muted/30 border border-border/40">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Keyboard Shortcuts
              </p>
              <div className="grid grid-cols-2 gap-1">
                {filtered.slice(0, 8).map((o, i) => (
                  <div key={o.id} className="flex items-center gap-1.5 text-[11px]">
                    <kbd className="px-1 py-0.5 rounded bg-muted border border-border/60 font-mono text-[10px] text-muted-foreground">
                      ⌃{i + 1}
                    </kbd>
                    <span className="text-muted-foreground truncate">{o.objection}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground/50 mt-2">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border/60 font-mono text-[10px]">
                  ⌃/
                </kbd>{" "}
                Focus search
              </p>
            </div>
          )}
        </CardHeader>

        <Separator className="bg-border/40" />

        {/* ── Body ── */}
        <CardContent className="p-4 space-y-2">
          {/* Add form */}
          {showAdd && (
            <AddObjectionForm
              onAdd={addCustom}
              onCancel={() => setShowAdd(false)}
            />
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground/60 text-sm">
              {search ? `No objections match "${search}"` : "No objections yet"}
            </div>
          )}

          {/* Objection list */}
          {filtered.map((obj, idx) => (
            <ObjectionCard
              key={obj.id}
              objection={obj}
              index={idx}
              isOpen={openId === obj.id}
              onToggle={() => toggle(obj.id)}
              onDelete={obj.custom ? () => deleteCustom(obj.id) : undefined}
              showShortcut={showShortcuts || !search}
            />
          ))}

          {/* Tip */}
          {!search && filtered.length > 0 && (
            <p className="text-center text-[11px] text-muted-foreground/40 pt-1">
              Click any objection to reveal the rebuttal
            </p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
