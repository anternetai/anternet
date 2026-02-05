"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface ClientData {
  id: string
  first_name: string
  last_name: string
  legal_business_name: string
  business_ein: string
  working_hours: string
  business_phone: string
  street_address: string
  city: string
  state: string
  postal_code: string
  email_for_notifications: string
  cell_phone_for_notifications: string
  business_email_for_leads: string
  advertising_area: string
  time_zone: string
  website_url: string
  image_sharing_url: string
  onboarding_call_booked: boolean
  questions: string
  // New fields we'll collect on the call
  calendar_id?: string
  working_hours_start?: number
  working_hours_end?: number
  appointment_duration?: number
  timezone?: string
  working_days?: string
  differentiator?: string
  offer?: string
  facebook_page_id?: string
  ad_account_id?: string
  stripe_customer_id?: string
  onboarding_status?: string
  [key: string]: string | number | boolean | undefined | null
}

interface CheckItem {
  id: string
  label: string
  done: boolean
}

export default function CallChecklistPage() {
  const params = useParams()
  const clientId = params.id as string
  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [notes, setNotes] = useState("")

  // Call collection fields (not yet in DB)
  const [callData, setCallData] = useState({
    calendar_id: "",
    calendar_type: "google", // google | calendly | none
    working_hours_start: 8,
    working_hours_end: 17,
    appointment_duration: 60,
    timezone: "",
    working_days: "Mon-Fri",
    differentiator: "",
    offer: "Free 15-min inspection",
    display_name: "", // how they want biz name in texts
    service_type: "",
    service_cities: "",
    facebook_bm_access: false,
    facebook_page_id: "",
    ad_account_id: "",
    has_payment_method: false,
    ad_copy_approved: false,
    explained_ai_texting: false,
    explained_emergency: false,
    explained_billing: false,
    go_live_approved: false,
  })

  const [checklist, setChecklist] = useState<CheckItem[]>([
    { id: "verify_info", label: "Verified business name & service area", done: false },
    { id: "calendar_shared", label: "Client shared Google Calendar with me", done: false },
    { id: "working_hours", label: "Collected working hours & availability", done: false },
    { id: "facebook_access", label: "Got Facebook BM / Page access", done: false },
    { id: "differentiator", label: "Got their differentiator & offer", done: false },
    { id: "ad_approval", label: "Ad creative approved", done: false },
    { id: "explained_system", label: "Explained how AI texting works (Sam)", done: false },
    { id: "explained_emergency", label: "Explained emergency lead protocol", done: false },
    { id: "explained_billing", label: "Explained billing ($200/appt + $50/day)", done: false },
    { id: "payment_collected", label: "Payment method collected", done: false },
    { id: "go_live", label: "Got approval to go live", done: false },
  ])

  useEffect(() => {
    fetch(`/api/internal/client/${clientId}`)
      .then(r => r.json())
      .then(data => {
        setClient(data)
        setCallData(prev => ({
          ...prev,
          timezone: data.time_zone || "",
          display_name: data.legal_business_name || "",
          service_cities: data.advertising_area || "",
          calendar_id: data.calendar_id || "",
          differentiator: data.differentiator || "",
          offer: data.offer || "Free 15-min inspection",
          working_hours_start: data.working_hours_start || 8,
          working_hours_end: data.working_hours_end || 17,
          appointment_duration: data.appointment_duration || 60,
          working_days: data.working_days || "Mon-Fri",
        }))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [clientId])

  const toggleCheck = (id: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    ))
  }

  const saveToSupabase = async () => {
    setSaving(true)
    try {
      await fetch(`/api/internal/client/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendar_id: callData.calendar_id,
          working_hours_start: callData.working_hours_start,
          working_hours_end: callData.working_hours_end,
          appointment_duration: callData.appointment_duration,
          timezone: callData.timezone,
          working_days: callData.working_days,
          differentiator: callData.differentiator,
          offer: callData.offer,
          facebook_page_id: callData.facebook_page_id,
          ad_account_id: callData.ad_account_id,
          onboarding_status: "onboarding_call_completed",
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error("Save failed:", e)
    }
    setSaving(false)
  }

  const copyAllData = () => {
    const summary = `
ONBOARDING CALL SUMMARY
========================
Client: ${client?.legal_business_name}
Owner: ${client?.first_name} ${client?.last_name}
Email: ${client?.email_for_notifications}
Phone: ${client?.cell_phone_for_notifications}
Location: ${client?.city}, ${client?.state}
Service Area: ${callData.service_cities}

CALENDAR
Calendar Type: ${callData.calendar_type}
Calendar ID: ${callData.calendar_id}
Working Days: ${callData.working_days}
Hours: ${callData.working_hours_start}:00 - ${callData.working_hours_end}:00
Appointment Duration: ${callData.appointment_duration} min
Timezone: ${callData.timezone}

SERVICE DETAILS
Display Name (for texts): ${callData.display_name}
Service Type: ${callData.service_type}
Differentiator: ${callData.differentiator}
Offer: ${callData.offer}

FACEBOOK
Page ID: ${callData.facebook_page_id}
Ad Account: ${callData.ad_account_id}

CHECKLIST
${checklist.map(c => `${c.done ? "[x]" : "[ ]"} ${c.label}`).join("\n")}

NOTES
${notes}
    `.trim()
    navigator.clipboard.writeText(summary)
    alert("Copied to clipboard!")
  }

  const steps = [
    { title: "1. Verify Info", icon: "1" },
    { title: "2. Calendar", icon: "2" },
    { title: "3. Hours", icon: "3" },
    { title: "4. Service", icon: "4" },
    { title: "5. Facebook", icon: "5" },
    { title: "6. Payment", icon: "6" },
    { title: "7. Explain", icon: "7" },
    { title: "8. Launch", icon: "8" },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading client data...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-red-400">Client not found: {clientId}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{client.legal_business_name}</h1>
            <p className="text-sm text-gray-400">
              {client.first_name} {client.last_name} &middot; {client.cell_phone_for_notifications}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyAllData}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg border border-gray-700"
            >
              Copy All
            </button>
            <button
              onClick={saveToSupabase}
              disabled={saving}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-sm rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save to DB"}
            </button>
          </div>
        </div>

        {/* Step Navigation */}
        <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {steps.map((step, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                activeStep === i
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {step.title}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Step 1: Verify Info */}
            {activeStep === 0 && (
              <Section title="Verify Client Info" subtitle="Confirm what we captured from the onboard form">
                <InfoRow label="Business Name" value={client.legal_business_name} />
                <InfoRow label="Owner" value={`${client.first_name} ${client.last_name}`} />
                <InfoRow label="Phone" value={client.cell_phone_for_notifications} />
                <InfoRow label="Email" value={client.email_for_notifications} />
                <InfoRow label="Location" value={`${client.city}, ${client.state}`} />
                <InfoRow label="Service Area" value={client.advertising_area} />
                <InfoRow label="Working Hours" value={client.working_hours} />
                <InfoRow label="Timezone" value={client.time_zone} />
                <InfoRow label="Website" value={client.website_url} />
                <InfoRow label="EIN" value={client.business_ein || "Not provided"} />

                <div className="mt-4 pt-4 border-t border-gray-800">
                  <label className="block text-sm text-gray-400 mb-1">
                    How do they want their business name said in texts?
                  </label>
                  <input
                    type="text"
                    value={callData.display_name}
                    onChange={e => setCallData({ ...callData, display_name: e.target.value })}
                    placeholder="e.g. Smith Roofing (not Smith Roofing LLC)"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-sm text-gray-400 mb-1">
                    What services are they running ads for?
                  </label>
                  <input
                    type="text"
                    value={callData.service_type}
                    onChange={e => setCallData({ ...callData, service_type: e.target.value })}
                    placeholder="e.g. Roofing, Gutters, HVAC"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-sm text-gray-400 mb-1">
                    Confirm service area cities
                  </label>
                  <input
                    type="text"
                    value={callData.service_cities}
                    onChange={e => setCallData({ ...callData, service_cities: e.target.value })}
                    placeholder="e.g. Charlotte, Concord, Huntersville"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </Section>
            )}

            {/* Step 2: Calendar Access */}
            {activeStep === 1 && (
              <Section title="Calendar Access" subtitle="SMS bot books directly to their Google Calendar. You need edit access.">
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">What calendar do they use?</label>
                  <div className="flex gap-3">
                    {(["google", "calendly", "none"] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setCallData({ ...callData, calendar_type: type })}
                        className={`px-4 py-2 rounded-lg text-sm capitalize ${
                          callData.calendar_type === type
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        {type === "none" ? "Neither" : type === "google" ? "Google Calendar" : "Calendly"}
                      </button>
                    ))}
                  </div>
                </div>

                {callData.calendar_type === "calendly" && (
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4 text-sm text-yellow-200">
                    Calendly sits on top of Google Calendar. You STILL need their Google Calendar shared with you.
                    The SMS bot books directly to Google Calendar, not through Calendly. Confirm their Calendly
                    syncs to the same Google Calendar they share with you.
                  </div>
                )}

                {callData.calendar_type === "none" && (
                  <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3 mb-4 text-sm text-orange-200">
                    Walk them through creating a Google account / Google Calendar right now on the call.
                    Then do the sharing step.
                  </div>
                )}

                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-white mb-2">Walk them through sharing (DO THIS NOW):</p>
                  <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                    <li>Open Google Calendar &rarr; Settings (gear icon)</li>
                    <li>Click their calendar name on the left</li>
                    <li>&ldquo;Share with specific people&rdquo; &rarr; Add people</li>
                    <li>Enter YOUR Google email (the one connected to n8n OAuth)</li>
                    <li>Permission: &ldquo;Make changes to events&rdquo;</li>
                    <li>Click Send</li>
                  </ol>
                </div>

                <label className="block text-sm text-gray-400 mb-1">
                  Their Google Calendar email (this is the calendarId)
                </label>
                <input
                  type="email"
                  value={callData.calendar_id}
                  onChange={e => setCallData({ ...callData, calendar_id: e.target.value })}
                  placeholder="e.g. mike@mikesroofing.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">This is what the calendar workflow uses to read/write their calendar</p>
              </Section>
            )}

            {/* Step 3: Working Hours */}
            {activeStep === 2 && (
              <Section title="Working Hours & Scheduling" subtitle="Calendar availability checker + SMS bot both use this">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Working Days</label>
                    <select
                      value={callData.working_days}
                      onChange={e => setCallData({ ...callData, working_days: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="Mon-Fri">Mon - Fri</option>
                      <option value="Mon-Sat">Mon - Sat</option>
                      <option value="Mon-Sun">Mon - Sun (7 days)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Timezone</label>
                    <select
                      value={callData.timezone}
                      onChange={e => setCallData({ ...callData, timezone: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="America/New_York">Eastern</option>
                      <option value="America/Chicago">Central</option>
                      <option value="America/Denver">Mountain</option>
                      <option value="America/Los_Angeles">Pacific</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Earliest Appointment</label>
                    <select
                      value={callData.working_hours_start}
                      onChange={e => setCallData({ ...callData, working_hours_start: parseInt(e.target.value) })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    >
                      {[6, 7, 8, 9, 10].map(h => (
                        <option key={h} value={h}>{h}:00 AM</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Latest Appointment Start</label>
                    <select
                      value={callData.working_hours_end}
                      onChange={e => setCallData({ ...callData, working_hours_end: parseInt(e.target.value) })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    >
                      {[15, 16, 17, 18, 19, 20].map(h => (
                        <option key={h} value={h}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? "PM" : "AM"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Appointment Duration</label>
                    <select
                      value={callData.appointment_duration}
                      onChange={e => setCallData({ ...callData, appointment_duration: parseInt(e.target.value) })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 bg-gray-800 rounded-lg p-3 text-sm text-gray-300">
                  <strong>Ask:</strong> &ldquo;What time is the earliest you&apos;d want an appointment? And what&apos;s the latest you&apos;d want one to start?&rdquo;
                </div>
              </Section>
            )}

            {/* Step 4: Service Details */}
            {activeStep === 3 && (
              <Section title="Service & Messaging" subtitle="SMS bot uses these in conversations with leads">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      What makes them different? (Differentiator)
                    </label>
                    <input
                      type="text"
                      value={callData.differentiator}
                      onChange={e => setCallData({ ...callData, differentiator: e.target.value })}
                      placeholder="e.g. 10-year warranty, free cleanup, same-day estimates"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      SMS bot says: &ldquo;We include [this] that others charge extra for&rdquo;
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      What&apos;s the offer / lead magnet?
                    </label>
                    <input
                      type="text"
                      value={callData.offer}
                      onChange={e => setCallData({ ...callData, offer: e.target.value })}
                      placeholder="e.g. Free 15-min roof inspection"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This goes in ad copy AND what the SMS bot promises leads
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300">
                    <strong>Ask:</strong> &ldquo;If a homeowner asks why they should pick you over the next guy, what&apos;s your answer?&rdquo;
                  </div>
                </div>
              </Section>
            )}

            {/* Step 5: Facebook */}
            {activeStep === 4 && (
              <Section title="Facebook Access" subtitle="No access = no ads = no leads. Do this ON the call.">
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-sm text-red-200">
                  <strong>Do NOT leave this as homework.</strong> Walk them through it now via screen share.
                </div>

                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-white mb-2">Option A: They have Business Manager</p>
                  <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                    <li>Go to business.facebook.com &rarr; Settings &rarr; Partners</li>
                    <li>Click &ldquo;Add&rdquo;</li>
                    <li>Enter YOUR Business Manager ID: <span className="text-yellow-300 font-mono">[ADD YOUR BM ID]</span></li>
                    <li>Grant: Ad account + Page access</li>
                  </ol>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-white mb-2">Option B: No BM, just a Page</p>
                  <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                    <li>Go to their Facebook Page &rarr; Settings &rarr; Page Access</li>
                    <li>Add you as Admin</li>
                    <li>You&apos;ll create the BM and ad account yourself</li>
                  </ol>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Facebook Page ID or URL</label>
                    <input
                      type="text"
                      value={callData.facebook_page_id}
                      onChange={e => setCallData({ ...callData, facebook_page_id: e.target.value })}
                      placeholder="Page ID or facebook.com/..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Ad Account ID</label>
                    <input
                      type="text"
                      value={callData.ad_account_id}
                      onChange={e => setCallData({ ...callData, ad_account_id: e.target.value })}
                      placeholder="act_XXXXXXXXX"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </Section>
            )}

            {/* Step 6: Payment */}
            {activeStep === 5 && (
              <Section title="Payment & Billing" subtitle="Stripe charges $200/booked appointment automatically">
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-white mb-2">What to say:</p>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>&bull; &ldquo;$200 per booked appointment, auto-charged to your card on file&rdquo;</li>
                    <li>&bull; &ldquo;Ad spend is $50/day, billed separately each week&rdquo;</li>
                    <li>&bull; &ldquo;A booked appointment means: confirmed homeowner, scheduled date/time, confirmation text sent&rdquo;</li>
                    <li>&bull; &ldquo;If they no-show or cancel before the appointment, you don&apos;t get charged&rdquo;</li>
                  </ul>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <input
                    type="checkbox"
                    checked={callData.has_payment_method}
                    onChange={e => setCallData({ ...callData, has_payment_method: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm text-gray-300">Payment method collected (or will collect via Stripe link after call)</span>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  After the call: Create Stripe Customer, save stripe_customer_id to Supabase
                </p>
              </Section>
            )}

            {/* Step 7: Explain System */}
            {activeStep === 6 && (
              <Section title="Explain the System" subtitle="They need to understand the flow so they're not confused">
                <div className="bg-gray-800 rounded-lg p-4 mb-4 font-mono text-sm text-gray-300">
                  <p className="text-green-400 mb-1">Lead fills out Facebook form</p>
                  <p className="pl-4">&darr;</p>
                  <p className="text-blue-400 pl-4 mb-1">AI texts within 90 sec as &ldquo;Sam from {callData.display_name || "[Company]"}&rdquo;</p>
                  <p className="pl-8">&darr;</p>
                  <p className="text-yellow-400 pl-8 mb-1">Sam qualifies: storm damage? leaking? timeline?</p>
                  <p className="pl-12">&darr;</p>
                  <p className="text-purple-400 pl-12 mb-1">Sam books directly into YOUR calendar</p>
                  <p className="pl-16">&darr;</p>
                  <p className="text-white pl-16">You show up &rarr; We charge $200</p>
                </div>

                <div className="space-y-3">
                  <CheckBox
                    checked={callData.explained_ai_texting}
                    onChange={v => setCallData({ ...callData, explained_ai_texting: v })}
                    label={`"Our AI texts as Sam from ${callData.display_name || "your company"}. It's not a generic bot."`}
                  />
                  <CheckBox
                    checked={callData.explained_emergency}
                    onChange={v => setCallData({ ...callData, explained_emergency: v })}
                    label='"If someone has an active leak, you get an emergency alert. Call them within 30 min."'
                  />
                  <CheckBox
                    checked={callData.explained_billing}
                    onChange={v => setCallData({ ...callData, explained_billing: v })}
                    label='"If someone texts STOP, they are automatically removed. Compliance is handled."'
                  />
                  <CheckBox
                    checked={callData.ad_copy_approved}
                    onChange={v => setCallData({ ...callData, ad_copy_approved: v })}
                    label="Showed ad creative and got approval"
                  />
                </div>
              </Section>
            )}

            {/* Step 8: Go Live */}
            {activeStep === 7 && (
              <Section title="Go-Live Approval" subtitle="Final confirmation before you hang up">
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-white mb-2">What to say:</p>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>&bull; &ldquo;I&apos;ll have your ads live within 24-48 hours&rdquo;</li>
                    <li>&bull; &ldquo;You&apos;ll get a message in Slack when we&apos;re live&rdquo;</li>
                    <li>&bull; &ldquo;First leads typically come in within 2-3 days&rdquo;</li>
                    <li>&bull; &ldquo;I&apos;ll check in with you Friday to see how the first few went&rdquo;</li>
                    <li>&bull; &ldquo;Any questions before we launch?&rdquo;</li>
                  </ul>
                </div>

                <CheckBox
                  checked={callData.go_live_approved}
                  onChange={v => setCallData({ ...callData, go_live_approved: v })}
                  label="Client approved go-live"
                />

                <div className="mt-6 p-4 bg-green-900/30 border border-green-700 rounded-lg">
                  <p className="text-sm font-medium text-green-200 mb-2">After the call, do this:</p>
                  <ol className="text-sm text-green-300 space-y-1 list-decimal list-inside">
                    <li>Hit &ldquo;Save to DB&rdquo; above to store everything collected</li>
                    <li>Create Facebook Lead Form with webhook to n8n</li>
                    <li>Create campaign: $50/day, {callData.service_cities || "service area"}, homeowners 30-65</li>
                    <li>Enable Housing Special Ad Category</li>
                    <li>Submit ads for review</li>
                    <li>Create Stripe Customer, save ID to Supabase</li>
                    <li>Send test lead to verify flow</li>
                    <li>Message in Slack when live</li>
                  </ol>
                </div>
              </Section>
            )}
          </div>

          {/* Sidebar - Checklist + Notes */}
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sticky top-28">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Checklist</h3>
              <div className="space-y-2">
                {checklist.map(item => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleCheck(item.id)}
                      className="w-4 h-4 mt-0.5 rounded"
                    />
                    <span className={`text-sm ${item.done ? "text-green-400 line-through" : "text-gray-400 group-hover:text-gray-300"}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-800">
                <p className="text-xs text-gray-500">
                  {checklist.filter(c => c.done).length}/{checklist.length} completed
                </p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">Call Notes</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anything else from the call..."
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none"
              />
            </div>

            {/* Quick Info Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-xs text-gray-500 space-y-1">
              <p><strong className="text-gray-400">Client ID:</strong> {client.id}</p>
              <p><strong className="text-gray-400">Phone:</strong> {client.cell_phone_for_notifications}</p>
              <p><strong className="text-gray-400">Email:</strong> {client.email_for_notifications}</p>
            </div>
          </div>
        </div>

        {/* Step Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg disabled:opacity-30"
          >
            &larr; Previous
          </button>
          <button
            onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
            disabled={activeStep === steps.length - 1}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm rounded-lg disabled:opacity-30"
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
      <p className="text-sm text-gray-400 mb-4">{subtitle}</p>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-white font-medium">{value || "—"}</span>
    </div>
  )
}

function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-5 h-5 mt-0.5 rounded"
      />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  )
}
