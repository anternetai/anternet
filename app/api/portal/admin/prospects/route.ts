import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized", status: 401 }

  const { data: adminClient } = await supabase
    .from("agency_clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!adminClient || adminClient.role !== "admin") {
    return { error: "Forbidden", status: 403 }
  }

  return { user }
}

// Simple CSV parser that handles quoted fields
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)

  for (const line of lines) {
    if (line.trim().length === 0) continue

    const fields: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (inQuotes) {
        if (char === '"') {
          // Check for escaped quote (double quote)
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i++ // skip next quote
          } else {
            inQuotes = false
          }
        } else {
          current += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ",") {
          fields.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
    }

    fields.push(current.trim())
    rows.push(fields)
  }

  return rows
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const auth = await verifyAdmin(supabase)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const outcome = searchParams.get("outcome")
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)))
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from("crm_prospects")
      .select("*", { count: "exact" })

    if (outcome) {
      query = query.eq("call_outcome", outcome)
    }

    if (search) {
      // Search by name, email, or phone
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: prospects, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      prospects: prospects ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    })
  } catch (err) {
    console.error("GET /api/portal/admin/prospects error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const auth = await verifyAdmin(supabase)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const contentType = request.headers.get("content-type") ?? ""

    // CSV import via multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      return handleCSVImport(request, supabase)
    }

    // Single prospect creation via JSON
    const body = await request.json()
    const { name, phone, email, notes, call_outcome, follow_up_at } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const { data: prospect, error } = await supabase
      .from("crm_prospects")
      .insert({
        name: name.trim(),
        phone: phone?.trim() ?? null,
        email: email?.trim() ?? null,
        notes: notes?.trim() ?? null,
        call_outcome: call_outcome ?? null,
        follow_up_at: follow_up_at ?? null,
      })
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prospect }, { status: 201 })
  } catch (err) {
    console.error("POST /api/portal/admin/prospects error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function handleCSVImport(
  request: Request,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      )
    }

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length < 2) {
      return NextResponse.json(
        { error: "CSV must have a header row and at least one data row" },
        { status: 400 }
      )
    }

    // Parse headers (lowercase, trimmed)
    const headers = rows[0].map((h) => h.toLowerCase().trim())

    // Require at least a name column
    const nameIdx = headers.indexOf("name")
    if (nameIdx === -1) {
      return NextResponse.json(
        { error: 'CSV must have a "name" column' },
        { status: 400 }
      )
    }

    const phoneIdx = headers.indexOf("phone")
    const emailIdx = headers.indexOf("email")
    const notesIdx = headers.indexOf("notes")

    const batchId = `import_${Date.now()}`
    const errors: string[] = []
    const prospects: Array<{
      name: string
      phone: string | null
      email: string | null
      notes: string | null
      import_batch: string
    }> = []

    // Parse data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      const name = row[nameIdx]?.trim()
      if (!name) {
        errors.push(`Row ${rowNum}: Missing name`)
        continue
      }

      prospects.push({
        name,
        phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() || null : null,
        email: emailIdx >= 0 ? row[emailIdx]?.trim() || null : null,
        notes: notesIdx >= 0 ? row[notesIdx]?.trim() || null : null,
        import_batch: batchId,
      })
    }

    if (prospects.length === 0) {
      return NextResponse.json(
        { imported: 0, errors },
        { status: 200 }
      )
    }

    // Bulk insert in batches of 500 to avoid payload limits
    let imported = 0
    const batchSize = 500

    for (let i = 0; i < prospects.length; i += batchSize) {
      const batch = prospects.slice(i, i + batchSize)
      const { error } = await supabase.from("crm_prospects").insert(batch)

      if (error) {
        errors.push(`Batch starting at row ${i + 2}: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    return NextResponse.json({ imported, errors, batch_id: batchId })
  } catch (err) {
    console.error("CSV import error:", err)
    return NextResponse.json(
      { error: "Failed to process CSV file" },
      { status: 500 }
    )
  }
}
