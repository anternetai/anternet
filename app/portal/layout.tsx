import { ThemeProvider } from "next-themes"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { PortalShell } from "@/components/portal/portal-shell"
import type { Client, TeamMember } from "@/lib/portal/types"

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
  let initialTeamMember: TeamMember | null = null
  if (authUser) {
    // Try direct match (primary client)
    const { data } = await supabase
      .from("agency_clients")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .single()
    client = data as Client | null

    // Fallback: use service role to bypass RLS for team member lookup
    if (!client) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

        const { data: tm } = await admin
          .from("client_team_members")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .limit(1)
          .single()

        if (tm) {
          initialTeamMember = tm as TeamMember
          const { data: parentClient } = await admin
            .from("agency_clients")
            .select("*")
            .eq("id", tm.client_id)
            .single()
          client = parentClient as Client | null
        }
      }
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {client ? (
        <PortalShell user={client} initialTeamMember={initialTeamMember}>{children}</PortalShell>
      ) : (
        children
      )}
    </ThemeProvider>
  )
}
