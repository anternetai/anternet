import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_id, client_id, amount, due_date, notes } = body

    if (!job_id || !client_id || !amount) {
      return NextResponse.json(
        { error: 'job_id, client_id, and amount are required' },
        { status: 400 }
      )
    }

    const supabase = getAdmin()
    const stripe = getStripe()

    // Generate invoice number: INV-{year}-{sequence}
    // Try using the sequence; fall back to count-based numbering
    let sequence: number
    const { data: seqData, error: seqError } = await supabase.rpc(
      'nextval_invoice_seq'
    )

    if (seqError || seqData === null) {
      // Fallback: use count of existing invoices + 1
      const { count, error: countError } = await supabase
        .from('squeegee_invoices')
        .select('*', { count: 'exact', head: true })

      sequence = countError ? (Date.now() % 100000) : (count ?? 0) + 1
    } else {
      sequence = seqData as number
    }

    const year = new Date().getFullYear()
    const invoiceNumber = `INV-${year}-${String(sequence).padStart(4, '0')}`

    // Create Stripe Price (one-time)
    const amountInCents = Math.round(Number(amount) * 100)
    const stripePrice = await stripe.prices.create({
      currency: 'usd',
      unit_amount: amountInCents,
      product_data: {
        name: 'Dr. Squeegee House Washing Services',
      },
    })

    // Create Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
    })

    // Save invoice to DB
    const { data: invoice, error: invoiceError } = await supabase
      .from('squeegee_invoices')
      .insert({
        job_id,
        client_id,
        invoice_number: invoiceNumber,
        amount: Number(amount),
        due_date: due_date || null,
        notes: notes || null,
        status: 'draft',
        stripe_payment_link: paymentLink.url,
        stripe_price_id: stripePrice.id,
        stripe_payment_link_id: paymentLink.id,
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Invoice insert error:', invoiceError)
      return NextResponse.json({ error: invoiceError.message }, { status: 500 })
    }

    // Log activity
    await supabase.from('squeegee_activity').insert({
      job_id,
      type: 'invoice_created',
      note: `Invoice ${invoiceNumber} created for $${Number(amount).toFixed(2)}`,
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (err) {
    console.error('Create invoice error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
