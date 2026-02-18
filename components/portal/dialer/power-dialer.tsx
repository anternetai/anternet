"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import {
  Phone, PhoneOff, MessageSquare, CalendarCheck, XCircle, Voicemail, Clock,
  SkipForward, Globe, User, Building2, MapPin, Hash, ExternalLink, AlertCircle,
  ChevronRight, Loader2, Mic, MicOff, PhoneForwarded, Settings, Timer, Wifi, WifiOff,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CallTranscript } from "./call-transcript"
import type { DialerLead, DialerOutcome, DialerQueueResponse, CallState } from "@/lib/dialer/types"

const OUTCOME_CONFIG: Record<
  DialerOutcome,
  { label: string; icon: typeof Phone; color: string; bgColor: string; shortcut: string }
> = {
  no_answer: { label: "No Answer", icon: PhoneOff, color: "text-muted-foreground", bgColor: "border-muted-foreground/20 hover:border-muted-foreground/50 hover:bg-muted", shortcut: "1" },
  voicemail: { label: "Voicemail", icon: Voicemail, color: "text-blue-500", bgColor: "border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/10", shortcut: "2" },
  gatekeeper: { label: "Gatekeeper", icon: XCircle, color: "text-amber-500", bgColor: "border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10", shortcut: "3" },
  conversation: { label: "Conversation", icon: MessageSquare, color: "text-emerald-500", bgColor: "border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10", shortcut: "4" },
  demo_booked: { label: "Demo Booked!", icon: CalendarCheck, color: "text-purple-500", bgColor: "border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/10", shortcut: "5" },
  not_interested: { label: "Not Interested", icon: XCircle, color: "text-red-500", bgColor: "border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10", shortcut: "6" },
  wrong_number: { label: "Wrong Number", icon: AlertCircle, color: "text-red-400", bgColor: "border-red-400/20 hover:border-red-400/50 hover:bg-red-400/10", shortcut: "7" },
  callback: { label: "Callback", icon: Clock, color: "text-orange-500", bgColor: "border-orange-500/20 hover:border-orange-500/50 hover:bg-orange-500/10", shortcut: "8" },
}

async function fetchQueue(): Promise<DialerQueueResponse> {
  const res = await fetch("/api/portal/dialer/queue")
  if (!res.ok) throw new Error("Failed to fetch queue")
  return res.json()
}

