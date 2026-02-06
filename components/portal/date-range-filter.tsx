"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DateRangeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const from = searchParams.get("from") || thirtyDaysAgo.toISOString().split("T")[0]
  const to = searchParams.get("to") || now.toISOString().split("T")[0]

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(key, value)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="from" className="text-xs text-muted-foreground">
          From
        </Label>
        <Input
          id="from"
          type="date"
          value={from}
          className="h-8 w-auto text-sm"
          onChange={(e) => updateParams("from", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to" className="text-xs text-muted-foreground">
          To
        </Label>
        <Input
          id="to"
          type="date"
          value={to}
          className="h-8 w-auto text-sm"
          onChange={(e) => updateParams("to", e.target.value)}
        />
      </div>
    </div>
  )
}
