import { NextRequest } from "next/server"

/**
 * Verify cron/ops route authorization.
 * Accepts either:
 *   - `Authorization: Bearer <CRON_SECRET>` (Vercel Cron)
 *   - `x-cron-secret: <CRON_SECRET>` (n8n / manual calls)
 */
export function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = req.headers.get("authorization")
  if (authHeader === `Bearer ${cronSecret}`) return true

  const xCronSecret = req.headers.get("x-cron-secret")
  if (xCronSecret === cronSecret) return true

  return false
}
