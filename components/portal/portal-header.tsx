"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "./theme-toggle"

export function PortalHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex-1" />
      <Button variant="ghost" size="icon" aria-label="Notifications" disabled>
        <Bell className="size-4" />
      </Button>
      <ThemeToggle />
    </header>
  )
}
