"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Phone,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { DialerLead, DialerStatus, DialerOutcome } from "@/lib/dialer/types"
import { statusBadgeClass, outcomeBadgeClass } from "./lead-detail-sheet"
import { LeadDetailSheet } from "./lead-detail-sheet"

// ─── Fetcher ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LeadsResponse {
  leads: DialerLead[]
  total: number
  page: number
  limit: number
}

type SortColumn =
  | "business_name"
  | "owner_name"
  | "phone_number"
  | "state"
  | "status"
  | "attempt_count"
  | "last_outcome"
  | "last_called_at"

type SortDir = "asc" | "desc"

// ─── US States ─────────────────────────────────────────────────────────────────

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]

// ─── Format helpers ────────────────────────────────────────────────────────────

function formatOutcome(outcome: string | null) {
  if (!outcome) return "—"
  return outcome.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

// ─── Sort header ───────────────────────────────────────────────────────────────

function SortHeader({
  column,
  label,
  sortColumn,
  sortDir,
  onSort,
}: {
  column: SortColumn
  label: string
  sortColumn: SortColumn
  sortDir: SortDir
  onSort: (col: SortColumn) => void
}) {
  const active = sortColumn === column
  return (
    <button
      className={cn(
        "flex items-center gap-1 text-xs font-medium whitespace-nowrap transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={() => onSort(column)}
    >
      {label}
      {active ? (
        sortDir === "asc" ? (
          <ChevronUp className="size-3" />
        ) : (
          <ChevronDown className="size-3" />
        )
      ) : (
        <ChevronsUpDown className="size-3 opacity-40" />
      )}
    </button>
  )
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-[480px] rounded-xl" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-40" />
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function DialerLeadsTable() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [timezoneFilter, setTimezoneFilter] = useState<string>("all")
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all")
  const [sortColumn, setSortColumn] = useState<SortColumn>("last_called_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const limit = 50

  // Lead detail sheet
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Debounce search
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
  }, [])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [statusFilter, stateFilter, timezoneFilter, outcomeFilter])

  // Build URL
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort: sortColumn,
    order: sortDir,
  })
  if (debouncedSearch) params.set("search", debouncedSearch)
  if (statusFilter !== "all") params.set("status", statusFilter)
  if (stateFilter !== "all") params.set("state", stateFilter)
  if (timezoneFilter !== "all") params.set("timezone", timezoneFilter)
  if (outcomeFilter !== "all") params.set("outcome", outcomeFilter)

  const { data, isLoading, error, mutate } = useSWR<LeadsResponse>(
    `/api/portal/dialer/leads?${params.toString()}`,
    fetcher,
    { keepPreviousData: true }
  )

  function handleSort(col: SortColumn) {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(col)
      setSortDir("asc")
    }
    setPage(1)
  }

  // Only open slide-over for leads with meaningful outcome or demo booked
  const SLIDE_OVER_OUTCOMES = new Set([
    "demo_booked",
    "conversation",
    "owner_pitched",
    "callback",
  ])

  function isSlideOverEligible(lead: DialerLead): boolean {
    return (
      lead.demo_booked === true ||
      (lead.last_outcome != null && SLIDE_OVER_OUTCOMES.has(lead.last_outcome))
    )
  }

  function openLeadSheet(lead: DialerLead) {
    if (!isSlideOverEligible(lead)) return
    setSelectedLeadId(lead.id)
    setSheetOpen(true)
  }

  const leads = data?.leads ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)
  const startRow = (page - 1) * limit + 1
  const endRow = Math.min(page * limit, total)

  if (isLoading && !data) return <TableSkeleton />

  return (
    <div className="space-y-3 pt-2">
      {/* Search + filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search business, owner, phone…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="callback">Callback</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger size="sm" className="w-24">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {US_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timezoneFilter} onValueChange={setTimezoneFilter}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue placeholder="Timezone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All timezones</SelectItem>
            <SelectItem value="ET">Eastern (ET)</SelectItem>
            <SelectItem value="CT">Central (CT)</SelectItem>
            <SelectItem value="MT">Mountain (MT)</SelectItem>
            <SelectItem value="PT">Pacific (PT)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Last outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
            <SelectItem value="gatekeeper">Gatekeeper</SelectItem>
            <SelectItem value="conversation">Conversation</SelectItem>
            <SelectItem value="demo_booked">Demo Booked</SelectItem>
            <SelectItem value="not_interested">Not Interested</SelectItem>
            <SelectItem value="wrong_number">Wrong Number</SelectItem>
            <SelectItem value="callback">Callback</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="shrink-0"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Phone className="size-8 opacity-40" />
            <p className="text-sm">Failed to load leads. Check your connection.</p>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!error && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-border/50">
                  <TableHead className="w-[220px]">
                    <SortHeader
                      column="business_name"
                      label="Business"
                      sortColumn={sortColumn}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[140px]">
                    <SortHeader
                      column="owner_name"
                      label="Owner"
                      sortColumn={sortColumn}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[130px]">
                    <SortHeader
                      column="phone_number"
                      label="Phone"
                      sortColumn={sortColumn}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[60px]">
                    <SortHeader
                      column="state"
                      label="State"
                      sortColumn={sortColumn}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader
                      column="status"
                      label="Status"
                      sortColumn={sortColumn}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[80px] text-right">
                    <SortHeader
                      column="attempt_count"
                      label="Attempts"
                      sortColumn={sortColumn}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[130px]">
                    <SortHeader
                      column="last_outcome"
                      label="Last Outcome"
                      sortColumn={sortColumn}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[140px]">
                    <SortHeader
                      column="last_called_at"
                      label="Last Called"
                      sortColumn={sortColumn}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !data ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Phone className="size-8 opacity-30" />
                        <p className="text-sm">No leads match your filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className={cn(
                        "transition-colors",
                        isSlideOverEligible(lead)
                          ? "cursor-pointer hover:bg-muted/40"
                          : "cursor-default hover:bg-muted/20"
                      )}
                      onClick={() => openLeadSheet(lead)}
                    >
                      <TableCell className="font-medium text-sm max-w-[220px]">
                        <div className="flex items-center gap-1.5 truncate">
                          {isSlideOverEligible(lead) && (
                            <span className="inline-block size-1.5 rounded-full bg-emerald-400 shrink-0" title="Has notes / demo" />
                          )}
                          <span className="truncate">{lead.business_name ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                        {lead.owner_name ?? lead.first_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-xs text-muted-foreground">
                        {lead.phone_number ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.state ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 border capitalize",
                            statusBadgeClass(lead.status)
                          )}
                        >
                          {lead.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {lead.attempt_count}
                      </TableCell>
                      <TableCell>
                        {lead.last_outcome ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 border",
                              outcomeBadgeClass(lead.last_outcome)
                            )}
                          >
                            {formatOutcome(lead.last_outcome)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(lead.last_called_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {!error && total > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {startRow.toLocaleString()}–{endRow.toLocaleString()} of{" "}
            {total.toLocaleString()} leads
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Lead detail sheet */}
      <LeadDetailSheet
        leadId={selectedLeadId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
