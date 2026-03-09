"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CalendarCheck,
  CreditCard,
  Shield,
  UserPlus,
  PhoneCall,
  Headphones,
  Cpu,
  MapPin,
  DoorOpen,
  Brain,
  Settings,
  ClipboardList,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { UserMenu } from "./user-menu"
import { TEAM_ROLE_CONFIG } from "@/lib/portal/constants"
import type { TeamMemberRole } from "@/lib/portal/types"

// Client/team member nav — always visible
const navItems = [
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/portal/leads", icon: Users },
  { label: "Conversations", href: "/portal/conversations", icon: MessageSquare },
  { label: "Appointments", href: "/portal/appointments", icon: CalendarCheck },
  { label: "Billing", href: "/portal/billing", icon: CreditCard },
]

// Admin: Operations group
const adminOpsItems = [
  { label: "Clients", href: "/portal/admin", icon: Shield },
  { label: "Manage", href: "/portal/admin/manage", icon: ClipboardList },
  { label: "Prospects", href: "/portal/admin/prospects", icon: UserPlus },
  { label: "Control Panel", href: "/portal/admin/control", icon: Cpu },
]

// Admin: Sales group
const adminSalesItems = [
  { label: "Cold Calls", href: "/portal/cold-calls", icon: PhoneCall },
  { label: "Call Logs", href: "/portal/calls", icon: Headphones },
]

// Admin: The Move group
const adminMoveItems = [
  { label: "The Move", href: "/portal/the-move", icon: MapPin },
  { label: "Door Knocks", href: "/portal/the-move/knocks", icon: DoorOpen },
  { label: "AI Insights", href: "/portal/the-move/insights", icon: Brain },
]

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> }

interface SidebarNavProps {
  user: {
    name: string
    email: string
    role: string
  }
}

function NavGroup({ label, items, pathname, onNavClick }: {
  label: string
  items: NavItem[]
  pathname: string
  onNavClick: () => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.href === "/portal/dashboard" || item.href === "/portal/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href)
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                  <Link href={item.href} onClick={onNavClick}>
                    <item.icon className={isActive ? "size-4 text-orange-500" : "size-4"} />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  function handleNavClick() {
    setOpenMobile(false)
  }

  const filteredNavItems = (() => {
    if (user.role === "client" || user.role === "admin") return navItems
    const config = TEAM_ROLE_CONFIG[user.role as TeamMemberRole]
    if (!config) return navItems
    return navItems.filter((item) => config.allowedRoutes.includes(item.href))
  })()

  const isAdmin = user.role === "admin"

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/portal/dashboard" onClick={handleNavClick} className="flex items-center gap-2">
          <Image src="/favicon.svg" alt="HomeField Hub" width={28} height={28} />
          <span className="text-base font-semibold">HomeField Hub</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Navigation" items={filteredNavItems} pathname={pathname} onNavClick={handleNavClick} />
        {isAdmin && (
          <>
            <NavGroup label="Operations" items={adminOpsItems} pathname={pathname} onNavClick={handleNavClick} />
            <NavGroup label="Sales" items={adminSalesItems} pathname={pathname} onNavClick={handleNavClick} />
            <NavGroup label="The Move" items={adminMoveItems} pathname={pathname} onNavClick={handleNavClick} />
          </>
        )}
        {/* Settings — always visible */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/portal/settings")}
                  tooltip="Settings"
                >
                  <Link href="/portal/settings" onClick={handleNavClick}>
                    <Settings className={pathname.startsWith("/portal/settings") ? "size-4 text-orange-500" : "size-4"} />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu name={user.name} email={user.email} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
