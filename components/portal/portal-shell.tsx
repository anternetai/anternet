"use client"

import type { ReactNode } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarNav } from "./sidebar-nav"
import { PortalHeader } from "./portal-header"
import { PortalAuthProvider } from "./portal-auth-provider"
import type { Client } from "@/lib/portal/types"

interface PortalShellProps {
  children: ReactNode
  user: Client
}

export function PortalShell({ children, user }: PortalShellProps) {
  return (
    <PortalAuthProvider initialUser={user}>
      <SidebarProvider>
        <SidebarNav
          user={{
            name: `${user.first_name} ${user.last_name}`.trim() || user.legal_business_name,
            email: user.email_for_notifications || user.business_email_for_leads,
            role: user.role,
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
