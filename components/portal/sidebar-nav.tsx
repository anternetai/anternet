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

const navItems = [
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/portal/leads", icon: Users },
  { label: "Conversations", href: "/portal/conversations", icon: MessageSquare },
  { label: "Appointments", href: "/portal/appointments", icon: CalendarCheck },
  { label: "Billing", href: "/portal/billing", icon: CreditCard },
]

const adminItems = [
  { label: "Admin", href: "/portal/admin", icon: Shield },
]

interface SidebarNavProps {
  user: {
    name: string
    email: string
    role: string
  }
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  function handleNavClick() {
    // Close sidebar on mobile after clicking a link
    setOpenMobile(false)
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/portal/dashboard" onClick={handleNavClick} className="flex items-center gap-2">
          <Image src="/favicon.svg" alt="HomeField Hub" width={28} height={28} />
          <span className="text-base font-semibold">HomeField Hub</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={handleNavClick}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {user.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={handleNavClick}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
