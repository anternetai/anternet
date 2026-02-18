"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

interface DailyLogDialogProps {
  onSubmit: (data: {
    call_date: string
    total_dials: number
    contacts: number
    conversations: number
    demos_booked: number
    demos_held: number
    deals_closed: number
    hours_dialed: number
    notes: string
  }) => Promise<void>
}

export function DailyLogDialog({ onSubmit }: DailyLogDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    call_date: new Date().toISOString().split("T")[0],
    total_dials: "",
    contacts: "",
    conversations: "",
    demos_booked: "",
    demos_held: "",
    deals_closed: "",
    hours_dialed: "",
    notes: "",
  })

  async function handleSubmit() {
    setSaving(true)
    try {
      await onSubmit({
        call_date: form.call_date,
        total_dials: parseInt(form.total_dials) || 0,
        contacts: parseInt(form.contacts) || 0,
        conversations: parseInt(form.conversations) || 0,
        demos_booked: parseInt(form.demos_booked) || 0,
        demos_held: parseInt(form.demos_held) || 0,
        deals_closed: parseInt(form.deals_closed) || 0,
        hours_dialed: parseFloat(form.hours_dialed) || 0,
        notes: form.notes,
      })
      setOpen(false)
      setForm({
        call_date: new Date().toISOString().split("T")[0],
        total_dials: "",
        contacts: "",
        conversations: "",
        demos_booked: "",
        demos_held: "",
        deals_closed: "",
        hours_dialed: "",
        notes: "",
      })
    } catch (e) {
      console.error("Failed to save:", e)
    } finally {
      setSaving(false)
    }
  }

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          Log Daily Stats
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Daily Call Stats</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.call_date}
              onChange={(e) => updateField("call_date", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Total Dials</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.total_dials}
                onChange={(e) => updateField("total_dials", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Contacts</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.contacts}
                onChange={(e) => updateField("contacts", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Conversations</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.conversations}
                onChange={(e) => updateField("conversations", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Demos Booked</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.demos_booked}
                onChange={(e) => updateField("demos_booked", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Demos Held</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.demos_held}
                onChange={(e) => updateField("demos_held", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Deals Closed</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.deals_closed}
                onChange={(e) => updateField("deals_closed", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hours Dialed</Label>
              <Input
                type="number"
                placeholder="0.0"
                step="0.25"
                value={form.hours_dialed}
                onChange={(e) => updateField("hours_dialed", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="How did the session go?"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save Stats"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
