"use client"

import { use, Suspense, useState, useEffect, useCallback, useMemo } from "react"
import { redirect } from "next/navigation"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Users,
  MessageSquare,
  CalendarCheck,
  CreditCard,
  Building2,
  Clock,
} from "lucide-react"

interface ClientSummary {
  id: string
  legal_business_name: string
  first_name: string
  last_name: string
  onboarding_status: string
  pipeline_stage: string
  created_at: string
}

interface Lead {
  id: string
  name: string
  phone: string
  status: string
  source: string
  created_at: string
}

interface Conversation {
  id: string
  lead_name: string
  direction: string
  last_message: string
  updated_at: string
}

interface Appointment {
  id: string
  lead_name: string
  scheduled_at: string
  status: string
}

interface Payment {
  id: string
  amount_cents: number
  status: string
  created_at: string
  description: string
}

function ManageContent() {
  const { user } = use(PortalAuthContext)
  if (!user || user.role !== "admin") redirect("/portal/dashboard")

  const [clients, setClients] = useState<ClientSummary[]>([])
  const [search, setSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Client data
  const [leads, setLeads] = useState<Lead[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  // Fetch clients
  useEffect(() => {
    async function fetchClients() {
      const res = await fetch("/api/portal/admin")
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
      setLoading(false)
    }
    fetchClients()
  }, [])

  // Fetch client data when selected
  const fetchClientData = useCallback(async (clientId: string) => {
    setDataLoading(true)
    const [leadsRes, convRes, apptRes, payRes] = await Promise.all([
      fetch(`/api/portal/leads?client_id=${clientId}`).catch(() => null),
      fetch(`/api/portal/conversations?client_id=${clientId}`).catch(() => null),
      fetch(`/api/portal/appointments?client_id=${clientId}`).catch(() => null),
      fetch(`/api/portal/payments?client_id=${clientId}`).catch(() => null),
    ])
    if (leadsRes?.ok) setLeads(await leadsRes.json().then(d => d.leads || d || []))
    else setLeads([])
    if (convRes?.ok) setConversations(await convRes.json().then(d => d.conversations || d || []))
    else setConversations([])
    if (apptRes?.ok) setAppointments(await apptRes.json().then(d => d.appointments || d || []))
    else setAppointments([])
    if (payRes?.ok) setPayments(await payRes.json().then(d => d.payments || d || []))
    else setPayments([])
    setDataLoading(false)
  }, [])

  function handleSelectClient(client: ClientSummary) {
    setSelectedClient(client)
    fetchClientData(client.id)
  }

  // Filter clients by search
  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c) =>
        c.legal_business_name?.toLowerCase().includes(q) ||
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q)
    )
  }, [clients, search])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage</h1>
        <p className="text-sm text-muted-foreground">
          Search for a client to view their leads, conversations, appointments, and billing
        </p>
      </div>

      {/* Client Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          aria-label="Search clients by name"
        />
      </div>

      {/* Client List (shows when searching or no client selected) */}
      {!selectedClient && (
        <div className="grid gap-2">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Building2 className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search ? "No clients match your search" : "No clients yet"}
              </p>
            </div>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelectClient(client)}
                className="flex items-center justify-between rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{client.legal_business_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {client.first_name} {client.last_name}
                  </p>
                </div>
                <Badge variant="outline">{client.pipeline_stage || client.onboarding_status}</Badge>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected Client View */}
      {selectedClient && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
                aria-label="Back to client list"
              >
                &larr; All Clients
              </button>
              <span className="text-muted-foreground">/</span>
              <h2 className="font-semibold">{selectedClient.legal_business_name}</h2>
            </div>
            <Badge variant="outline">{selectedClient.pipeline_stage || selectedClient.onboarding_status}</Badge>
          </div>

          <Tabs defaultValue="leads">
            <TabsList>
              <TabsTrigger value="leads" className="gap-1.5">
                <Users className="size-3.5" />
                Leads
                {leads.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{leads.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="conversations" className="gap-1.5">
                <MessageSquare className="size-3.5" />
                Conversations
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{conversations.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="appointments" className="gap-1.5">
                <CalendarCheck className="size-3.5" />
                Appointments
                {appointments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{appointments.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-1.5">
                <CreditCard className="size-3.5" />
                Billing
                {payments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{payments.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {dataLoading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                <TabsContent value="leads">
                  {leads.length === 0 ? (
                    <EmptyTab icon={Users} label="No leads yet" />
                  ) : (
                    <div className="space-y-2">
                      {leads.map((lead) => (
                        <div key={lead.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{lead.name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{lead.phone}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{lead.status}</Badge>
                            <span className="text-xs text-muted-foreground">{lead.source}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="conversations">
                  {conversations.length === 0 ? (
                    <EmptyTab icon={MessageSquare} label="No conversations yet" />
                  ) : (
                    <div className="space-y-2">
                      {conversations.map((conv) => (
                        <div key={conv.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{conv.lead_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">{conv.last_message}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {new Date(conv.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="appointments">
                  {appointments.length === 0 ? (
                    <EmptyTab icon={CalendarCheck} label="No appointments yet" />
                  ) : (
                    <div className="space-y-2">
                      {appointments.map((appt) => (
                        <div key={appt.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{appt.lead_name || "Appointment"}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(appt.scheduled_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant={appt.status === "showed" ? "default" : "outline"}>
                            {appt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="billing">
                  {payments.length === 0 ? (
                    <EmptyTab icon={CreditCard} label="No payments yet" />
                  ) : (
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">
                              ${((payment.amount_cents || 0) / 100).toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground">{payment.description || "Payment"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={payment.status === "succeeded" ? "default" : "outline"}>
                              {payment.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      )}
    </div>
  )
}

function EmptyTab({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Icon className="mx-auto mb-2 size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export default function ManagePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ManageContent />
    </Suspense>
  )
}
