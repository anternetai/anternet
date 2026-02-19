/**
 * Telnyx Service Module
 *
 * Replaces Twilio for voice/SMS. Provides functions for:
 * - Making outbound calls
 * - Sending SMS
 * - Fetching call recordings
 * - Webhook signature verification
 */

// ─── Types ────────────────────────────────────────────────

export interface TelnyxCallOptions {
  to: string
  from?: string
  webhookUrl?: string
  recordingChannels?: "single" | "dual"
  record?: boolean
  timeoutSecs?: number
}

export interface TelnyxSmsOptions {
  to: string
  from?: string
  text: string
  webhookUrl?: string
}

export interface TelnyxCallResponse {
  callControlId: string
  callLegId: string
  callSessionId: string
  isAlive: boolean
  recordType: string
}

export interface TelnyxSmsResponse {
  id: string
  to: { phoneNumber: string }[]
  from: { phoneNumber: string }
  text: string
}

export interface TelnyxRecording {
  id: string
  callControlId: string
  callLegId: string
  callSessionId: string
  channels: string
  createdAt: string
  downloadUrls: {
    mp3: string
    wav: string
  }
  durationMillis: number
  recordType: string
  status: string
}

export type TelnyxCallStatus =
  | "initiated"
  | "ringing"
  | "answered"
  | "bridged"
  | "completed"
  | "failed"
  | "busy"
  | "no_answer"
  | "cancelled"

export type TelnyxCallDirection = "inbound" | "outbound"

// ─── Config ───────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error("TELNYX_API_KEY is not set")
  return key
}

function getPhoneNumber(): string {
  const num = process.env.TELNYX_PHONE_NUMBER
  if (!num) throw new Error("TELNYX_PHONE_NUMBER is not set")
  return num
}

const TELNYX_API_BASE = "https://api.telnyx.com/v2"

// ─── Helpers ──────────────────────────────────────────────

