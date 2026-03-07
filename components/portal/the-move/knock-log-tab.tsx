"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TallyCounter } from "./tally-counter"
import { NEIGHBORHOODS } from "@/lib/the-move/constants"
import type { DoorKnockSession, GpsPin } from "@/lib/the-move/types"

interface KnockLogTabProps {
  editSession: DoorKnockSession | null
  gpsPins: GpsPin[]
  onSubmit: (session: DoorKnockSession) => void
  onClearEdit: () => void
}

export function KnockLogTab({ editSession, gpsPins, onSubmit, onClearEdit }: KnockLogTabProps) {
  const [neighborhood, setNeighborhood] = useState(() => {
    if (editSession) return editSession.neighborhood
    if (typeof window !== "undefined") return localStorage.getItem("lastKnockNeighborhood") || ""
    return ""
  })
  const [street, setStreet] = useState(editSession?.street || "")
  const [sessionDate, setSessionDate] = useState(
    editSession?.session_date || new Date().toISOString().split("T")[0]
  )
  const [weather, setWeather] = useState(editSession?.weather || "")
  const [knocked, setKnocked] = useState(editSession?.doors_knocked || 0)
  const [opened, setOpened] = useState(editSession?.doors_opened || 0)
  const [pitched, setPitched] = useState(editSession?.pitches_given || 0)
  const [closed, setClosed] = useState(editSession?.jobs_closed || 0)
  const [revenue, setRevenue] = useState(editSession?.revenue_closed?.toString() || "")
  const [minutes, setMinutes] = useState(editSession?.session_minutes?.toString() || "")
  const [notes, setNotes] = useState(editSession?.notes || "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (editSession) {
      setNeighborhood(editSession.neighborhood)
      setStreet(editSession.street || "")
      setSessionDate(editSession.session_date)
      setWeather(editSession.weather || "")
      setKnocked(editSession.doors_knocked)
      setOpened(editSession.doors_opened)
      setPitched(editSession.pitches_given)
      setClosed(editSession.jobs_closed)
      setRevenue(editSession.revenue_closed?.toString() || "")
      setMinutes(editSession.session_minutes?.toString() || "")
      setNotes(editSession.notes || "")
    }
  }, [editSession])

  // Enforce funnel: opened ≤ knocked, pitched ≤ opened, closed ≤ pitched
  function handleKnocked(n: number) {
    setKnocked(n)
    if (opened > n) setOpened(n)
    if (pitched > n) setPitched(Math.min(pitched, n))
    if (closed > n) setClosed(Math.min(closed, n))
  }
  function handleOpened(n: number) {
    const capped = Math.min(n, knocked)
    setOpened(capped)
    if (pitched > capped) setPitched(capped)
    if (closed > capped) setClosed(Math.min(closed, capped))
  }
  function handlePitched(n: number) {
    const capped = Math.min(n, opened)
    setPitched(capped)
    if (closed > capped) setClosed(capped)
  }
  function handleClosed(n: number) {
    setClosed(Math.min(n, pitched))
  }

  async function handleSubmit() {
    if (!neighborhood) {
      setError("Pick a neighborhood")
      return
    }
    setError("")
    setSubmitting(true)

    const payload = {
      neighborhood,
      street: street || null,
      session_date: sessionDate,
      weather: weather || null,
      doors_knocked: knocked,
      doors_opened: opened,
      pitches_given: pitched,
      jobs_closed: closed,
      revenue_closed: Number(revenue) || 0,
      session_minutes: Number(minutes) || null,
      notes: notes || null,
      gps_pins: gpsPins.length > 0 ? gpsPins : null,
    }

    try {
      const url = editSession
        ? `/api/portal/the-move/door-knocks/${editSession.id}`
        : "/api/portal/the-move/door-knocks"
      const method = editSession ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save")
        return
      }

      const session = await res.json()
      if (typeof window !== "undefined") {
        localStorage.setItem("lastKnockNeighborhood", neighborhood)
      }
      onSubmit(session)

      // Reset if not editing
      if (!editSession) {
        setStreet("")
        setWeather("")
        setKnocked(0)
        setOpened(0)
        setPitched(0)
        setClosed(0)
        setRevenue("")
        setMinutes("")
        setNotes("")
      }
    } catch {
      setError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 px-1">
      {editSession && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <span className="text-sm text-amber-400">Editing session</span>
          <Button variant="ghost" size="sm" onClick={onClearEdit} className="text-stone-400 h-7">
            Cancel
          </Button>
        </div>
      )}

      {/* Location & Date */}
      <div className="grid grid-cols-2 gap-3">
        <Select value={neighborhood} onValueChange={setNeighborhood}>
          <SelectTrigger className="bg-stone-900 border-stone-700 text-stone-200">
            <SelectValue placeholder="Neighborhood" />
          </SelectTrigger>
          <SelectContent className="bg-stone-900 border-stone-700">
            {NEIGHBORHOODS.map((n) => (
              <SelectItem key={n} value={n} className="text-stone-200">
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Street"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className="bg-stone-900 border-stone-700 text-stone-200 placeholder:text-stone-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          className="bg-stone-900 border-stone-700 text-stone-200"
        />
        <Input
          placeholder="Weather"
          value={weather}
          onChange={(e) => setWeather(e.target.value)}
          className="bg-stone-900 border-stone-700 text-stone-200 placeholder:text-stone-500"
        />
      </div>

      {/* Tally Counters */}
      <div className="flex justify-around py-4">
        <TallyCounter label="Knocked" value={knocked} onChange={handleKnocked} color="amber" />
        <TallyCounter label="Opened" value={opened} onChange={handleOpened} color="blue" />
        <TallyCounter label="Pitched" value={pitched} onChange={handlePitched} color="rose" />
        <TallyCounter label="Closed" value={closed} onChange={handleClosed} color="green" />
      </div>

      {/* Revenue & Minutes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
          <Input
            type="number"
            placeholder="Revenue"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            className="bg-stone-900 border-stone-700 text-stone-200 pl-7 placeholder:text-stone-500"
          />
        </div>
        <Input
          type="number"
          placeholder="Minutes"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="bg-stone-900 border-stone-700 text-stone-200 placeholder:text-stone-500"
        />
      </div>

      <Textarea
        placeholder="Notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="bg-stone-900 border-stone-700 text-stone-200 placeholder:text-stone-500 resize-none"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-14 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-base tracking-wide uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
      >
        {submitting ? "Saving..." : editSession ? "Update Session" : "Log It"}
      </Button>
    </div>
  )
}
