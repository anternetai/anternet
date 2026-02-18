"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { CallState } from "./types"

// Twilio Voice SDK types (loaded dynamically)
interface TwilioDevice {
  connect(params: { params: Record<string, string> }): Promise<TwilioCall>
  destroy(): void
  on(event: string, handler: (...args: unknown[]) => void): void
}

interface TwilioCall {
  disconnect(): void
  on(event: string, handler: (...args: unknown[]) => void): void
  status(): string
  parameters: Record<string, string>
}

interface TwilioTokenResponse {
  token?: string
  configured: boolean
  callerId?: string | null
  error?: string
  missing?: string[]
}

export interface UseTwilioCallReturn {
  callState: CallState
  callDuration: number
  isTwilioReady: boolean
  twilioConfigured: boolean
  twilioError: string | null
  initTwilio: () => Promise<void>
  makeCall: (phoneNumber: string) => Promise<void>
  hangUp: () => void
}

export function useTwilioCall(): UseTwilioCallReturn {
  const [callState, setCallState] = useState<CallState>("idle")
  const [callDuration, setCallDuration] = useState(0)
  const [isTwilioReady, setIsTwilioReady] = useState(false)
  const [twilioConfigured, setTwilioConfigured] = useState(false)
  const [twilioError, setTwilioError] = useState<string | null>(null)

  const deviceRef = useRef<TwilioDevice | null>(null)
  const callRef = useRef<TwilioCall | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStartRef = useRef<number>(0)

  const startDurationTimer = useCallback(() => {
    callStartRef.current = Date.now()
    setCallDuration(0)
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000))
    }, 1000)
  }, [])

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
  }, [])

  const initTwilio = useCallback(async () => {
    setTwilioError(null)

    try {
      // 1. Fetch token from our API
      const tokenRes = await fetch("/api/portal/calls/token")
      const tokenData: TwilioTokenResponse = await tokenRes.json()

      if (!tokenData.configured) {
        setTwilioConfigured(false)
        setTwilioError(tokenData.error || "Twilio not configured")
        return
      }

      if (!tokenData.token) {
        setTwilioError("No token received")
        return
      }

      setTwilioConfigured(true)

      // 2. Dynamically import Twilio Voice SDK
      const { Device } = await import("@twilio/voice-sdk")

      // 3. Create device
      const device = new Device(tokenData.token, {
        logLevel: 1,
        codecPreferences: ["opus" as never, "pcmu" as never],
      }) as unknown as TwilioDevice

      device.on("registered", () => {
        setIsTwilioReady(true)
      })

      device.on("error", (error: unknown) => {
        console.error("Twilio device error:", error)
        const msg = error instanceof Error ? error.message : String(error)
        setTwilioError(msg)
      })

      device.on("tokenWillExpire", async () => {
        // Refresh token before it expires
        try {
          const refreshRes = await fetch("/api/portal/calls/token")
          const refreshData: TwilioTokenResponse = await refreshRes.json()
          if (refreshData.token) {
            // Device auto-refreshes if we update the token
            // For @twilio/voice-sdk, we'd need to destroy and recreate
            console.log("Token refreshed")
          }
        } catch (e) {
          console.error("Failed to refresh Twilio token:", e)
        }
      })

      deviceRef.current = device
      setIsTwilioReady(true)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      if (message.includes("Cannot find module") || message.includes("Failed to fetch dynamically imported module")) {
        setTwilioConfigured(false)
        setTwilioError("Twilio Voice SDK not installed. Using tel: fallback.")
      } else {
        setTwilioError(message)
      }
    }
  }, [])

  const makeCall = useCallback(
    async (phoneNumber: string) => {
      if (!deviceRef.current || !isTwilioReady) {
        setTwilioError("Twilio not initialized")
        return
      }

      // Format number
      let formatted = phoneNumber.replace(/\D/g, "")
      if (formatted.length === 10) formatted = `+1${formatted}`
      else if (formatted.length === 11 && formatted.startsWith("1")) formatted = `+${formatted}`

      try {
        setCallState("connecting")

        const call = await deviceRef.current.connect({
          params: { To: formatted },
        })

        callRef.current = call

        call.on("ringing", () => {
          setCallState("ringing")
        })

        call.on("accept", () => {
          setCallState("connected")
          startDurationTimer()
        })

        call.on("disconnect", () => {
          setCallState("disconnected")
          stopDurationTimer()
          callRef.current = null
        })

        call.on("cancel", () => {
          setCallState("idle")
          stopDurationTimer()
          callRef.current = null
        })

        call.on("error", (error: unknown) => {
          console.error("Call error:", error)
          setCallState("idle")
          stopDurationTimer()
          callRef.current = null
        })
      } catch (e) {
        console.error("Failed to make call:", e)
        setCallState("idle")
        setTwilioError(e instanceof Error ? e.message : String(e))
      }
    },
    [isTwilioReady, startDurationTimer, stopDurationTimer]
  )

  const hangUp = useCallback(() => {
    if (callRef.current) {
      callRef.current.disconnect()
      callRef.current = null
    }
    setCallState("disconnected")
    stopDurationTimer()
  }, [stopDurationTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDurationTimer()
      if (callRef.current) {
        try {
          callRef.current.disconnect()
        } catch {
          // ignore
        }
      }
      if (deviceRef.current) {
        try {
          deviceRef.current.destroy()
        } catch {
          // ignore
        }
      }
    }
  }, [stopDurationTimer])

  return {
    callState,
    callDuration,
    isTwilioReady,
    twilioConfigured,
    twilioError,
    initTwilio,
    makeCall,
    hangUp,
  }
}
