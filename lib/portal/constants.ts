import type { LeadStatus, AppointmentStatus, PaymentStatus } from "./types"

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string }
> = {
  new: { label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  contacted: { label: "Contacted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  qualified: { label: "Qualified", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  appointment_booked: { label: "Booked", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  closed_won: { label: "Won", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  closed_lost: { label: "Lost", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
}

export const APPOINTMENT_STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string }
> = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  confirmed: { label: "Confirmed", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300" },
  showed: { label: "Showed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  no_show: { label: "No-Show", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  rescheduled: { label: "Rescheduled", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
}

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string }
> = {
  succeeded: { label: "Paid", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  failed: { label: "Failed", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
}

export const PIPELINE_STAGES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "appointment_booked",
  "closed_won",
  "closed_lost",
]
