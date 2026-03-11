"use client"

import { use, useEffect, useState, useCallback, Suspense } from "react"
import { redirect, useSearchParams } from "next/navigation"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Link2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface AccountInfo {
  email?: string
  name?: string
  picture?: string
}

interface CalendarItem {
  id: string
  summary: string
  description?: string
  colorId?: string
  primary?: boolean
  accessRole?: string
}

interface StatusData {
  connected: boolean
  account: AccountInfo | null
}

const COLOR_MAP: Record<string, string> = {
  "1": "bg-indigo-400",
  "2": "bg-green-400",
  "3": "bg-purple-400",
  "4": "bg-pink-400",
  "5": "bg-yellow-400",
  "6": "bg-orange-400",
  "7": "bg-cyan-400",
  "8": "bg-gray-400",
  "9": "bg-blue-600",
  "10": "bg-green-700",
  "11": "bg-red-500",
}

function CalendarAuthContent() {
  const { user } = use(PortalAuthContext)
  const searchParams = useSearchParams()

  const [status, setStatus] = useState<StatusData | null>(null)
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupResult, setSetupResult] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  if (!user) return null
  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  const successParam = searchParams.get("success")
  const errorParam = searchParams.get("error")

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch("/api/google/status")
      const data = await res.json()
      setStatus(data)

      if (data.connected) {
        fetchCalendars()
      }
    } catch {
      setStatus({ connected: false, account: null })
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  const fetchCalendars = useCallback(async () => {
    setLoadingCalendars(true)
    try {
      const res = await fetch("/api/google/calendars")
      if (res.ok) {
        const data = await res.json()
        setCalendars(data.calendars || [])
      }
    } catch {
      setCalendars([])
    } finally {
      setLoadingCalendars(false)
    }
  }, [])

  const handleSetupCalendars = useCallback(async () => {
    setSetupLoading(true)
    setSetupResult(null)
    try {
      const res = await fetch("/api/google/setup-calendars", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setSetupResult("✅ HomeField Hub and Dr. Squeegee calendars are ready!")
        fetchCalendars()
      } else {
        setSetupResult(`❌ ${data.error || "Setup failed"}`)
      }
    } catch {
      setSetupResult("❌ Failed to setup calendars")
    } finally {
      setSetupLoading(false)
    }
  }, [fetchCalendars])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Show toast based on URL params from OAuth redirect
  useEffect(() => {
    if (successParam === "connected") {
      setToast({ type: "success", msg: "Google Calendar connected successfully!" })
    } else if (errorParam) {
      const msg = errorParam === "access_denied"
        ? "Google OAuth was denied."
        : errorParam === "no_code"
        ? "OAuth flow failed — no code received."
        : `OAuth error: ${errorParam}`
      setToast({ type: "error", msg })
    }

    if (successParam || errorParam) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successParam, errorParam])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Google Calendar</h1>
          <p className="text-muted-foreground text-sm">
            Connect and manage your Google Calendar integration
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            toast.type === "success"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Connection Status
          </CardTitle>
          <CardDescription>
            Your Google account connection for calendar management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Checking connection...</span>
            </div>
          ) : status?.connected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Connected</span>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                      Active
                    </Badge>
                  </div>
                  {status.account?.email && (
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {status.account.name && `${status.account.name} · `}
                      {status.account.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStatus}
                  disabled={loadingStatus}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href="/api/google/auth">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Reconnect
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="font-medium text-sm">Not Connected</span>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Connect your Google account to enable calendar features
                  </p>
                </div>
              </div>
              <Button asChild>
                <a href="/api/google/auth">
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Setup Card - only show when connected */}
      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default Calendars Setup</CardTitle>
            <CardDescription>
              Create the HomeField Hub and Dr. Squeegee calendars on your Google account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <div>
                  <p className="text-sm font-medium">HomeField Hub</p>
                  <p className="text-xs text-muted-foreground">Demo bookings &amp; client calls</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="w-3 h-3 rounded-full bg-green-700" />
                <div>
                  <p className="text-sm font-medium">Dr. Squeegee</p>
                  <p className="text-xs text-muted-foreground">Squeegee service appointments</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSetupCalendars}
                disabled={setupLoading}
                variant="outline"
              >
                {setupLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {setupLoading ? "Setting up..." : "Setup Default Calendars"}
              </Button>
              {setupResult && (
                <span className="text-sm text-muted-foreground">{setupResult}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Calendars - only show when connected */}
      {status?.connected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Available Calendars</CardTitle>
                <CardDescription>
                  All calendars on your connected Google account
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchCalendars}
                disabled={loadingCalendars}
              >
                {loadingCalendars ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCalendars ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading calendars...</span>
              </div>
            ) : calendars.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No calendars found. Try refreshing.
              </p>
            ) : (
              <div className="space-y-2">
                {calendars.map((cal) => (
                  <div
                    key={cal.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          cal.colorId ? (COLOR_MAP[cal.colorId] || "bg-blue-500") : "bg-blue-500"
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{cal.summary}</span>
                          {cal.primary && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              Primary
                            </Badge>
                          )}
                        </div>
                        {cal.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                            {cal.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                      {cal.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function CalendarAuthPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    }>
      <CalendarAuthContent />
    </Suspense>
  )
}
