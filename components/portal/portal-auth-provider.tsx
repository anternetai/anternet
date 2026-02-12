"use client"

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Client, TeamMember } from "@/lib/portal/types"

interface PortalAuthContext {
  user: Client | null
  loading: boolean
  teamMember: TeamMember | null
  refreshUser: () => Promise<void>
}

export const PortalAuthContext = createContext<PortalAuthContext>({
  user: null,
  loading: true,
  teamMember: null,
  refreshUser: async () => {},
})

async function fetchMe(): Promise<{ client: Client | null; teamMember: TeamMember | null }> {
  try {
    const res = await fetch("/api/portal/me")
    if (!res.ok) return { client: null, teamMember: null }
    return await res.json()
  } catch {
    return { client: null, teamMember: null }
  }
}

interface PortalAuthProviderProps {
  children: ReactNode
  initialUser: Client | null
  initialTeamMember?: TeamMember | null
}

export function PortalAuthProvider({ children, initialUser, initialTeamMember }: PortalAuthProviderProps) {
  const [user, setUser] = useState<Client | null>(initialUser)
  const [teamMember, setTeamMember] = useState<TeamMember | null>(initialTeamMember ?? null)
  const [loading, setLoading] = useState(!initialUser)
  const supabase = createClient()

  const refreshUser = useCallback(async () => {
    const result = await fetchMe()
    if (result.client) setUser(result.client)
    if (result.teamMember) setTeamMember(result.teamMember)
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_OUT") {
          setUser(null)
          setTeamMember(null)
          window.location.href = "/portal/login"
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const result = await fetchMe()
          if (result.client) setUser(result.client)
          if (result.teamMember) setTeamMember(result.teamMember)
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <PortalAuthContext value={{ user, loading, teamMember, refreshUser }}>
      {children}
    </PortalAuthContext>
  )
}
