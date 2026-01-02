import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phone, name, projectType } = await request.json()

    // VAPI API Key - should be in env vars
    const VAPI_API_KEY = process.env.VAPI_API_KEY
    const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID

    if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID) {
      console.log('VAPI not configured yet')
      return NextResponse.json({ success: false, message: 'VAPI not configured' }, { status: 200 })
    }

    // Format phone number (remove non-digits, add +1 if needed)
    let formattedPhone = phone.replace(/\D/g, '')
    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone
    }

    // Trigger VAPI outbound call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        customer: {
          number: formattedPhone,
          name: name,
        },
        assistantOverrides: {
          variableValues: {
            customerName: name,
            projectType: projectType,
          }
        }
      }),
    })

    if (!vapiResponse.ok) {
      const error = await vapiResponse.text()
      console.error('VAPI error:', error)
      return NextResponse.json({ success: false, error }, { status: 500 })
    }

    const data = await vapiResponse.json()
    return NextResponse.json({ success: true, callId: data.id })

  } catch (error) {
    console.error('Error triggering call:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to trigger call' },
      { status: 500 }
    )
  }
}
