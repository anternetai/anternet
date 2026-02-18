"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import {
  Phone, PhoneOff, PhoneCall, MessageSquare, CalendarCheck, XCircle,
  Voicemail, Clock, SkipForward, Globe, User, Building2, MapPin, Hash,
  ExternalLink, AlertCircle, ChevronRight, Loader2, Wifi, WifiOff, Timer,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CallTranscript } from "./call-transcript"
import { useTwilioCall } from "@/lib/dialer/use-twilio-call"
import { useSpeechRecognition } from "@/lib/dialer/use-speech-recognition"
import type {
  DialerLead, DialerOutcome, DialerQueueResponse, CallState, AISummaryResponse,
} from "@/lib/dialer/types"

const OC: Record<DialerOutcome, { label: string; icon: typeof Phone; color: string; bg: string; key: string }> = {
  no_answer:      { label: "No Answer",      icon: PhoneOff,    color: "text-muted-foreground", bg: "border-muted-foreground/20 hover:border-muted-foreground/50 hover:bg-muted", key: "1" },
  voicemail:      { label: "Voicemail",      icon: Voicemail,   color: "text-blue-500",         bg: "border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/10", key: "2" },
  gatekeeper:     { label: "Gatekeeper",     icon: XCircle,     color: "text-amber-500",        bg: "border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10", key: "3" },
  conversation:   { label: "Conversation",   icon: MessageSquare, color: "text-emerald-500",    bg: "border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10", key: "4" },
  demo_booked:    { label: "Demo Booked!",   icon: CalendarCheck, color: "text-purple-500",     bg: "border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/10", key: "5" },
  not_interested: { label: "Not Interested", icon: XCircle,     color: "text-red-500",          bg: "border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10", key: "6" },
  wrong_number:   { label: "Wrong Number",   icon: AlertCircle, color: "text-red-400",          bg: "border-red-400/20 hover:border-red-400/50 hover:bg-red-400/10", key: "7" },
  callback:       { label: "Callback",       icon: Clock,       color: "text-orange-500",       bg: "border-orange-500/20 hover:border-orange-500/50 hover:bg-orange-500/10", key: "8" },
}

const CSL: Record<CallState, { label: string; color: string }> = {
  idle:         { label: "Ready",        color: "text-muted-foreground" },
  connecting:   { label: "Connecting…",  color: "text-amber-500" },
  ringing:      { label: "Ringing…",     color: "text-blue-500" },
  connected:    { label: "Connected",    color: "text-emerald-500" },
  disconnected: { label: "Call ended",   color: "text-muted-foreground" },
}

