"use client"

import { useState } from "react"
import { Send, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ClientDetail } from "@/lib/portal/types"

interface ClientActionsProps {
  clientId: string
  client: ClientDetail
  onActionComplete: () => void
}

export function ClientActions({ clientId, client, onActionComplete }: ClientActionsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="slack">
          <TabsList className="w-full">
            <TabsTrigger value="slack" className="flex-1">Slack</TabsTrigger>
            <TabsTrigger value="email" className="flex-1">Email</TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="slack" className="mt-4">
            <SlackAction
              clientId={clientId}
              hasSlack={!!client.slack_channel_id}
              onComplete={onActionComplete}
            />
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <EmailAction
              clientId={clientId}
              defaultTo={client.email_for_notifications || client.business_email_for_leads}
              onComplete={onActionComplete}
            />
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            <ScheduleAction
              clientId={clientId}
              currentNextCall={client.next_call_at}
              currentCallType={client.next_call_type}
              onComplete={onActionComplete}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// --- Slack Action ---

function SlackAction({
  clientId,
  hasSlack,
  onComplete,
}: {
  clientId: string
  hasSlack: boolean
  onComplete: () => void
}) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    setStatus("idle")

    try {
      const res = await fetch(`/api/portal/admin/clients/${clientId}/slack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      })

      if (!res.ok) throw new Error("Failed to send")
      setMessage("")
      setStatus("success")
      onComplete()
      setTimeout(() => setStatus("idle"), 3000)
    } catch {
      setStatus("error")
    } finally {
      setSending(false)
    }
  }

  if (!hasSlack) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          No Slack channel connected for this client.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="slack-message">Message</Label>
        <Textarea
          id="slack-message"
          placeholder="Type a message to send to the client's Slack channel..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          disabled={sending}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          {status === "success" && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Message sent</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">Failed to send. Try again.</p>
          )}
        </div>
        <Button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          size="sm"
        >
          {sending ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Send className="mr-1.5 size-3.5" />
          )}
          Send
        </Button>
      </div>
    </div>
  )
}

// --- Email Action ---

function EmailAction({
  clientId,
  defaultTo,
  onComplete,
}: {
  clientId: string
  defaultTo: string
  onComplete: () => void
}) {
  const [to, setTo] = useState(defaultTo)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) return
    setSending(true)
    setStatus("idle")

    try {
      const res = await fetch(`/api/portal/admin/clients/${clientId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
        }),
      })

      if (!res.ok) throw new Error("Failed to send")
      setSubject("")
      setBody("")
      setStatus("success")
      onComplete()
      setTimeout(() => setStatus("idle"), 3000)
    } catch {
      setStatus("error")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email-to">To</Label>
        <Input
          id="email-to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          disabled={sending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email-subject">Subject</Label>
        <Input
          id="email-subject"
          placeholder="Email subject..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={sending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email-body">Body</Label>
        <Textarea
          id="email-body"
          placeholder="Write your email..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          disabled={sending}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          {status === "success" && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Email sent</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">Failed to send. Try again.</p>
          )}
        </div>
        <Button
          onClick={handleSend}
          disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
          size="sm"
        >
          {sending ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Send className="mr-1.5 size-3.5" />
          )}
          Send Email
        </Button>
      </div>
    </div>
  )
}

// --- Schedule Call Action ---

function ScheduleAction({
  clientId,
  currentNextCall,
  currentCallType,
  onComplete,
}: {
  clientId: string
  currentNextCall: string | null
  currentCallType: string | null
  onComplete: () => void
}) {
  const [datetime, setDatetime] = useState(currentNextCall?.slice(0, 16) ?? "")
  const [callType, setCallType] = useState(currentCallType ?? "check_in")
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  async function handleSave() {
    if (!datetime) return
    setSaving(true)
    setStatus("idle")

    try {
      const res = await fetch(`/api/portal/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          next_call_at: new Date(datetime).toISOString(),
          next_call_type: callType,
        }),
      })

      if (!res.ok) throw new Error("Failed to save")
      setStatus("success")
      onComplete()
      setTimeout(() => setStatus("idle"), 3000)
    } catch {
      setStatus("error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="call-datetime">Date & Time</Label>
        <Input
          id="call-datetime"
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          disabled={saving}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="call-type">Call Type</Label>
        <Select value={callType} onValueChange={setCallType} disabled={saving}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select call type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="demo">Demo Call</SelectItem>
            <SelectItem value="onboarding">Onboarding Call</SelectItem>
            <SelectItem value="launch">Launch Call</SelectItem>
            <SelectItem value="check_in">Check-in</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <div>
          {status === "success" && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Call scheduled</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">Failed to save. Try again.</p>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !datetime}
          size="sm"
        >
          {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          Schedule
        </Button>
      </div>
    </div>
  )
}
