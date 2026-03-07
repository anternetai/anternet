"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { KnockLogTab } from "@/components/portal/the-move/knock-log-tab"
import { KnockHistoryTab } from "@/components/portal/the-move/knock-history-tab"
import { KnockMapTab } from "@/components/portal/the-move/knock-map-tab"
import type { DoorKnockSession, GpsPin } from "@/lib/the-move/types"

const ADMIN_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

const TABS = ["Log", "History", "Map"] as const
type Tab = (typeof TABS)[number]

export default function DoorKnockPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("Log")
  const [sessions, setSessions] = useState<DoorKnockSession[]>([])
  const [editSession, setEditSession] = useState<DoorKnockSession | null>(null)
  const [gpsPins, setGpsPins] = useState<GpsPin[]>([])

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== ADMIN_ID) {
        router.push("/portal/dashboard")
        return
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/portal/the-move/door-knocks?limit=50")
    if (res.ok) setSessions(await res.json())
  }, [])

  useEffect(() => {
    if (!loading) fetchSessions()
  }, [loading, fetchSessions])

  function handleSubmit(session: DoorKnockSession) {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = session
        return updated
      }
      return [session, ...prev]
    })
    setEditSession(null)
    setGpsPins([])
  }

  function handleEdit(session: DoorKnockSession) {
    setEditSession(session)
    setGpsPins(session.gps_pins || [])
    setTab("Log")
  }

  function handleAddPin(pin: GpsPin) {
    setGpsPins((prev) => [...prev, pin])
  }

  function handleRemovePin(index: number) {
    setGpsPins((prev) => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-black">
        <div className="size-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-lg px-4 pb-6 pt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/portal/the-move"
            className="flex size-9 items-center justify-center rounded-full border border-stone-800 text-stone-400 hover:text-stone-200"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-stone-100">Door Knocks</h1>
            <p className="text-xs text-stone-500">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} logged
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-5 flex rounded-xl border border-stone-800 bg-stone-900/50 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-stone-500 active:bg-stone-800"
              }`}
            >
              {t}
              {t === "Map" && gpsPins.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                  {gpsPins.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "Log" && (
          <KnockLogTab
            editSession={editSession}
            gpsPins={gpsPins}
            onSubmit={handleSubmit}
            onClearEdit={() => {
              setEditSession(null)
              setGpsPins([])
            }}
          />
        )}
        {tab === "History" && (
          <KnockHistoryTab sessions={sessions} onEdit={handleEdit} />
        )}
        {tab === "Map" && (
          <KnockMapTab
            pins={gpsPins}
            onAddPin={handleAddPin}
            onRemovePin={handleRemovePin}
          />
        )}
      </div>
    </div>
  )
}
