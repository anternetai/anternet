"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import {
  Phone,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Shield,
  Activity,
  Clock,
  XCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import type { PhonePoolNumber } from "@/lib/dialer/types"

async function fetchNumbers(): Promise<{ numbers: PhonePoolNumber[] }> {
  const res = await fetch("/api/portal/dialer/numbers")
  if (!res.ok) throw new Error("Failed to fetch numbers")
  return res.json()
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Activity }> = {
  active: {
    label: "Active",
    color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    icon: CheckCircle2,
  },
  cooling: {
    label: "Cooling",
    color: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    icon: Clock,
  },
  retired: {
    label: "Retired",
    color: "border-red-500/30 bg-red-500/10 text-red-500",
    icon: XCircle,
  },
}

export function PhoneNumbers() {
  const { data, isLoading, mutate } = useSWR("dialer-phone-numbers", fetchNumbers, {
    revalidateOnFocus: true,
    refreshInterval: 30000,
  })

  const [addOpen, setAddOpen] = useState(false)
  const [newNumber, setNewNumber] = useState("")
  const [newName, setNewName] = useState("")
  const [newAreaCode, setNewAreaCode] = useState("")
  const [newState, setNewState] = useState("")
  const [newTwilioSid, setNewTwilioSid] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numbers = data?.numbers || []
  const activeCount = numbers.filter((n) => n.status === "active").length
  const coolingCount = numbers.filter((n) => n.status === "cooling").length
  const retiredCount = numbers.filter((n) => n.status === "retired").length

  const handleAdd = useCallback(async () => {
    if (!newNumber.trim()) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/portal/dialer/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: newNumber.trim(),
          friendly_name: newName.trim() || undefined,
          area_code: newAreaCode.trim() || undefined,
          state: newState.trim() || undefined,
          twilio_sid: newTwilioSid.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add number")
      }

      setNewNumber("")
      setNewName("")
      setNewAreaCode("")
      setNewState("")
      setNewTwilioSid("")
      setAddOpen(false)
      mutate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [newNumber, newName, newAreaCode, newState, newTwilioSid, mutate])

  const handleRetire = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/portal/dialer/numbers?id=${id}`, {
          method: "DELETE",
        })
        mutate()
      } catch (err) {
        console.error("Failed to retire number:", err)
      }
    },
    [mutate]
  )

  const handleReactivate = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/portal/dialer/numbers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "active", calls_this_hour: 0 }),
        })
        mutate()
      } catch (err) {
        console.error("Failed to reactivate number:", err)
      }
    },
    [mutate]
  )

  const handleResetHourly = useCallback(async () => {
    try {
      // Reset all active/cooling numbers' hourly counts
      for (const num of numbers.filter((n) => n.status !== "retired")) {
        await fetch("/api/portal/dialer/numbers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: num.id,
            calls_this_hour: 0,
            status: num.status === "cooling" ? "active" : num.status,
          }),
        })
      }
      mutate()
    } catch (err) {
      console.error("Failed to reset hourly:", err)
    }
  }, [numbers, mutate])

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      {activeCount <= 1 && numbers.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="size-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-500">Low Number Pool</p>
              <p className="text-xs text-muted-foreground">
                Only {activeCount} active number{activeCount !== 1 ? "s" : ""} remaining.
                Add more numbers to maintain healthy call rotation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <div>
              <p className="text-xl font-bold tabular-nums">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <Clock className="size-5 text-amber-500" />
            <div>
              <p className="text-xl font-bold tabular-nums">{coolingCount}</p>
              <p className="text-xs text-muted-foreground">Cooling</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <XCircle className="size-5 text-red-500" />
            <div>
              <p className="text-xl font-bold tabular-nums">{retiredCount}</p>
              <p className="text-xs text-muted-foreground">Retired</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Add Number
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="size-5 text-orange-500" />
                Add Phone Number to Pool
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Phone Number *
                </label>
                <Input
                  placeholder="+1 (980) 689-6919"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Friendly Name
                </label>
                <Input
                  placeholder="Main Line, NC Number, etc."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Area Code
                  </label>
                  <Input
                    placeholder="980"
                    value={newAreaCode}
                    onChange={(e) => setNewAreaCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    State
                  </label>
                  <Input
                    placeholder="NC"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Twilio SID (optional)
                </label>
                <Input
                  placeholder="PN..."
                  value={newTwilioSid}
                  onChange={(e) => setNewTwilioSid(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAdd} disabled={saving || !newNumber.trim()} className="gap-2">
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Add Number
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleResetHourly}>
          <RefreshCw className="size-3.5" />
          Reset Hourly Counts
        </Button>
      </div>

      {/* Numbers Table */}
      {numbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Phone className="mb-3 size-10 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">No numbers in pool</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add phone numbers to enable call rotation and reduce spam flags.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Area / State</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Today</TableHead>
                    <TableHead className="text-right">This Hour</TableHead>
                    <TableHead className="text-right">Spam</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {numbers.map((num) => {
                    const statusConfig =
                      STATUS_CONFIG[num.status] || STATUS_CONFIG.active
                    const StatusIcon = statusConfig.icon
                    const hourPct =
                      num.max_calls_per_hour > 0
                        ? (num.calls_this_hour / num.max_calls_per_hour) * 100
                        : 0
                    return (
                      <TableRow key={num.id}>
                        <TableCell className="font-mono text-sm">
                          {formatPhone(num.phone_number)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {num.friendly_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="tabular-nums">{num.area_code || "—"}</span>
                          {num.state && (
                            <Badge variant="outline" className="ml-1.5 text-[10px]">
                              {num.state}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1 text-[10px] ${statusConfig.color}`}
                          >
                            <StatusIcon className="size-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {num.calls_today}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className={`tabular-nums text-sm ${
                                hourPct >= 80
                                  ? "text-red-500 font-medium"
                                  : hourPct >= 50
                                    ? "text-amber-500"
                                    : ""
                              }`}
                            >
                              {num.calls_this_hour}/{num.max_calls_per_hour}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {num.spam_reports > 0 ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                num.spam_reports > 2
                                  ? "border-red-500/30 text-red-500"
                                  : "border-amber-500/30 text-amber-500"
                              }`}
                            >
                              <Shield className="mr-0.5 size-3" />
                              {num.spam_reports}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {num.status === "retired" || num.status === "cooling" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-400"
                                onClick={() => handleReactivate(num.id)}
                                title="Reactivate"
                              >
                                <RefreshCw className="size-3.5" />
                              </Button>
                            ) : null}
                            {num.status !== "retired" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
                                onClick={() => handleRetire(num.id)}
                                title="Retire"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatPhone(phone: string | null): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}
