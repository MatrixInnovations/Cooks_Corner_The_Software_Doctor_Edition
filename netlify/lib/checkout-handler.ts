import { parseCheckoutRequest } from './cart'
import { checkoutConfig, int } from './config'
import { clientIp, fail, json, readBody } from './http'
import { rateLimit, type CounterStore } from './ratelimit'
import { buildSessionParams } from './session'
import type { Env, StripeClient } from './types'

export type CheckoutDeps = {
  env: Env
  /** called only after config is validated, so tests never need a real key */
  stripe: (secretKey: string) => StripeClient
  limiter: CounterStore
  now?: () => Date
}

const MAX_BODY = 8 * 1024

/** POST /api/create-checkout-session: validate, price from the catalog, create a Stripe Checkout Session, return its URL. */
export async function handleCreateCheckout(req: Request, deps: CheckoutDeps): Promise<Response> {
  const cfg = checkoutConfig(deps.env)
  const origin = req.headers.get('origin')
  const cors: Record<string, string> = cfg.ok && origin && origin === cfg.siteUrl ? { 'access-control-allow-origin': origin, vary: 'origin' } : {}

  if (req.method === 'OPTIONS') {
    return cors['access-control-allow-origin']
      ? new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type, idempotency-key', 'access-control-max-age': '600' } })
      : new Response(null, { status: 403 })
  }
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.', undefined, { allow: 'POST, OPTIONS' })
  if (!cfg.ok) return fail(cfg.code === 'live_key_blocked' ? 500 : 503, cfg.code, cfg.message)
  if (origin && origin !== cfg.siteUrl) return fail(403, 'bad_origin', 'Origin not allowed.')
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return fail(415, 'unsupported_media_type', 'Send JSON.', undefined, cors)

  const limit = int(deps.env.CHECKOUT_RATE_LIMIT_MAX, 10)
  const windowSec = int(deps.env.CHECKOUT_RATE_LIMIT_WINDOW_SEC, 600)
  const rl = await rateLimit(deps.limiter, `checkout:${clientIp(req)}`, limit, windowSec * 1000, (deps.now?.() ?? new Date()).getTime())
  if (!rl.allowed) return fail(429, 'rate_limited', 'Too many checkout attempts. Try again soon.', undefined, { ...cors, 'retry-after': String(rl.retryAfterSec) })

  const raw = await readBody(req, MAX_BODY)
  if (raw === null) return fail(413, 'too_large', 'Request is too large.', undefined, cors)
  let body: unknown
  try { body = JSON.parse(raw) } catch { return fail(400, 'invalid_json', 'Request body is not valid JSON.', undefined, cors) }

  const parsed = parseCheckoutRequest(body)
  if (!parsed.ok) return fail(400, 'invalid_request', 'Please check your order.', parsed.errors, cors)

  const idem = req.headers.get('idempotency-key')
  const options = idem && /^[A-Za-z0-9_-]{8,64}$/.test(idem) ? { idempotencyKey: idem } : undefined
  try {
    const stripe = deps.stripe(cfg.secretKey)
    const session = await stripe.checkout.sessions.create(buildSessionParams(parsed.value, cfg.siteUrl, deps.now?.()), options)
    if (!session.url) return fail(502, 'no_session_url', 'Could not start checkout.', undefined, cors)
    return json(200, { id: session.id, url: session.url }, cors)
  } catch (e) {
    // never echo Stripe's message back (it can contain request details); log only the type/code
    const err = e as { type?: string; code?: string; statusCode?: number }
    console.error('create-checkout-session: stripe error', err.type, err.code, err.statusCode)
    return fail(502, 'stripe_error', 'We could not start checkout. Please try again or order by DM.', undefined, cors)
  }
}
