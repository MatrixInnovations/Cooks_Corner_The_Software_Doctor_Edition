import { sendOrderConfirmation } from './email'
import { fail, json, readBody } from './http'
import { orderFromSession, type OrderStore } from './orders'
import type { Env, Stripe, StripeClient } from './types'

export type WebhookDeps = {
  env: Env
  stripe: () => StripeClient
  orders: () => Promise<OrderStore>
  fetch?: typeof fetch
  now?: () => Date
}

const PAID_EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])

/** POST /api/stripe-webhook: verify signature on the RAW body, then store paid orders (idempotent by event id and session id). */
export async function handleStripeWebhook(req: Request, deps: WebhookDeps): Promise<Response> {
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.', undefined, { allow: 'POST' })
  const secret = deps.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) return fail(503, 'not_configured', 'Webhook is not configured.')
  const sig = req.headers.get('stripe-signature')
  if (!sig) return fail(400, 'missing_signature', 'Missing Stripe-Signature header.')
  const raw = await readBody(req, 512 * 1024)
  if (raw === null) return fail(413, 'too_large', 'Payload too large.')

  let event: Stripe.Event
  try {
    event = deps.stripe().webhooks.constructEvent(raw, sig, secret)
  } catch {
    return fail(400, 'invalid_signature', 'Signature verification failed.')
  }

  if (!PAID_EVENTS.has(event.type)) return json(200, { received: true, ignored: event.type })

  const session = event.data.object as Stripe.Checkout.Session
  // a card payment is "paid" at completion; delayed methods complete as "unpaid" and arrive later as async_payment_succeeded
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return json(200, { received: true, ignored: 'not_paid_yet' })

  try {
    const store = await deps.orders()
    if (await store.hasEvent(event.id)) return json(200, { received: true, duplicate: true })
    const existing = await store.getOrder(session.id)
    if (!existing) {
      const order = orderFromSession(session, deps.now?.())
      await store.putOrder(order)
      const mail = await sendOrderConfirmation(order, deps.env, deps.fetch)
      console.log('stripe-webhook: order stored', session.id.slice(-8), 'email:', mail.sent ? 'sent' : mail.reason)
    }
    await store.markEvent(event.id)
    return json(200, { received: true })
  } catch (e) {
    console.error('stripe-webhook: storage error', (e as Error).name)
    return fail(500, 'storage_error', 'Could not store the order. Stripe will retry.')
  }
}