function fmtPh(p: string | null): string {
  if (!p) return "—"
  const d = p.replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  if (d.length === 11 && d[0]==="1") return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  return p
}
function fmtDur(s: number) { return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}` }
function greet() { const h=new Date().getHours(); return h<12?"Good morning.":h<17?"Good afternoon.":"Good evening." }

export function PowerDialer() {
  const { data: queue, isLoading, mutate } = useSWR("dialer-queue", () =>
    fetch("/api/portal/dialer/queue").then(r => { if(!r.ok) throw new Error("queue"); return r.json() as Promise<DialerQueueResponse> }),
    { revalidateOnFocus: true, refreshInterval: 60000 }
  )

  const [idx, setIdx] = useState(0)
  const [notes, setNotes] = useState("")
  const [demoDate, setDemoDate] = useState("")
  const [cbDate, setCbDate] = useState("")
  const [cbTime, setCbTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [showCb, setShowCb] = useState(false)
  const [sessionDials, setSessionDials] = useState(0)
  const [sel, setSel] = useState<DialerOutcome | null>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const tw = useTwilioCall()
  const sp = useSpeechRecognition()
  const [aiRes, setAiRes] = useState<AISummaryResponse | null>(null)
  const [aiLoad, setAiLoad] = useState(false)
  const prevCS = useRef<CallState>("idle")

  const leads = queue?.leads || []
  const lead = leads[idx] || null
  const inCall = tw.callState==="connecting"||tw.callState==="ringing"||tw.callState==="connected"

  useEffect(() => { tw.initTwilio() }, []) // eslint-disable-line
  useEffect(() => { if (leads.length>0 && idx>=leads.length) setIdx(0) }, [leads.length, idx])
  useEffect(() => { if (tw.callState==="connected" && sp.isSupported && !sp.isListening) sp.startListening() }, [tw.callState]) // eslint-disable-line
  useEffect(() => {
    const prev = prevCS.current; prevCS.current = tw.callState
    if (tw.callState==="disconnected" && prev!=="disconnected" && prev!=="idle") {
      if (sp.isListening) sp.stopListening()
      if (sp.transcript.trim().length>20 && lead) runAi(sp.transcript, lead)
    }
  }, [tw.callState]) // eslint-disable-line

  const runAi = useCallback(async (t: string, l: DialerLead) => {
    setAiLoad(true)
    try {
      const r = await fetch("/api/portal/calls/summarize", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ transcript:t, leadId:l.id, phoneNumber:l.phone_number, durationSeconds:tw.callDuration }),
      })
      if (!r.ok) throw new Error("ai")
      const d = await r.json()
      if (d.aiAvailable!==false && d.disposition) {
        setAiRes(d); if(d.notes)setNotes(d.notes); setSel(d.disposition); setShowNotes(true)
      }
    } catch(e) { console.error("AI error:",e) } finally { setAiLoad(false) }
  }, [tw.callDuration])

  const reset = useCallback(() => {
    setNotes(""); setDemoDate(""); setCbDate(""); setCbTime("")
    setShowNotes(false); setShowDemo(false); setShowCb(false)
    setSel(null); setAiRes(null); setAiLoad(false); sp.resetTranscript()
  }, []) // eslint-disable-line

  const handleDial = useCallback(async () => {
    if (!lead?.phone_number) return
    sp.resetTranscript()
    if (tw.isTwilioReady && tw.twilioConfigured) await tw.makeCall(lead.phone_number)
    else window.open(`tel:${lead.phone_number}`, "_self")
    if (sp.isSupported) sp.startListening()
  }, [lead, tw.isTwilioReady, tw.twilioConfigured]) // eslint-disable-line

  const handleDisp = useCallback(async (outcome: DialerOutcome) => {
    if (!lead || saving) return
    if (outcome==="conversation" && !showNotes) { setShowNotes(true); setSel(outcome); setTimeout(()=>notesRef.current?.focus(),100); return }
    if (outcome==="demo_booked" && !showDemo) { setShowDemo(true); setShowNotes(true); setSel(outcome); return }
    if (outcome==="callback" && !showCb) { setShowCb(true); setSel(outcome); return }

    setSaving(true)
    try {
      if (inCall) tw.hangUp()
      if (sp.isListening) sp.stopListening()
      const callbackAt = cbDate&&cbTime ? new Date(`${cbDate}T${cbTime}`).toISOString() : cbDate ? new Date(`${cbDate}T09:00:00`).toISOString() : undefined
      let fn = notes
      if (sp.transcript.trim() && !fn.includes("[Transcript]")) {
        const snip = sp.transcript.length>500 ? sp.transcript.slice(0,500)+"…" : sp.transcript
        fn = fn ? `${fn}\n[Transcript] ${snip}` : `[Transcript] ${snip}`
      }
      const r = await fetch("/api/portal/dialer/disposition", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ leadId:lead.id, outcome, notes:fn||undefined, demoDate:demoDate||undefined, callbackAt, callerNumberId:queue?.selectedNumber?.id }),
      })
      if (!r.ok) throw new Error("disp")
      setSessionDials(c=>c+1); reset()
      if (idx<leads.length-1) setIdx(i=>i+1); else { await mutate(); setIdx(0) }
    } catch(e) { console.error("Disposition error:",e) } finally { setSaving(false) }
  }, [lead,saving,showNotes,showDemo,showCb,notes,demoDate,cbDate,cbTime,idx,leads.length,mutate,reset,inCall,tw,sp,queue?.selectedNumber?.id])

  const skip = useCallback(() => {
    if (inCall) tw.hangUp(); if (sp.isListening) sp.stopListening()
    reset(); if (idx<leads.length-1) setIdx(i=>i+1)
  }, [idx,leads.length,reset,inCall]) // eslint-disable-line

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.ctrlKey||e.metaKey) {
        const oc: DialerOutcome[] = ["no_answer","voicemail","gatekeeper","conversation","demo_booked","not_interested","wrong_number","callback"]
        const i=parseInt(e.key)-1; if(i>=0&&i<oc.length){e.preventDefault();handleDisp(oc[i])}
      }
    }
    window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey)
  }, [handleDisp])

  const pct = queue ? Math.min(((queue.completedToday+sessionDials)/Math.max(queue.totalToday,1))*100,100) : 0
  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>

  const total=queue?.totalToday||0, done=(queue?.completedToday||0)+sessionDials, cbs=queue?.callbacksDue?.length||0
  const tz=queue?.breakdownByTimezone, selNum=queue?.selectedNumber

  return (
    <div className="space-y-4">
      {/* Daily Summary */}
      <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">{greet()} <span className="text-orange-500">{total}</span> leads to call today.</p>
              {queue?.currentHourBlock && <p className="text-sm text-muted-foreground">Current block: {queue.currentHourBlock}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={tw.twilioConfigured&&tw.isTwilioReady?"border-emerald-500/40 text-emerald-500":"border-muted-foreground/40 text-muted-foreground"}>
                {tw.twilioConfigured&&tw.isTwilioReady?<><Wifi className="mr-1 size-3"/>WebRTC</>:<><WifiOff className="mr-1 size-3"/>tel: mode</>}
              </Badge>
              {selNum && (
                <Badge variant="outline" className="border-blue-500/30 text-blue-500 tabular-nums text-[10px]">
                  <Phone className="mr-1 size-3"/>{fmtPh(selNum.phone_number)} ({selNum.calls_this_hour}/{selNum.max_calls_per_hour})
                </Badge>
              )}
              {cbs>0 && <Badge variant="outline" className="border-orange-500/40 text-orange-500"><Clock className="mr-1 size-3"/>{cbs} callback{cbs!==1?"s":""} due</Badge>}
              <Badge variant="secondary" className="tabular-nums">{sessionDials} this session</Badge>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{done} calls made today</span><span>{total} total in queue</span></div>
            <Progress value={pct} className="h-2"/>
          </div>
          {tz && <div className="mt-3 flex flex-wrap gap-3">
            {(["ET","CT","MT","PT"] as const).map(t=>(
              <div key={t} className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${queue?.currentTimezone===t?"border-orange-500/40 bg-orange-500/10 font-medium text-orange-500":"text-muted-foreground"}`}>
                <MapPin className="size-3"/>{t}: {tz[t]}
              </div>
            ))}
          </div>}
        </CardContent>
      </Card>

      {/* Lead Card */}
      {lead ? (
        <Card className="overflow-hidden border-2">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-orange-500"/>{lead.business_name||"Unknown Business"}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="tabular-nums text-xs"><Hash className="mr-0.5 size-3"/>{lead.attempt_count}/{lead.max_attempts}</Badge>
                {lead.timezone && <Badge variant="secondary" className="text-xs">{lead.timezone}</Badge>}
                {lead.status==="callback" && <Badge variant="outline" className="border-orange-500/40 text-xs text-orange-500">Callback</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm"><User className="size-4 text-muted-foreground"/><span className="font-medium">{lead.first_name||lead.owner_name||"—"}</span>{lead.owner_name&&lead.first_name&&<span className="text-muted-foreground">({lead.owner_name})</span>}</div>
              <div className="flex items-center gap-2 text-sm"><MapPin className="size-4 text-muted-foreground"/><span>{lead.state||"—"}</span></div>
            </div>

            {/* DIAL / HANG UP */}
            {!inCall ? (
              <button onClick={handleDial} className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-[0.98]">
                <Phone className="size-6"/><span>DIAL {fmtPh(lead.phone_number)}</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative"><PhoneCall className="size-5 text-emerald-500"/>{tw.callState==="connected"&&<span className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-emerald-500"/>}</div>
                    <div><p className={`text-sm font-semibold ${CSL[tw.callState].color}`}>{CSL[tw.callState].label}</p><p className="text-xs text-muted-foreground">{fmtPh(lead.phone_number)}</p></div>
                  </div>
                  {tw.callState==="connected"&&<div className="flex items-center gap-1.5 text-sm tabular-nums font-medium"><Timer className="size-4 text-muted-foreground"/>{fmtDur(tw.callDuration)}</div>}
                </div>
                <button onClick={()=>tw.hangUp()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-red-500 active:scale-[0.98]"><PhoneOff className="size-5"/>HANG UP</button>
              </div>
            )}

            {lead.website && <a href={lead.website.startsWith("http")?lead.website:`https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400"><Globe className="size-4"/>{lead.website}<ExternalLink className="size-3"/></a>}
            {lead.notes && <div className="rounded-lg border bg-muted/30 p-3"><p className="mb-1 text-xs font-medium text-muted-foreground">Previous Notes</p><p className="whitespace-pre-wrap text-sm">{lead.notes}</p></div>}
            {lead.last_outcome && <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>Last:</span><Badge variant="outline" className="text-xs">{OC[lead.last_outcome]?.label||lead.last_outcome}</Badge>{lead.last_called_at&&<span>{new Date(lead.last_called_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}</div>}

            {/* Transcript + AI */}
            <CallTranscript
              isRecording={sp.isListening} liveTranscript={sp.transcript} interimText={sp.interimText}
              aiSummary={aiRes?{summary:aiRes.summary,disposition:aiRes.disposition,notes:aiRes.notes,keyPoints:aiRes.keyPoints}:null}
              isAnalyzing={aiLoad}
              onSelectDisposition={d=>{setSel(d);if(d==="conversation"||d==="demo_booked")setShowNotes(true);if(d==="demo_booked")setShowDemo(true);if(d==="callback")setShowCb(true)}}
              onApplyNotes={n=>setNotes(n)}
            />

            {/* Disposition Buttons */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Tap outcome after call (or ⌘1-8)</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.entries(OC) as [DialerOutcome,(typeof OC)[DialerOutcome]][]).map(([k,c])=>{
                  const I=c.icon, sug=aiRes?.disposition===k
                  return <Button key={k} variant="outline" className={`h-auto flex-col gap-1 py-3 ${c.bg} ${sel===k?"ring-2 ring-orange-500 ring-offset-2 ring-offset-background":""} ${sug&&sel!==k?"border-purple-500/50 shadow-purple-500/10 shadow-md":""}`} disabled={saving} onClick={()=>handleDisp(k)}>
                    <I className={`size-5 ${c.color}`}/><span className="text-xs font-medium">{c.label}</span><span className="text-[10px] text-muted-foreground">{sug?"✨ AI":`⌘${c.key}`}</span>
                  </Button>
                })}
              </div>
            </div>

            {/* Extra Fields */}
            {(showNotes||showDemo||showCb) && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                {showNotes && <Textarea ref={notesRef} placeholder="Add notes about this call…" value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className="resize-none"/>}
                {showDemo && <div className="flex items-center gap-2"><label className="text-xs font-medium text-muted-foreground">Demo date:</label><Input type="datetime-local" value={demoDate} onChange={e=>setDemoDate(e.target.value)} className="h-8 w-auto text-sm"/></div>}
                {showCb && <div className="flex flex-wrap items-center gap-2"><label className="text-xs font-medium text-muted-foreground">Callback:</label><Input type="date" value={cbDate} onChange={e=>setCbDate(e.target.value)} className="h-8 w-auto text-sm"/><Input type="time" value={cbTime} onChange={e=>setCbTime(e.target.value)} className="h-8 w-auto text-sm"/></div>}
                <Button onClick={()=>{if(sel)handleDisp(sel)}} disabled={saving} className="w-full gap-2">
                  {saving?<Loader2 className="size-4 animate-spin"/>:<ChevronRight className="size-4"/>}Confirm &amp; Next
                </Button>
              </div>
            )}

            <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={skip} className="gap-1 text-muted-foreground"><SkipForward className="size-3.5"/>Skip</Button></div>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Phone className="mb-4 size-12 text-muted-foreground/40"/><h3 className="text-lg font-semibold">No leads in queue</h3>
          <p className="mt-1 text-sm text-muted-foreground">{queue?.totalToday===0?"Import leads to get started, or check back during calling hours.":"All leads for this time block have been called. Nice work! 🎉"}</p>
        </CardContent></Card>
      )}

      {/* Queue Preview */}
      {leads.length>1 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Up Next ({leads.length-1-idx} remaining)</CardTitle></CardHeader>
          <CardContent><div className="space-y-1">
            {leads.slice(idx+1,idx+6).map((l,i)=>(
              <div key={l.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                <span className="w-5 text-center text-xs text-muted-foreground">{i+1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{l.business_name||l.phone_number||"Unknown"}</span>
                <span className="text-xs text-muted-foreground">{l.first_name||l.owner_name||""}</span>
                <Badge variant="outline" className="shrink-0 text-[10px]">{l.state||"—"}</Badge>
                {l.attempt_count>0&&<span className="text-[10px] tabular-nums text-muted-foreground">#{l.attempt_count}</span>}
              </div>
            ))}
          </div></CardContent>
        </Card>
      )}
    </div>
  )
}
