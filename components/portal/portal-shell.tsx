"use client"

import type { ReactNode } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarNav } from "./sidebar-nav"
import { PortalHeader } from "./portal-header"
import { PortalAuthProvider } from "./portal-auth-provider"
import type { Client, TeamMember } from "@/lib/portal/types"

interface PortalShellProps {
  children: ReactNode
  user: Client
  initialTeamMember?: TeamMember | null
}

export function PortalShell({ children, user, initialTeamMember }: PortalShellProps) {
  const displayName = initialTeamMember
    ? `${initialTeamMember.first_name ?? ""} ${initialTeamMember.last_name ?? ""}`.trim() || initialTeamMember.email
    : `${user.first_name} ${user.last_name}`.trim() || user.legal_business_name
  const displayEmail = initialTeamMember?.email || user.email_for_notifications || user.business_email_for_leads

  return (
    <PortalAuthProvider initialUser={user} initialTeamMember={initialTeamMember ?? null}>
      <SidebarProvider>
        <SidebarNav
          user={{
            name: displayName,
            email: displayEmail,
            role: initialTeamMember?.role || user.role,
          }}
        />
        <SidebarInset>
          <PortalHeader />
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PortalAuthProvider>
  )
}
