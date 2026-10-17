import type { Env } from './types'

export type CheckoutConfig =
  | { ok: true; secretKey: string; siteUrl: string }
  | { ok: false; code: string; message: string }

/**
 * Reads checkout settings from env. Never logs or returns the key.
 * Guard: live keys (sk_live_/rk_live_) are refused unless STRIPE_ALLOW_LIVE=true, so a test deploy can never charge real cards by accident.
 */
export function checkoutConfig(env: Env): CheckoutConfig {
  const key = env.STRIPE_SECRET_KEY?.trim()
  if (!key) return { ok: false, code: 'not_configured', message: 'Checkout is not configured yet.' }
  if (!/^(sk|rk)_(test|live)_/.test(key)) return { ok: false, code: 'not_configured', message: 'Checkout is not configured correctly.' }
  if (/^(sk|rk)_live_/.test(key) && env.STRIPE_ALLOW_LIVE !== 'true')
    return { ok: false, code: 'live_key_blocked', message: 'A live Stripe key is set but live mode is not enabled (STRIPE_ALLOW_LIVE).' }
  const raw = env.SITE_URL?.trim() || env.URL?.trim()
  if (!raw) return { ok: false, code: 'not_configured', message: 'SITE_URL is not set.' }
  let siteUrl: string
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' && u.hostname !== 'localhost') return { ok: false, code: 'not_configured', message: 'SITE_URL must be https.' }
    siteUrl = u.origin
  } catch {
    return { ok: false, code: 'not_configured', message: 'SITE_URL is not a valid URL.' }
  }
  return { ok: true, secretKey: key, siteUrl }
}

export const int = (v: string | undefined, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d
}
