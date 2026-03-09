/**
 * AI Insights Chat API — Ask questions about your data
 *
 * POST { question: string, category?: string }
 * Returns conversational AI response (not stored).
 */

import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { buildDataSnapshot } from "@/lib/insights/data-snapshot"
import { buildChatPrompt } from "@/lib/insights/ai-prompt"

async function callClaude(
  system: string,
  userMessage: string
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  })

  if (!res.ok) {
    console.error("[insights-chat] Anthropic error:", res.status, await res.text())
    return null
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? null
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from("agency_clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const question = body.question as string
  if (!question?.trim()) {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 }
    )
  }

  const category = (body.category as string) || undefined

  // Build data snapshot
  const snapshot = await buildDataSnapshot(category)

  // Build chat prompt
  const { system, user: userPrompt } = buildChatPrompt(snapshot, question)

  // Call Claude
  const response = await callClaude(system, userPrompt)
  if (!response) {
    return NextResponse.json(
      { error: "AI chat failed — check API key" },
      { status: 500 }
    )
  }

  return NextResponse.json({ answer: response })
}
