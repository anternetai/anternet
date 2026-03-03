import { google } from "googleapis"

function getOAuth2Client() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL || "https://homefieldhub.com"}/api/google/callback`
  )
  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })
  return client
}

function getCalendar() {
  return google.calendar({ version: "v3", auth: getOAuth2Client() })
}

interface JobEventData {
  client_name: string
  address: string
  service_type: string
  client_phone?: string | null
  price?: number | null
  appointment_date: string // "2026-03-15"
  appointment_time?: string | null // "14:30"
}

export async function createCalendarEvent(job: JobEventData) {
  const calendar = getCalendar()
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary"

  const timeStr = job.appointment_time || "09:00"
  const startDateTime = `${job.appointment_date}T${timeStr}:00`
  const startDate = new Date(startDateTime)
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // 2 hour block

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`
  const serviceName = job.service_type !== "Pending Quote" ? job.service_type : "Service"

  const description = [
    `Client: ${job.client_name}`,
    `Phone: ${job.client_phone || "N/A"}`,
    `Service: ${serviceName}`,
    `Price: $${job.price != null ? Number(job.price).toFixed(2) : "TBD"}`,
    "",
    `Directions: ${mapsUrl}`,
  ].join("\n")

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Dr. Squeegee — ${job.client_name}`,
      location: job.address,
      description,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "America/New_York",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "America/New_York",
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 30 }],
      },
    },
  })

  return event.data.id
}

export async function updateCalendarEvent(
  eventId: string,
  job: JobEventData
) {
  const calendar = getCalendar()
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary"

  const timeStr = job.appointment_time || "09:00"
  const startDateTime = `${job.appointment_date}T${timeStr}:00`
  const startDate = new Date(startDateTime)
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`
  const serviceName = job.service_type !== "Pending Quote" ? job.service_type : "Service"

  const description = [
    `Client: ${job.client_name}`,
    `Phone: ${job.client_phone || "N/A"}`,
    `Service: ${serviceName}`,
    `Price: $${job.price != null ? Number(job.price).toFixed(2) : "TBD"}`,
    "",
    `Directions: ${mapsUrl}`,
  ].join("\n")

  await calendar.events.update({
    calendarId,
    eventId,
    requestBody: {
      summary: `Dr. Squeegee — ${job.client_name}`,
      location: job.address,
      description,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "America/New_York",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "America/New_York",
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 30 }],
      },
    },
  })
}

export async function deleteCalendarEvent(eventId: string) {
  const calendar = getCalendar()
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary"

  await calendar.events.delete({
    calendarId,
    eventId,
  })
}

export function getAuthUrl() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL || "https://homefieldhub.com"}/api/google/callback`
  )

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  })
}

export async function getTokensFromCode(code: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL || "https://homefieldhub.com"}/api/google/callback`
  )

  const { tokens } = await client.getToken(code)
  return tokens
}
