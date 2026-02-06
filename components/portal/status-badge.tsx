import { cn } from "@/lib/utils"
import { LEAD_STATUS_CONFIG, APPOINTMENT_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from "@/lib/portal/constants"
import type { LeadStatus, AppointmentStatus, PaymentStatus } from "@/lib/portal/types"

interface StatusBadgeProps {
  status: string
  type: "lead" | "appointment" | "payment"
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  let config: { label: string; color: string } | undefined

  if (type === "lead") {
    config = LEAD_STATUS_CONFIG[status as LeadStatus]
  } else if (type === "appointment") {
    config = APPOINTMENT_STATUS_CONFIG[status as AppointmentStatus]
  } else {
    config = PAYMENT_STATUS_CONFIG[status as PaymentStatus]
  }

  if (!config) {
    return <span className="text-xs text-muted-foreground">{status}</span>
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.color
      )}
    >
      {config.label}
    </span>
  )
}
