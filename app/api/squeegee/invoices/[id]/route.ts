import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['draft', 'sent', 'paid', 'overdue'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = getAdmin()

    const updatePayload: Record<string, unknown> = { status }
    if (status === 'paid') {
      updatePayload.paid_at = new Date().toISOString()
    }

    const { data: invoice, error } = await supabase
      .from('squeegee_invoices')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Log activity
    const activityNote =
      status === 'sent'
        ? `Invoice ${invoice.invoice_number} marked as sent`
        : status === 'paid'
        ? `Invoice ${invoice.invoice_number} marked as paid — $${Number(invoice.amount).toFixed(2)}`
        : `Invoice ${invoice.invoice_number} status updated to ${status}`

    await supabase.from('squeegee_activity').insert({
      job_id: invoice.job_id,
      type: `invoice_${status}`,
      note: activityNote,
    })

    return NextResponse.json(invoice)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
