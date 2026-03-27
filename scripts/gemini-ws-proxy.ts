#!/usr/bin/env npx tsx
/**
 * Gemini Live Coach — WebSocket Proxy Server
 *
 * Bridges browser audio ↔ Gemini 3.1 Flash Live API.
 * - Browser connects via WebSocket, sends audio chunks
 * - Proxy forwards audio to Gemini, returns coaching text
 * - API key stays server-side (never exposed to browser)
 *
 * Run: npx tsx scripts/gemini-ws-proxy.ts
 * Port: WS_PORT env var or 8765
 */

import { WebSocketServer, WebSocket } from "ws"
import { createServer } from "http"

// ─── Config ─────────────────────────────────────────────────────────────────

const WS_PORT = parseInt(process.env.WS_PORT || "8765", 10)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
const GEMINI_MODEL = "gemini-3.1-flash-live-preview"
const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY not set. Get one at https://aistudio.google.com/apikey")
  process.exit(1)
}

const SYSTEM_INSTRUCTION = `You are a silent, elite sales coach listening to a live cold call in real time.
The caller sells AI-powered lead generation to home service contractors (roofers, HVAC, plumbers, etc).
Their pricing: $200 per showed appointment, $50/day ad spend, no retainer.

Rules:
- Output ONLY brief, direct coaching text — under 15 words per message
- Only speak when you detect a clear coachable moment — do NOT narrate the call
- Never describe what's happening — only coach
- Prioritize: closing opportunities, tone issues, talking too much, objection handling, appointment setting
- Use these urgency prefixes EXACTLY:
  🔴 = act NOW (closing window, prospect said yes, critical mistake)
  🟡 = adjust (tone, pacing, talking too much, weak pitch)
  🟢 = doing great (landed a good line, handled objection well)

If there is nothing to coach on, say NOTHING. Silence is fine.`

// ─── Gemini Session Management ──────────────────────────────────────────────

interface GeminiSession {
  ws: WebSocket
  isReady: boolean
  messageCount: number
  criticalCount: number
  adjustCount: number
  positiveCount: number
  startedAt: number
}

function connectToGemini(
  onText: (text: string, sentAt: number) => void,
  onReady: () => void,
  onError: (err: string) => void
): GeminiSession {
  const session: GeminiSession = {
    ws: new WebSocket(GEMINI_WS_URL),
    isReady: false,
    messageCount: 0,
    criticalCount: 0,
    adjustCount: 0,
    positiveCount: 0,
    startedAt: Date.now(),
  }

  session.ws.on("open", () => {
    console.log("[Gemini] Connected to Gemini Live API")

    // Send setup message with system instruction and config
    const setupMessage = {
      setup: {
        model: `models/${GEMINI_MODEL}`,
        generationConfig: {
          responseModalities: ["TEXT"],  // text-only output — no audio back
          speechConfig: undefined,
        },
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
      },
    }
    session.ws.send(JSON.stringify(setupMessage))
  })

  session.ws.on("message", (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString())

      // Setup complete acknowledgment
      if (msg.setupComplete) {
        session.isReady = true
        console.log("[Gemini] Setup complete, ready for audio")
        onReady()
        return
      }

      // Server content — coaching text responses
      if (msg.serverContent) {
        const parts = msg.serverContent.modelTurn?.parts || []
        for (const part of parts) {
          if (part.text && part.text.trim()) {
            session.messageCount++
            const text = part.text.trim()

            // Track urgency counts
            if (text.startsWith("🔴")) session.criticalCount++
            else if (text.startsWith("🟡")) session.adjustCount++
            else if (text.startsWith("🟢")) session.positiveCount++

            onText(text, Date.now())
          }
        }
      }
    } catch (e) {
      // Ignore parse errors on binary frames
    }
  })

  session.ws.on("error", (err) => {
    console.error("[Gemini] WebSocket error:", err.message)
    onError(err.message)
  })

  session.ws.on("close", (code, reason) => {
    console.log(`[Gemini] Disconnected: ${code} ${reason.toString()}`)
    session.isReady = false
  })

  return session
}

