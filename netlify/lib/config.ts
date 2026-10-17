import type { Env } from './types'

export const LAUNCH_SITE_URL = 'https://cookscornerllc.com'

export type CheckoutConfig =
  | { ok: true; secretKey: string; siteUrl: string; allowedOrigins: string[] }
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
  // Launch switch: SITE_LAUNCH=true pins the public origin to the real domain (same flag as tools/launch-switch.mjs). Otherwise SITE_URL (or Netlify's URL).
  const raw = env.SITE_LAUNCH === 'true' ? LAUNCH_SITE_URL : env.SITE_URL?.trim() || env.URL?.trim()
  if (!raw) return { ok: false, code: 'not_configured', message: 'SITE_URL is not set.' }
  let siteUrl: string
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' && u.hostname !== 'localhost') return { ok: false, code: 'not_configured', message: 'SITE_URL must be https.' }
    siteUrl = u.origin
  } catch {
    return { ok: false, code: 'not_configured', message: 'SITE_URL is not a valid URL.' }
  }
  return { ok: true, secretKey: key, siteUrl, allowedOrigins: allowedOrigins(siteUrl, env) }
}

/**
 * Origins that may call the checkout endpoint (and that Stripe sends the customer back to). Always the configured site URL plus the real domain
 * (apex and www), so the custom domain works while SITE_URL still points at the preview, and the preview keeps working until launch.
 * Optional extras: ALLOWED_ORIGINS="https://a.example,https://b.example". Under SITE_LAUNCH the site URL is the real domain, so the preview origin is refused.
 */
export function allowedOrigins(siteUrl: string, env: Env): string[] {
  const set = new Set<string>([siteUrl, LAUNCH_SITE_URL, LAUNCH_SITE_URL.replace('https://', 'https://www.')])
  for (const x of (env.ALLOWED_ORIGINS ?? '').split(',').map((v) => v.trim()).filter(Boolean)) {
    try { const u = new URL(x); if (u.protocol === 'https:') set.add(u.origin) } catch { /* ignore bad entry */ }
  }
  return [...set]
}

export const int = (v: string | undefined, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d
}

const METHODS = new Set(['card', 'link', 'cashapp', 'klarna', 'affirm', 'us_bank_account', 'amazon_pay'])
/** CHECKOUT_PAYMENT_METHODS="card,link" (comma list). Default and any invalid value: card only. */
export function paymentMethodTypes(env: Env): ('card' | 'link' | 'cashapp' | 'klarna' | 'affirm' | 'us_bank_account' | 'amazon_pay')[] {
  const list = (env.CHECKOUT_PAYMENT_METHODS ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const ok = list.length > 0 && list.every((x) => METHODS.has(x))
  return (ok ? list : ['card']) as ReturnType<typeof paymentMethodTypes>
}
