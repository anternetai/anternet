"use client"

import { use, Suspense, useState, useCallback } from "react"
import { redirect } from "next/navigation"
import useSWR from "swr"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { CsvUpload } from "@/components/portal/csv-upload"
import { ProspectTable } from "@/components/portal/prospect-table"
import { CallQueue } from "@/components/portal/call-queue"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CrmProspect } from "@/lib/portal/types"

interface ProspectsResponse {
  prospects: CrmProspect[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function fetchProspects([, search, outcome, page]: [
  string,
  string,
  string,
  number,
]): Promise<ProspectsResponse> {
  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("limit", "20")
  if (search) params.set("search", search)
  if (outcome && outcome !== "all" && outcome !== "uncalled") {
    params.set("outcome", outcome)
  }

  const res = await fetch(`/api/portal/admin/prospects?${params.toString()}`)
  if (!res.ok) throw new Error("Failed to fetch prospects")
  return res.json()
}

// Fetch ALL prospects for call queue and follow-ups (no pagination, up to 1000)
async function fetchAllProspects(): Promise<ProspectsResponse> {
  const res = await fetch("/api/portal/admin/prospects?limit=100&page=1")
  if (!res.ok) throw new Error("Failed to fetch prospects")
  return res.json()
}

function ProspectsContent() {
  const { user } = use(PortalAuthContext)
  const [search, setSearch] = useState("")
  const [outcomeFilter, setOutcomeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState("all")

  // Debounced search - reset page on search/filter change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleOutcomeFilterChange = useCallback((value: string) => {
    setOutcomeFilter(value)
    setPage(1)
  }, [])

  // Fetch paginated prospects for the table
  const {
    data: tableData,
    isLoading: tableLoading,
    mutate: mutateTable,
  } = useSWR(
    ["prospects-table", search, outcomeFilter, page],
    fetchProspects,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  // Fetch all prospects for queue/follow-ups
  const {
    data: allData,
    isLoading: allLoading,
    mutate: mutateAll,
  } = useSWR("prospects-all", fetchAllProspects, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  if (!user) return null
  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  const allProspects = allData?.prospects ?? []
  const tableProspects = tableData?.prospects ?? []
  const total = tableData?.pagination?.total ?? 0

  // Follow-up prospects: have a follow_up_at date, sorted by soonest first
  const followUpProspects = allProspects
    .filter((p) => p.follow_up_at)
    .sort(
      (a, b) =>
        new Date(a.follow_up_at!).getTime() -
        new Date(b.follow_up_at!).getTime()
    )

  async function handleUpdate(id: string, data: Partial<CrmProspect>) {
    try {
      const res = await fetch(`/api/portal/admin/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update")
      }
      // Revalidate both datasets
      await Promise.all([mutateTable(), mutateAll()])
    } catch (err) {
      console.error("Failed to update prospect:", err)
      throw err
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/portal/admin/prospects/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete")
      }
      await Promise.all([mutateTable(), mutateAll()])
    } catch (err) {
      console.error("Failed to delete prospect:", err)
      throw err
    }
  }

  function handleImportComplete() {
    mutateTable()
    mutateAll()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prospects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your outreach list. Upload CSVs, call prospects, and track follow-ups.
          </p>
        </div>
        <CsvUpload onImportComplete={handleImportComplete} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All Prospects
            {total > 0 && (
              <span className="ml-1.5 rounded-full bg-muted-foreground/10 px-1.5 text-xs">
                {total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="queue">
            Call Queue
            {allProspects.filter((p) => !p.call_outcome).length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                {allProspects.filter((p) => !p.call_outcome).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="followups">
            Follow-ups
            {followUpProspects.length > 0 && (
              <span className="ml-1.5 rounded-full bg-purple-100 px-1.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                {followUpProspects.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ProspectTable
            prospects={tableProspects}
            total={total}
            page={page}
            isLoading={tableLoading}
            onPageChange={setPage}
            onSearchChange={handleSearchChange}
            onOutcomeFilterChange={handleOutcomeFilterChange}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            search={search}
            outcomeFilter={outcomeFilter}
          />
        </TabsContent>

        <TabsContent value="queue">
          <CallQueue
            prospects={allProspects}
            isLoading={allLoading}
            onUpdate={handleUpdate}
          />
        </TabsContent>

        <TabsContent value="followups">
          <ProspectTable
            prospects={followUpProspects}
            total={followUpProspects.length}
            page={1}
            isLoading={allLoading}
            onPageChange={() => {}}
            onSearchChange={() => {}}
            onOutcomeFilterChange={() => {}}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            search=""
            outcomeFilter="all"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ProspectsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ProspectsContent />
    </Suspense>
  )
}
