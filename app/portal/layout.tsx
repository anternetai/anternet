import { ThemeProvider } from "next-themes"
import { createClient } from "@/lib/supabase/server"
import { PortalShell } from "@/components/portal/portal-shell"
import type { Client } from "@/lib/portal/types"

export const metadata = {
  title: "Portal | HomeField Hub",
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let client: Client | null = null
  if (authUser) {
    const { data } = await supabase
      .from("agency_clients")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .single()
    client = data as Client | null
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {client ? (
        <PortalShell user={client}>{children}</PortalShell>
      ) : (
        children
      )}
    </ThemeProvider>
  )
}
