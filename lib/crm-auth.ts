/**
 * CRM Cookie Authentication
 *
 * Shared HMAC-based cookie signing/verification for the CRM password gate.
 * Used by both the login route and middleware.
 */

import crypto from "crypto"

function getSecret(): string {
  const secret = process.env.CRM_COOKIE_SECRET || process.env.CRM_PASSWORD
  if (!secret) {
    console.warn("[crm-auth] Neither CRM_COOKIE_SECRET nor CRM_PASSWORD is set — using weak fallback")
  }
  return secret || "fallback-secret"
}

export function signCrmCookie(value: string): string {
  const secret = getSecret()
  const signature = crypto.createHmac("sha256", secret).update(value).digest("hex")
  return `${value}.${signature}`
}

export function verifyCrmCookieSignature(signed: string): boolean {
  const secret = getSecret()
  const lastDot = signed.lastIndexOf(".")
  if (lastDot === -1) return false
  const value = signed.slice(0, lastDot)
  const signature = signed.slice(lastDot + 1)
  const expected = crypto.createHmac("sha256", secret).update(value).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}