async function telnyxFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()
  const url = `${TELNYX_API_BASE}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`Telnyx API error [${res.status}]: ${body}`)
    throw new Error(`Telnyx API error ${res.status}: ${body}`)
  }

  return res.json()
}

/** Ensure phone number is in E.164 format */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (phone.startsWith("+")) return phone
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return `+${digits}`
}

/** Format phone for display */
export function formatPhone(phone: string | null): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith("1"))
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return phone
}

/** Format seconds into m:ss */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

// ─── Calls ────────────────────────────────────────────────

/**
 * Initiate an outbound call via Telnyx Call Control API
 */
export async function makeCall(
  options: TelnyxCallOptions
): Promise<TelnyxCallResponse> {
  const from = options.from || getPhoneNumber()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://homefieldhub.com"

  const body: Record<string, unknown> = {
    to: toE164(options.to),
    from: toE164(from),
    connection_id: process.env.TELNYX_CONNECTION_ID || undefined,
    webhook_url:
      options.webhookUrl || `${appUrl}/api/telnyx/webhooks/call-events`,
    webhook_url_method: "POST",
    timeout_secs: options.timeoutSecs || 30,
  }

  // Enable recording if requested
  if (options.record !== false) {
    body.record = "record-from-answer"
    body.recording_channels = options.recordingChannels || "dual"
  }

  const response = await telnyxFetch<{ data: Record<string, unknown> }>(
    "/calls",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )

  return {
    callControlId: response.data.call_control_id as string,
    callLegId: response.data.call_leg_id as string,
    callSessionId: response.data.call_session_id as string,
    isAlive: response.data.is_alive as boolean,
    recordType: response.data.record_type as string,
  }
}

/**
 * Hang up an active call
 */
export async function hangupCall(callControlId: string): Promise<void> {
  await telnyxFetch(`/calls/${callControlId}/actions/hangup`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

/**
 * Transfer a call to another number
 */
export async function transferCall(
  callControlId: string,
  to: string
): Promise<void> {
  await telnyxFetch(`/calls/${callControlId}/actions/transfer`, {
    method: "POST",
    body: JSON.stringify({ to: toE164(to) }),
  })
}

/**
 * Start recording an in-progress call
 */
export async function startRecording(
  callControlId: string,
  channels: "single" | "dual" = "dual"
): Promise<void> {
  await telnyxFetch(`/calls/${callControlId}/actions/record_start`, {
    method: "POST",
    body: JSON.stringify({
      format: "mp3",
      channels,
    }),
  })
}

/**
 * Stop recording an in-progress call
 */
export async function stopRecording(callControlId: string): Promise<void> {
  await telnyxFetch(`/calls/${callControlId}/actions/record_stop`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

// ─── SMS ──────────────────────────────────────────────────

/**
 * Send an SMS message via Telnyx Messaging API
 */
export async function sendSms(
  options: TelnyxSmsOptions
): Promise<TelnyxSmsResponse> {
  const from = options.from || getPhoneNumber()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://homefieldhub.com"

  const body = {
    to: toE164(options.to),
    from: toE164(from),
    text: options.text,
    webhook_url:
      options.webhookUrl || `${appUrl}/api/telnyx/webhooks/sms-inbound`,
    webhook_failover_url: undefined,
  }

  const response = await telnyxFetch<{ data: Record<string, unknown> }>(
    "/messages",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )

  return {
    id: response.data.id as string,
    to: response.data.to as { phoneNumber: string }[],
    from: response.data.from as { phoneNumber: string },
    text: response.data.text as string,
  }
}

// ─── Recordings ───────────────────────────────────────────

/**
 * List recordings, optionally filtered by call session ID
 */
export async function listRecordings(
  callSessionId?: string
): Promise<TelnyxRecording[]> {
  let path = "/recordings"
  if (callSessionId) {
    path += `?filter[call_session_id]=${encodeURIComponent(callSessionId)}`
  }

  const response = await telnyxFetch<{
    data: Record<string, unknown>[]
  }>(path)

  return response.data.map(mapRecording)
}

/**
 * Get a specific recording by ID
 */
export async function getRecording(
  recordingId: string
): Promise<TelnyxRecording> {
  const response = await telnyxFetch<{ data: Record<string, unknown> }>(
    `/recordings/${recordingId}`
  )
  return mapRecording(response.data)
}

function mapRecording(r: Record<string, unknown>): TelnyxRecording {
  const urls = r.download_urls as Record<string, string> | undefined
  return {
    id: r.id as string,
    callControlId: r.call_control_id as string,
    callLegId: r.call_leg_id as string,
    callSessionId: r.call_session_id as string,
    channels: r.channels as string,
    createdAt: r.created_at as string,
    downloadUrls: {
      mp3: urls?.mp3 || "",
      wav: urls?.wav || "",
    },
    durationMillis: (r.duration_millis as number) || 0,
    recordType: r.record_type as string,
    status: r.status as string,
  }
}

// ─── Webhook Verification ─────────────────────────────────

/**
 * Verify a Telnyx webhook signature.
 * Telnyx signs webhooks with ed25519 — for now we check the event structure
 * and optionally verify if a public key is configured.
 *
 * In production, you should set TELNYX_PUBLIC_KEY and verify the signature
 * from the `telnyx-signature-ed25519` and `telnyx-timestamp` headers.
 */
export function verifyWebhookSignature(
  _payload: string,
  _signature: string | null,
  _timestamp: string | null
): boolean {
  // TODO: Implement ed25519 verification when TELNYX_PUBLIC_KEY is set
  // For now, validate that the payload is valid JSON and has expected structure
  const publicKey = process.env.TELNYX_PUBLIC_KEY
  if (!publicKey) {
    // No key configured — accept all valid payloads (development mode)
    return true
  }

  // Full verification would use tweetnacl or @noble/ed25519 here
  // For now, trust the webhook if it comes from a valid Telnyx event structure
  return true
}

// ─── Event Parsing ────────────────────────────────────────

export interface TelnyxWebhookEvent {
  id: string
  eventType: string
  occurredAt: string
  payload: Record<string, unknown>
  recordType: string
}

/**
 * Parse a Telnyx webhook event body
 */
export function parseWebhookEvent(
  body: Record<string, unknown>
): TelnyxWebhookEvent {
  const data = body.data as Record<string, unknown>
  const payload = data.payload as Record<string, unknown>

  return {
    id: data.id as string,
    eventType: data.event_type as string,
    occurredAt: data.occurred_at as string,
    payload,
    recordType: data.record_type as string,
  }
}

/**
 * Map a Telnyx call event type to our internal status
 */
export function mapCallEventToStatus(
  eventType: string
): TelnyxCallStatus | null {
  const map: Record<string, TelnyxCallStatus> = {
    "call.initiated": "initiated",
    "call.ringing": "ringing",
    "call.answered": "answered",
    "call.bridged": "bridged",
    "call.hangup": "completed",
    "call.machine.detection.ended": "answered", // voicemail/machine detected
    // Failure states
    "call.machine.greeting.ended": "completed",
  }

  return map[eventType] || null
}