export function PowerDialer() {
  const { data: queue, isLoading, mutate } = useSWR("dialer-queue", fetchQueue, {
    revalidateOnFocus: true, refreshInterval: 60000,
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [notes, setNotes] = useState("")
  const [demoDate, setDemoDate] = useState("")
  const [callbackDate, setCallbackDate] = useState("")
  const [callbackTime, setCallbackTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [showNoteField, setShowNoteField] = useState(false)
  const [showDemoDatePicker, setShowDemoDatePicker] = useState(false)
  const [showCallbackPicker, setShowCallbackPicker] = useState(false)
  const [sessionDials, setSessionDials] = useState(0)
  const [lastOutcome, setLastOutcome] = useState<DialerOutcome | null>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const [twilioConfigured, setTwilioConfigured] = useState<boolean | null>(null)
  const [twilioDevice, setTwilioDevice] = useState<any>(null)
  const [activeCall, setActiveCall] = useState<any>(null)
  const [callState, setCallState] = useState<CallState>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStartRef = useRef<number | null>(null)
  const deviceRef = useRef<any>(null)

  const [isTranscribing, setIsTranscribing] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState("")
  const [interimText, setInterimText] = useState("")
  const [aiSummary, setAiSummary] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const recognitionRef = useRef<any>(null)
  const fullTranscriptRef = useRef("")
  const callStateRef = useRef<CallState>("idle")

  useEffect(() => { callStateRef.current = callState }, [callState])

  const leads = queue?.leads || []
  const currentLead = leads[currentIndex] || null
  const selectedNumber = queue?.selectedNumber || null

  useEffect(() => {
    if (leads.length > 0 && currentIndex >= leads.length) setCurrentIndex(0)
  }, [leads.length, currentIndex])

  useEffect(() => {
    let mounted = true
    async function initTwilio() {
      try {
        const res = await fetch("/api/portal/dialer/token")
        const data = await res.json()
        if (!mounted) return
        if (!data.configured) { setTwilioConfigured(false); return }
        setTwilioConfigured(true)
        const { Device } = await import("@twilio/voice-sdk")
        const device = new Device(data.token, { logLevel: 1, codecPreferences: ["opus" as any, "pcmu" as any] })
        device.on("registered", () => { if (mounted) setCallState("idle") })
        device.on("error", (err: any) => { console.error("Twilio error:", err); if (mounted) setCallState("idle") })
        device.on("tokenWillExpire", async () => {
          try { const r = await fetch("/api/portal/dialer/token"); const d = await r.json(); if (d.token) device.updateToken(d.token) } catch {}
        })
        await device.register()
        if (mounted) { setTwilioDevice(device); deviceRef.current = device }
      } catch (err) { console.error("Twilio init:", err); if (mounted) setTwilioConfigured(false) }
    }
    initTwilio()
    return () => { mounted = false; try { deviceRef.current?.destroy() } catch {} }
  }, [])

  useEffect(() => {
    if (callState === "connected") {
      callStartRef.current = Date.now()
      callTimerRef.current = setInterval(() => {
        if (callStartRef.current) setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000))
      }, 1000)
    } else {
      if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null }
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current) }
  }, [callState])

  const startTranscription = useCallback(() => {
    if (typeof window === "undefined") return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-US"
    recognition.onresult = (event: any) => {
      let interim = "", final = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t + " "; else interim += t
      }
      if (final) { fullTranscriptRef.current += final; setLiveTranscript(fullTranscriptRef.current) }
      setInterimText(interim)
    }
    recognition.onerror = (e: any) => {
      if ((e.error === "no-speech" || e.error === "aborted") && callStateRef.current === "connected") {
        try { recognition.start() } catch {}
      }
    }
    recognition.onend = () => {
      if (callStateRef.current === "connected") { try { recognition.start() } catch {} }
      else setIsTranscribing(false)
    }
    try { recognition.start(); recognitionRef.current = recognition; setIsTranscribing(true) } catch {}
  }, [])

  const stopTranscription = useCallback(() => {
    try { recognitionRef.current?.stop() } catch {}
    recognitionRef.current = null; setIsTranscribing(false); setInterimText("")
  }, [])

  useEffect(() => {
    if (callState === "connected") startTranscription()
    else if (callState === "disconnected" || callState === "idle") stopTranscription()
  }, [callState, startTranscription, stopTranscription])

  const analyzeTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim() || transcript.trim().length < 20) return
    setIsAnalyzing(true)
    try {
      const res = await fetch("/api/portal/dialer/summarize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript, businessName: currentLead?.business_name || undefined,
          leadContext: currentLead?.notes || undefined, leadId: currentLead?.id || undefined,
          phoneNumber: currentLead?.phone_number || undefined, durationSeconds: callDuration || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiSummary(data)
        if (data.disposition) setLastOutcome(data.disposition as DialerOutcome)
        if (data.notes) { setNotes(data.notes); setShowNoteField(true) }
      }
    } catch (err) { console.error("Analysis error:", err) }
    finally { setIsAnalyzing(false) }
  }, [currentLead, callDuration])

  const dialTwilio = useCallback(async () => {
    if (!twilioDevice || !currentLead?.phone_number) return
    try {
      setCallState("connecting"); setCallDuration(0); setIsMuted(false)
      fullTranscriptRef.current = ""; setLiveTranscript(""); setInterimText(""); setAiSummary(null)
      const params: Record<string, string> = { To: currentLead.phone_number }
      if (selectedNumber?.phone_number) params.CallerId = selectedNumber.phone_number
      const call = await twilioDevice.connect({ params })
      call.on("ringing", () => setCallState("ringing"))
      call.on("accept", () => setCallState("connected"))
      call.on("disconnect", () => {
        setCallState("disconnected"); setActiveCall(null)
        const t = fullTranscriptRef.current
        if (t.trim().length > 20) analyzeTranscript(t)
        if (selectedNumber?.id) updateNumberUsage(selectedNumber.id)
      })
      call.on("cancel", () => { setCallState("idle"); setActiveCall(null) })
      call.on("error", (e: any) => { console.error("Call error:", e); setCallState("idle"); setActiveCall(null) })
      setActiveCall(call)
    } catch (err) { console.error("Dial error:", err); setCallState("idle") }
  }, [twilioDevice, currentLead, selectedNumber, analyzeTranscript])

  const hangUp = useCallback(() => { if (activeCall) activeCall.disconnect(); setCallState("disconnected"); stopTranscription() }, [activeCall, stopTranscription])
  const toggleMute = useCallback(() => { if (activeCall) { const m = !isMuted; activeCall.mute(m); setIsMuted(m) } }, [activeCall, isMuted])
  const updateNumberUsage = useCallback(async (numberId: string) => {
    try { await fetch("/api/portal/dialer/numbers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: numberId }) }) } catch {}
  }, [])

  const resetForm = useCallback(() => {
    setNotes(""); setDemoDate(""); setCallbackDate(""); setCallbackTime("")
    setShowNoteField(false); setShowDemoDatePicker(false); setShowCallbackPicker(false)
    setLastOutcome(null); setCallState("idle"); setCallDuration(0)
    setLiveTranscript(""); setInterimText(""); setAiSummary(null); setIsAnalyzing(false); setIsMuted(false)
    fullTranscriptRef.current = ""
  }, [])

  const handleDisposition = useCallback(async (outcome: DialerOutcome) => {
    if (!currentLead || saving) return
    if (outcome === "conversation" && !showNoteField) { setShowNoteField(true); setLastOutcome(outcome); setTimeout(() => notesRef.current?.focus(), 100); return }
    if (outcome === "demo_booked" && !showDemoDatePicker) { setShowDemoDatePicker(true); setShowNoteField(true); setLastOutcome(outcome); return }
    if (outcome === "callback" && !showCallbackPicker) { setShowCallbackPicker(true); setLastOutcome(outcome); return }
    setSaving(true)
    try {
      const callbackAt = callbackDate && callbackTime ? new Date(`${callbackDate}T${callbackTime}`).toISOString() : callbackDate ? new Date(`${callbackDate}T09:00:00`).toISOString() : undefined
      const res = await fetch("/api/portal/dialer/disposition", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: currentLead.id, outcome, notes: notes || undefined, demoDate: demoDate || undefined, callbackAt }),
      })
      if (!res.ok) throw new Error("Failed")
      setSessionDials((c) => c + 1); resetForm()
      if (currentIndex < leads.length - 1) setCurrentIndex((i) => i + 1)
      else { await mutate(); setCurrentIndex(0) }
    } catch (e) { console.error("Disposition error:", e) }
    finally { setSaving(false) }
  }, [currentLead, saving, showNoteField, showDemoDatePicker, showCallbackPicker, notes, demoDate, callbackDate, callbackTime, currentIndex, leads.length, mutate, resetForm])

  const confirmOutcome = useCallback(() => { if (lastOutcome) handleDisposition(lastOutcome) }, [lastOutcome, handleDisposition])
  const skipLead = useCallback(() => { if (currentIndex < leads.length - 1) { setCurrentIndex((i) => i + 1); resetForm() } }, [currentIndex, leads.length, resetForm])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.ctrlKey || e.metaKey) {
        const outcomes: DialerOutcome[] = ["no_answer","voicemail","gatekeeper","conversation","demo_booked","not_interested","wrong_number","callback"]
        const idx = parseInt(e.key) - 1
        if (idx >= 0 && idx < outcomes.length) { e.preventDefault(); handleDisposition(outcomes[idx]) }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleDisposition])

  const handleAiDisposition = useCallback((disposition: DialerOutcome) => {
    setLastOutcome(disposition); setShowNoteField(true)
    if (disposition === "demo_booked") setShowDemoDatePicker(true)
    if (disposition === "callback") setShowCallbackPicker(true)
  }, [])

  const handleApplyNotes = useCallback((aiNotes: string) => {
    setNotes((prev) => (prev ? prev + "\n" + aiNotes : aiNotes)); setShowNoteField(true)
  }, [])

  const progressPercent = queue ? Math.min(((queue.completedToday + sessionDials) / Math.max(queue.totalToday, 1)) * 100, 100) : 0

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>

  const totalToCall = queue?.totalToday || 0
  const completedSoFar = (queue?.completedToday || 0) + sessionDials
  const callbacksCount = queue?.callbacksDue?.length || 0
  const tz = queue?.breakdownByTimezone
  const isInCall = callState === "connecting" || callState === "ringing" || callState === "connected"

  return (
    <div className="space-y-4">
      {twilioConfigured === false && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <Settings className="mt-0.5 size-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-500">Configure Twilio for In-Browser Calling</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Set <code className="rounded bg-muted px-1 text-[11px]">TWILIO_AUTH_TOKEN</code> in your environment to enable browser-based dialing. Without it, calls use your phone&apos;s native dialer.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Required: <code className="rounded bg-muted px-1 text-[11px]">TWILIO_ACCOUNT_SID</code>, <code className="rounded bg-muted px-1 text-[11px]">TWILIO_AUTH_TOKEN</code>, <code className="rounded bg-muted px-1 text-[11px]">TWILIO_PHONE_NUMBER</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">{getGreeting()} <span className="text-orange-500">{totalToCall}</span> leads to call today.</p>
              {queue?.currentHourBlock && <p className="text-sm text-muted-foreground">Current block: {queue.currentHourBlock}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {twilioConfigured && (
                <Badge variant="outline" className={`gap-1 ${callState === "connected" ? "border-emerald-500/40 text-emerald-500" : "border-muted-foreground/30"}`}>
                  {callState === "connected" ? <Wifi className="size-3" /> : <WifiOff className="size-3" />} Browser Dialer
                </Badge>
              )}
              {callbacksCount > 0 && <Badge variant="outline" className="border-orange-500/40 text-orange-500"><Clock className="mr-1 size-3" />{callbacksCount} callback{callbacksCount !== 1 ? "s" : ""} due</Badge>}
              <Badge variant="secondary" className="tabular-nums">{sessionDials} this session</Badge>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{completedSoFar} calls made today</span><span>{totalToCall} total in queue</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          {tz && (
            <div className="mt-3 flex flex-wrap gap-3">
              {(["ET", "CT", "MT", "PT"] as const).map((t) => (
                <div key={t} className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${queue?.currentTimezone === t ? "border-orange-500/40 bg-orange-500/10 font-medium text-orange-500" : "text-muted-foreground"}`}>
                  <MapPin className="size-3" />{t}: {tz[t]}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {currentLead ? (
        <Card className="overflow-hidden border-2">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-orange-500" />{currentLead.business_name || "Unknown Business"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="tabular-nums text-xs"><Hash className="mr-0.5 size-3" />{currentLead.attempt_count}/{currentLead.max_attempts} attempts</Badge>
                {currentLead.timezone && <Badge variant="secondary" className="text-xs">{currentLead.timezone}</Badge>}
                {currentLead.status === "callback" && <Badge variant="outline" className="border-orange-500/40 text-xs text-orange-500">Callback</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="size-4 text-muted-foreground" />
                <span className="font-medium">{currentLead.first_name || currentLead.owner_name || "\u2014"}</span>
                {currentLead.owner_name && currentLead.first_name && <span className="text-muted-foreground">({currentLead.owner_name})</span>}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-muted-foreground" /><span>{currentLead.state || "\u2014"}</span>
              </div>
            </div>

            {selectedNumber && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                <PhoneForwarded className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Calling from:</span>
                <span className="font-mono font-medium">{formatPhone(selectedNumber.phone_number)}</span>
                {selectedNumber.friendly_name && <Badge variant="outline" className="text-[10px]">{selectedNumber.friendly_name}</Badge>}
                <span className="ml-auto text-muted-foreground">{selectedNumber.calls_this_hour}/{selectedNumber.max_calls_per_hour} this hr</span>
              </div>
            )}

            {isInCall && (
              <div className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 ${callState === "connected" ? "border-emerald-500/30 bg-emerald-500/10" : callState === "ringing" ? "border-blue-500/30 bg-blue-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                <div className="flex items-center gap-3">
                  <div className={`size-3 animate-pulse rounded-full ${callState === "connected" ? "bg-emerald-500" : callState === "ringing" ? "bg-blue-500" : "bg-amber-500"}`} />
                  <span className="text-sm font-medium">
                    {callState === "connecting" && "Connecting..."}
                    {callState === "ringing" && "Ringing..."}
                    {callState === "connected" && "Connected"}
                  </span>
                  {callState === "connected" && (
                    <Badge variant="outline" className="gap-1 font-mono tabular-nums text-xs"><Timer className="size-3" />{formatDuration(callDuration)}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {callState === "connected" && (
                    <Button variant="outline" size="sm" className={`h-8 gap-1.5 ${isMuted ? "border-red-500/30 text-red-500" : ""}`} onClick={toggleMute}>
                      {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}{isMuted ? "Unmute" : "Mute"}
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" className="h-8 gap-1.5" onClick={hangUp}>
                    <PhoneOff className="size-3.5" />Hang Up
                  </Button>
                </div>
              </div>
            )}

            {!isInCall && (
              twilioConfigured ? (
                <button onClick={dialTwilio} className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-[0.98]">
                  <Phone className="size-6" /><span>DIAL {formatPhone(currentLead.phone_number)}</span>
                </button>
              ) : (
                <a href={`tel:${currentLead.phone_number}`} className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-[0.98]">
                  <Phone className="size-6" /><span>DIAL {formatPhone(currentLead.phone_number)}</span>
                </a>
              )
            )}

            {currentLead.website && (
              <a href={currentLead.website.startsWith("http") ? currentLead.website : `https://${currentLead.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400">
                <Globe className="size-4" />{currentLead.website}<ExternalLink className="size-3" />
              </a>
            )}

            {currentLead.notes && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Previous Notes</p>
                <p className="whitespace-pre-wrap text-sm">{currentLead.notes}</p>
              </div>
            )}

            {currentLead.last_outcome && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Last:</span>
                <Badge variant="outline" className="text-xs">{OUTCOME_CONFIG[currentLead.last_outcome]?.label || currentLead.last_outcome}</Badge>
                {currentLead.last_called_at && <span>{new Date(currentLead.last_called_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
              </div>
            )}

            <CallTranscript
              isRecording={isTranscribing}
              liveTranscript={liveTranscript}
              interimText={interimText}
              aiSummary={aiSummary}
              isAnalyzing={isAnalyzing}
              onSelectDisposition={handleAiDisposition}
              onApplyNotes={handleApplyNotes}
            />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Tap outcome after call (or ⌘1-8)</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.entries(OUTCOME_CONFIG) as [DialerOutcome, (typeof OUTCOME_CONFIG)[DialerOutcome]][]).map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <Button key={key} variant="outline" className={`h-auto flex-col gap-1 py-3 ${config.bgColor} ${lastOutcome === key ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-background" : ""}`} disabled={saving} onClick={() => handleDisposition(key)}>
                      <Icon className={`size-5 ${config.color}`} />
                      <span className="text-xs font-medium">{config.label}</span>
                      <span className="text-[10px] text-muted-foreground">⌘{config.shortcut}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {showNoteField && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <Textarea ref={notesRef} placeholder="Add notes about this call..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none" />
                {showDemoDatePicker && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Demo date:</label>
                    <Input type="datetime-local" value={demoDate} onChange={(e) => setDemoDate(e.target.value)} className="h-8 w-auto text-sm" />
                  </div>
                )}
                {showCallbackPicker && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Callback:</label>
                    <Input type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)} className="h-8 w-auto text-sm" />
                    <Input type="time" value={callbackTime} onChange={(e) => setCallbackTime(e.target.value)} className="h-8 w-auto text-sm" />
                  </div>
                )}
                <Button onClick={confirmOutcome} disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                  Confirm &amp; Next
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={skipLead} className="gap-1 text-muted-foreground">
                <SkipForward className="size-3.5" />Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Phone className="mb-4 size-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">No leads in queue</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {queue?.totalToday === 0 ? "Import leads to get started, or check back during calling hours." : "All leads for this time block have been called. Nice work! 🎉"}
            </p>
          </CardContent>
        </Card>
      )}

      {leads.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Up Next ({leads.length - 1 - currentIndex} remaining)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {leads.slice(currentIndex + 1, currentIndex + 6).map((lead, i) => (
                <div key={lead.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                  <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{lead.business_name || lead.phone_number || "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">{lead.first_name || lead.owner_name || ""}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{lead.state || "\u2014"}</Badge>
                  {lead.attempt_count > 0 && <span className="text-[10px] tabular-nums text-muted-foreground">#{lead.attempt_count}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatPhone(phone: string | null): string {
  if (!phone) return "\u2014"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith("1")) return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return phone
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning."
  if (hour < 17) return "Good afternoon."
  return "Good evening."
}
