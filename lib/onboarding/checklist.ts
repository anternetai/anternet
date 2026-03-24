// ─── Onboarding Checklist Types & Template ───────────────────────────────────

export interface OnboardingStep {
  id: string
  name: string
  description: string
  automated: boolean
  status: "pending" | "in_progress" | "complete" | "blocked"
  completedAt?: string
}

export const DEFAULT_CHECKLIST: OnboardingStep[] = [
  {
    id: "supabase_record",
    name: "Create Client Record",
    description: "Agency client created in Supabase",
    automated: true,
    status: "pending",
  },
  {
    id: "slack_channel",
    name: "Slack Channel",
    description: "Create #client-{name} channel",
    automated: true,
    status: "pending",
  },
  {
    id: "welcome_email",
    name: "Welcome Email",
    description: "Send onboarding welcome email via Resend",
    automated: true,
    status: "pending",
  },
  {
    id: "market_research",
    name: "Market Research",
    description: "AI generates local market research brief",
    automated: true,
    status: "pending",
  },
  {
    id: "ad_copy",
    name: "Ad Copy Drafts",
    description: "AI generates 3 Facebook ad copy variants",
    automated: true,
    status: "pending",
  },
  {
    id: "content_calendar",
    name: "Content Calendar",
    description: "30-day content calendar outline",
    automated: true,
    status: "pending",
  },
  {
    id: "meta_setup",
    name: "Meta Account Setup",
    description: "Client sets up Meta Business Manager",
    automated: false,
    status: "pending",
  },
  {
    id: "lead_form",
    name: "Lead Form Created",
    description: "Meta Lead Form created and tested",
    automated: false,
    status: "pending",
  },
  {
    id: "kickoff_call",
    name: "Kickoff Call",
    description: "Schedule and complete kickoff call",
    automated: false,
    status: "pending",
  },
  {
    id: "go_live",
    name: "Go Live",
    description: "Ads turned on, leads flowing",
    automated: false,
    status: "pending",
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Given a flat JSON blob stored on the client record, hydrate the checklist
 *  with real statuses — unknown step IDs are ignored, missing ones stay pending. */
export function hydrateChecklist(
  stored: Record<string, { status: OnboardingStep["status"]; completedAt?: string }> | null | undefined
): OnboardingStep[] {
  if (!stored) return DEFAULT_CHECKLIST.map((s) => ({ ...s }))

  return DEFAULT_CHECKLIST.map((step) => {
    const saved = stored[step.id]
    if (!saved) return { ...step }
    return { ...step, status: saved.status, completedAt: saved.completedAt }
  })
}

/** Return count of completed automated steps so the API can report progress. */
export function automatedProgress(checklist: OnboardingStep[]): {
  completed: number
  total: number
  percent: number
} {
  const automated = checklist.filter((s) => s.automated)
  const completed = automated.filter((s) => s.status === "complete").length
  const total = automated.length
  return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
}
