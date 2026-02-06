"use client"

import { createContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Client } from "@/lib/portal/types"

interface PortalAuthContext {
  user: Client | null
  loading: boolean
}

export const PortalAuthContext = createContext<PortalAuthContext>({
  user: null,
  loading: true,
})

export function PortalAuthProvider({ children, initialUser }: { children: ReactNode; initialUser: Client | null }) {
  const [user, setUser] = useState<Client | null>(initialUser)
  const [loading, setLoading] = useState(!initialUser)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_OUT") {
          setUser(null)
          router.push("/portal/login")
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (authUser) {
            const { data } = await supabase
              .from("agency_clients")
              .select("*")
              .eq("auth_user_id", authUser.id)
              .single()
            if (data) setUser(data as Client)
          }
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <PortalAuthContext value={{ user, loading }}>
      {children}
    </PortalAuthContext>
  )
}