function sendAudioToGemini(session: GeminiSession, base64Pcm: string) {
  if (!session.isReady || session.ws.readyState !== WebSocket.OPEN) return

  const audioMessage = {
    realtimeInput: {
      mediaChunks: [
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64Pcm,
        },
      ],
    },
  }

  session.ws.send(JSON.stringify(audioMessage))
}

// ─── Browser WebSocket Server ───────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server: httpServer })

wss.on("connection", (browserWs, req) => {
  console.log(`[Proxy] Browser connected from ${req.socket.remoteAddress}`)

  let geminiSession: GeminiSession | null = null
  let lastAudioSentAt = 0

  browserWs.on("message", (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.type === "start") {
        // Browser wants to start a coaching session
        console.log("[Proxy] Starting Gemini coaching session", msg.leadInfo || "")

        geminiSession = connectToGemini(
          // onText — relay coaching back to browser
          (text, _serverTime) => {
            if (browserWs.readyState === WebSocket.OPEN) {
              const urgency = text.startsWith("🔴") ? "critical"
                : text.startsWith("🟡") ? "adjust"
                : text.startsWith("🟢") ? "positive"
                : "adjust"

              browserWs.send(JSON.stringify({
                type: "coaching",
                text,
                urgency,
                sentAt: lastAudioSentAt,
              }))
            }
          },
          // onReady
          () => {
            if (browserWs.readyState === WebSocket.OPEN) {
              browserWs.send(JSON.stringify({ type: "status", status: "connected" }))
            }
          },
          // onError
          (err) => {
            if (browserWs.readyState === WebSocket.OPEN) {
              browserWs.send(JSON.stringify({ type: "status", status: "error", message: err }))
            }
          }
        )
        return
      }

      if (msg.type === "audio" && geminiSession) {
        // Forward audio chunk to Gemini
        lastAudioSentAt = msg.sentAt || Date.now()
        sendAudioToGemini(geminiSession, msg.data)
        return
      }

      if (msg.type === "stop") {
        // End the coaching session
        if (geminiSession) {
          const summary = {
            type: "summary",
            totalMessages: geminiSession.messageCount,
            criticalCount: geminiSession.criticalCount,
            adjustCount: geminiSession.adjustCount,
            positiveCount: geminiSession.positiveCount,
            sessionDurationMs: Date.now() - geminiSession.startedAt,
          }

          if (browserWs.readyState === WebSocket.OPEN) {
            browserWs.send(JSON.stringify(summary))
          }

          if (geminiSession.ws.readyState === WebSocket.OPEN) {
            geminiSession.ws.close()
          }
          geminiSession = null
          console.log("[Proxy] Coaching session ended")
        }
        return
      }
    } catch (e) {
      // Ignore malformed messages
    }
  })

  browserWs.on("close", () => {
    console.log("[Proxy] Browser disconnected")
    if (geminiSession?.ws.readyState === WebSocket.OPEN) {
      geminiSession.ws.close()
    }
    geminiSession = null
  })

  browserWs.on("error", (err) => {
    console.error("[Proxy] Browser WS error:", err.message)
  })
})

httpServer.listen(WS_PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  🎙️  Gemini Live Coach — WebSocket Proxy         ║
║                                                  ║
║  Port: ${WS_PORT}                                    ║
║  Model: ${GEMINI_MODEL}        ║
║  Health: http://localhost:${WS_PORT}/health            ║
║                                                  ║
║  Waiting for Cold Call Cockpit connection...      ║
╚══════════════════════════════════════════════════╝
`)
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Proxy] Shutting down...")
  wss.clients.forEach((client) => client.close())
  httpServer.close()
  process.exit(0)
})
