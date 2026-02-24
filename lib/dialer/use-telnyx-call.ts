"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { CallState } from "./types"

export interface TelnyxCallResponse {
  success: boolean
  callControlId?: string
  callSessionId?: string
  error?: string
  configured?: boolean
}

export interface UseTelnyxCallReturn {
  callState: CallState
  callDuration: number
  callControlId: string | null
  isReady: boolean
  telnyxConfigured: boolean
  telnyxError: string | null
  makeCall: (phoneNumber: string, leadId?: string) => Promise<void>
  hangUp: () => Promise<void>
}

/**
 * Telnyx Call Hook
 *
 * Telnyx Call Control is server-side (no browser WebRTC).
 * This hook calls our API which calls Telnyx. The user talks
 * on their actual phone/headset. We track call state and
 * provide dial/hangup control from the browser.
 *
 * State flow: idle → connecting → ringing → connected → disconnected
 */
export function useTelnyxCall(): UseTelnyxCallReturn {
  const [callState, setCallState] = useState<CallState>("idle")
  const [callDuration, setCallDuration] = useState(0)
  const [callControlId, setCallControlId] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [telnyxConfigured, setTelnyxConfigured] = useState(true)
  const [telnyxError, setTelnyxError] = useState<string | null>(null)

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStartRef = useRef<number>(0)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentCallControlId = useRef<string | null>(null)

  // On mount, check if Telnyx is available by making a preflight check
  useEffect(() => {
    async function checkTelnyx() {
      try {
        const res = await fetch("/api/telnyx/calls?limit=1")
        if (res.status === 401) {
          // Not logged in — we'll still allow calls once authenticated
          setIsReady(true)
          return
        }
        if (res.ok) {
          setTelnyxConfigured(true)
          setIsReady(true)
        } else if (res.status === 500) {
          // API route exists but Telnyx may not be configured
          setTelnyxConfigured(false)
          setTelnyxError("Telnyx not configured. Using tel: links.")
          setIsReady(true)
        } else {
          setIsReady(true)
        }
      } catch {
        // Network error or route doesn't exist — degrade gracefully
        setIsReady(true)
      }
    }
    checkTelnyx()
  }, [])

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

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  /**
   * Poll for call status updates via Telnyx webhook-driven call logs.
   * Since Telnyx is server-side, we poll our own call logs table
   * to detect when the call is ringing, answered, or completed.
   */
  const startPollingStatus = useCallback(
    (controlId: string) => {
      stopPolling()

      let pollCount = 0
      const MAX_POLLS = 120 // 2 minutes max polling

      pollIntervalRef.current = setInterval(async () => {
        pollCount++
        if (pollCount > MAX_POLLS) {
          stopPolling()
          return
        }

        try {
          const res = await fetch(
            `/api/telnyx/calls?callControlId=${encodeURIComponent(controlId)}&limit=1`
          )
          if (!res.ok) return

          const data = await res.json()
          const calls = data.calls || []
          if (!calls.length) return

          const call = calls[0]
          const status: string = call.status || ""

          // Map Telnyx statuses to our CallState
          if (status === "ringing" || status === "initiated") {
            setCallState((prev) => (prev === "connecting" ? "ringing" : prev))
          } else if (status === "answered" || status === "bridged") {
            setCallState((prev) => {
              if (prev !== "connected") {
                startDurationTimer()
              }
              return "connected"
            })
            stopPolling() // Stop polling — call is live
          } else if (
            status === "completed" ||
            status === "failed" ||
            status === "busy" ||
            status === "no_answer" ||
            status === "cancelled"
          ) {
            setCallState("disconnected")
            stopDurationTimer()
            stopPolling()
          }
        } catch {
          // Polling error — continue silently
        }
      }, 1000)
    },
    [startDurationTimer, stopDurationTimer, stopPolling]
  )

  const makeCall = useCallback(
    async (phoneNumber: string, leadId?: string) => {
      setTelnyxError(null)

      // Format number to E.164
      let formatted = phoneNumber.replace(/\D/g, "")
      if (phoneNumber.startsWith("+")) formatted = `+${formatted}`
      else if (formatted.length === 10) formatted = `+1${formatted}`
      else if (formatted.length === 11 && formatted.startsWith("1")) formatted = `+${formatted}`

      // Fallback: if Telnyx isn't configured, open tel: link
      if (!telnyxConfigured) {
        window.open(`tel:${formatted}`, "_self")
        return
      }

      try {
        setCallState("connecting")

        const res = await fetch("/api/telnyx/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: formatted,
            lead_id: leadId || null,
            record: true,
          }),
        })

        const data: TelnyxCallResponse = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to initiate call")
        }

        if (data.callControlId) {
          setCallControlId(data.callControlId)
          currentCallControlId.current = data.callControlId
          setCallState("ringing")
          startPollingStatus(data.callControlId)
        } else {
          // Call initiated but no control ID — fall through
          setCallState("connected")
          startDurationTimer()
        }
      } catch (e) {
        console.error("Telnyx makeCall error:", e)
        const msg = e instanceof Error ? e.message : String(e)
        setTelnyxError(msg)
        setCallState("idle")

        // Final fallback: open tel: link
        window.open(`tel:${formatted}`, "_self")
      }
    },
    [telnyxConfigured, startPollingStatus, startDurationTimer]
  )

  const hangUp = useCallback(async () => {
    stopDurationTimer()
    stopPolling()

    const controlId = currentCallControlId.current
    if (controlId) {
      try {
        await fetch(`/api/telnyx/calls/${controlId}/hangup`, {
          method: "POST",
        })
      } catch (e) {
        console.error("Hang up error:", e)
      }
    }

    setCallState("disconnected")
    setCallControlId(null)
    currentCallControlId.current = null
  }, [stopDurationTimer, stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDurationTimer()
      stopPolling()
    }
  }, [stopDurationTimer, stopPolling])

  return {
    callState,
    callDuration,
    callControlId,
    isReady,
    telnyxConfigured,
    telnyxError,
    makeCall,
    hangUp,
  }
}
