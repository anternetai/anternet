"use client"

/**
 * useGeminiLiveCoach — Real-time AI sales coaching hook.
 *
 * Connects the Cold Call Cockpit's audio streams to the Gemini Live Coach
 * WebSocket proxy, providing live coaching messages during calls.
 *
 * Usage:
 *   const { messages, isConnected, latency, enable, disable } = useGeminiLiveCoach({
 *     localStreamRef,
 *     remoteStreamRef,
 *     callState,
 *     leadInfo: { businessName: "Acme Roofing" },
 *   })
 */

import { useState, useCallback, useRef, useEffect } from "react"
import type { CallState } from "./types"
import type {
  CoachingMessage,
  LeadContext,
  WSMessageFromProxy,
  WSSessionSummary,
} from "./gemini-types"
import { parseUrgency } from "./gemini-types"
import { createAudioResampler, type AudioResamplerHandle } from "./audio-resampler"

// ─── Config ─────────────────────────────────────────────────────────────────

const WS_PROXY_URL = process.env.NEXT_PUBLIC_GEMINI_WS_URL || "ws://localhost:8765"
const MAX_MESSAGES = 50 // keep last 50 coaching messages in state
const VALID_URGENCIES = new Set(["critical", "adjust", "positive"])

// ─── Hook Interface ─────────────────────────────────────────────────────────

interface UseGeminiLiveCoachOptions {
  localStreamRef: React.RefObject<MediaStream | null>
  remoteStreamRef: React.RefObject<MediaStream | null>
  callState: CallState
  leadInfo?: LeadContext
}

interface UseGeminiLiveCoachReturn {
  messages: CoachingMessage[]
  isConnected: boolean
  isEnabled: boolean
  latency: number | null
  error: string | null
  sessionSummary: WSSessionSummary | null
  enable: () => void
  disable: () => void
  clearMessages: () => void
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useGeminiLiveCoach({
  localStreamRef,
  remoteStreamRef,
  callState,
  leadInfo,
}: UseGeminiLiveCoachOptions): UseGeminiLiveCoachReturn {
  const [messages, setMessages] = useState<CoachingMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [latency, setLatency] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionSummary, setSessionSummary] = useState<WSSessionSummary | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const resamplerRef = useRef<AudioResamplerHandle | null>(null)
  const isEnabledRef = useRef(false)
  const messageIdRef = useRef(0)
  const leadInfoRef = useRef(leadInfo)

  // Keep refs in sync with latest props
  useEffect(() => {
    isEnabledRef.current = isEnabled
  }, [isEnabled])

  useEffect(() => {
    leadInfoRef.current = leadInfo
  }, [leadInfo])

  // ── Connect to proxy and start streaming audio ──────────────────────────

  const startSession = useCallback(() => {
    if (wsRef.current) return // already connected

    const localStream = localStreamRef.current
    if (!localStream) {
      console.warn("[LiveCoach] No local stream available")
      return
    }

    setError(null)
    setSessionSummary(null)

    // 1. Connect WebSocket to proxy
    const ws = new WebSocket(WS_PROXY_URL)
    wsRef.current = ws

    ws.onopen = () => {
      console.log("[LiveCoach] Connected to proxy")

      // Send start message with lead context
      ws.send(JSON.stringify({
        type: "start",
        leadInfo: leadInfoRef.current || {},
      }))
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessageFromProxy = JSON.parse(event.data)

        if (msg.type === "status") {
          if (msg.status === "connected") {
            setIsConnected(true)
            setError(null)
            console.log("[LiveCoach] Gemini session ready — starting audio stream")

            // 2. Start audio resampler now that Gemini is ready
            const remoteStream = remoteStreamRef.current
            const resampler = createAudioResampler({
              localStream: localStream,
              remoteStream: remoteStream,
              onChunk: (base64Pcm) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: "audio",
                    data: base64Pcm,
                    sentAt: Date.now(),
                  }))
                }
              },
            })
            resampler.start()
            resamplerRef.current = resampler
          } else if (msg.status === "error") {
            setError(msg.message || "Gemini connection error")
            setIsConnected(false)
          } else if (msg.status === "disconnected") {
            setIsConnected(false)
          }
        }

        if (msg.type === "coaching") {
          const { urgency: parsedUrgency, cleanText } = parseUrgency(msg.text)
          const now = Date.now()
          const roundTrip = msg.sentAt ? now - msg.sentAt : 0

          // Prefer the proxy's urgency field if valid, else fall back to emoji parsing
          const resolvedUrgency = VALID_URGENCIES.has(msg.urgency)
            ? msg.urgency as "critical" | "adjust" | "positive"
            : parsedUrgency

          const newMessage: CoachingMessage = {
            id: `coach-${++messageIdRef.current}`,
            text: cleanText,
            urgency: resolvedUrgency,
            timestamp: now,
            latencyMs: roundTrip,
          }

          setMessages((prev) => {
            const updated = [...prev, newMessage]
            return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated
          })
          setLatency(roundTrip)
        }

        if (msg.type === "summary") {
          setSessionSummary(msg)
          console.log("[LiveCoach] Session summary:", msg)
        }
      } catch {
        // Ignore parse errors
      }
    }

    ws.onerror = (event) => {
      console.error("[LiveCoach] WebSocket error:", event)
      setError("Connection to coaching proxy failed")
      setIsConnected(false)
    }

    ws.onclose = () => {
      console.log("[LiveCoach] Disconnected from proxy")
      setIsConnected(false)
      wsRef.current = null

      // Stop audio resampler
      if (resamplerRef.current) {
        resamplerRef.current.stop()
        resamplerRef.current = null
      }
    }
  }, [localStreamRef, remoteStreamRef])

  // ── Stop session ────────────────────────────────────────────────────────

  const stopSession = useCallback(() => {
    // Stop audio resampler
    if (resamplerRef.current) {
      resamplerRef.current.stop()
      resamplerRef.current = null
    }

    // Send stop signal and close WS
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }))
      }
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
  }, [])

  // ── Auto-start/stop based on call state ─────────────────────────────────

  useEffect(() => {
    if (!isEnabledRef.current) return

    if (callState === "connected") {
      // Small delay to ensure audio streams are populated
      const timer = setTimeout(() => {
        if (isEnabledRef.current) {
          startSession()
        }
      }, 500)
      return () => clearTimeout(timer)
    }

    if (callState === "disconnected" || callState === "idle") {
      stopSession()
    }
  }, [callState, startSession, stopSession])

  // ── Enable/Disable controls ─────────────────────────────────────────────

  const enable = useCallback(() => {
    setIsEnabled(true)
    setMessages([])
    setSessionSummary(null)
    setError(null)
    // If already on a call, start immediately
    if (callState === "connected") {
      setTimeout(() => startSession(), 100)
    }
  }, [callState, startSession])

  const disable = useCallback(() => {
    setIsEnabled(false)
    stopSession()
  }, [stopSession])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // ── Cleanup on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopSession()
    }
  }, [stopSession])

  return {
    messages,
    isConnected,
    isEnabled,
    latency,
    error,
    sessionSummary,
    enable,
    disable,
    clearMessages,
  }
}
