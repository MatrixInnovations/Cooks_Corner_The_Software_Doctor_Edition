import { describe, expect, it, vi } from 'vitest'
import { sendOrderConfirmation } from '../netlify/lib/email'
import { orderFromSession } from '../netlify/lib/orders'
import { handleStripeWebhook } from '../netlify/lib/webhook-handler'
import { ENV, SITE, memoryOrders, mockStripe } from './helpers'

const session = (over: Record<string, unknown> = {}) => ({
  id: 'cs_test_abcdef1234567890', created: 1792243200, mode: 'payment', payment_status: 'paid', amount_total: 16500, currency: 'usd',
  customer_details: { email: 'buyer@example.com', name: 'Pat Buyer', phone: '+17045550100' },
  collected_information: { shipping_details: { address: { line1: '1 Main St', city: 'Charlotte', state: 'NC', postal_code: '28269', country: 'US' } } },
  payment_intent: 'pi_test_1', subscription: null, customer: null,
  metadata: { meals: '10', proteins: 'Turkey Meatballs | Grilled Shrimp', vegetables: 'Steamed Broccoli', starches: 'Sweet Potato', sauces: 'Spank Sauce', fulfillment: 'delivery', allergy_note: 'peanuts', policies_accepted_at: '2026-10-17T12:00:00.000Z' },
  ...over,
})
const event = (s = session(), type = 'checkout.session.completed', id = 'evt_1') => ({ id, type, data: { object: s } })
const req = (body = '{}', sig: string | null = 't=1,v1=abc') =>
  new Request(`${SITE}/api/stripe-webhook`, { method: 'POST', body, headers: sig ? { 'stripe-signature': sig } : {} })

function setup(env: Record<string, string | undefined> = ENV) {
  const s = mockStripe()
  const orders = memoryOrders()
  const fetch = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof globalThis.fetch
  const d = { env, stripe: () => s.client, orders: async () => orders, fetch }
  return { s, orders, fetch, d }
}

describe('stripe-webhook', () => {
  it('400 without a signature header and when verification fails; nothing stored', async () => {
    const { s, orders, d } = setup()
    expect((await handleStripeWebhook(req('{}', null), d)).status).toBe(400)
    s.constructEvent.mockImplementation(() => { throw new Error('bad sig') })
    const r = await handleStripeWebhook(req(), d)
    expect(r.status).toBe(400)
    expect(orders.orders.size).toBe(0)
  })
  it('verifies against the RAW body with the webhook secret', async () => {
    const { s, d } = setup()
    s.constructEvent.mockReturnValue(event())
    await handleStripeWebhook(req('{"raw":true}', 't=1,v1=zz'), d)
    expect(s.constructEvent).toHaveBeenCalledWith('{"raw":true}', 't=1,v1=zz', ENV.STRIPE_WEBHOOK_SECRET)
  })
  it('503 when STRIPE_WEBHOOK_SECRET is missing', async () => {
    const { d } = setup({ SITE_URL: SITE })
    expect((await handleStripeWebhook(req(), d)).status).toBe(503)
  })
  it('stores a paid order from checkout.session.completed using server-set metadata', async () => {
    const { s, orders, d } = setup()
    s.constructEvent.mockReturnValue(event())
    const r = await handleStripeWebhook(req(), d)
    expect(r.status).toBe(200)
    const o = orders.orders.get('cs_test_abcdef1234567890')!
    expect(o).toMatchObject({
      status: 'paid', mode: 'payment', amountTotalCents: 16500, fulfillment: 'delivery', allergyNote: 'peanuts',
      customer: { email: 'buyer@example.com', name: 'Pat Buyer', phone: '+17045550100' },
      tray: { meals: 10, proteins: ['Turkey Meatballs', 'Grilled Shrimp'], vegetables: ['Steamed Broccoli'], starches: ['Sweet Potato'], sauces: ['Spank Sauce'] },
      deliveryAddress: { city: 'Charlotte' }, stripe: { paymentIntent: 'pi_test_1' },
    })
  })
  it('is idempotent: same event id and same session are processed once', async () => {
    const { s, orders, d } = setup()
    s.constructEvent.mockReturnValue(event())
    await handleStripeWebhook(req(), d)
    const again = await handleStripeWebhook(req(), d)
    expect((await again.json()).duplicate).toBe(true)
    s.constructEvent.mockReturnValue(event(session(), 'checkout.session.async_payment_succeeded', 'evt_2'))
    await handleStripeWebhook(req(), d)
    expect(orders.orders.size).toBe(1)
  })
  it('ignores unpaid sessions and unrelated events', async () => {
    const { s, orders, d } = setup()
    s.constructEvent.mockReturnValue(event(session({ payment_status: 'unpaid' })))
    expect((await (await handleStripeWebhook(req(), d)).json()).ignored).toBe('not_paid_yet')
    s.constructEvent.mockReturnValue(event(session(), 'customer.created', 'evt_3'))
    expect((await (await handleStripeWebhook(req(), d)).json()).ignored).toBe('customer.created')
    expect(orders.orders.size).toBe(0)
  })
  it('500 (so Stripe retries) if storage fails', async () => {
    const { s, d } = setup()
    s.constructEvent.mockReturnValue(event())
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await handleStripeWebhook(req(), { ...d, orders: async () => { throw new Error('blobs down') } })
    expect(r.status).toBe(500)
    spy.mockRestore()
  })
  it('stores subscriptions with their subscription id', () => {
    const o = orderFromSession(session({ mode: 'subscription', subscription: 'sub_test_1', payment_intent: null }) as any)
    expect(o.mode).toBe('subscription'); expect(o.stripe.subscription).toBe('sub_test_1')
  })
})

describe('confirmation email hook', () => {
  it('is OFF by default: webhook never calls the email provider', async () => {
    const { s, fetch, d } = setup()
    s.constructEvent.mockReturnValue(event())
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await handleStripeWebhook(req(), d)
    expect(fetch).not.toHaveBeenCalled()
    log.mockRestore()
  })
  it('sends only when enabled and configured; failures do not break the webhook', async () => {
    const env = { ...ENV, ORDER_EMAIL_ENABLED: 'true', RESEND_API_KEY: 're_fake', ORDER_EMAIL_FROM: 'orders@example.com' }
    const { s, fetch, orders, d } = setup(env)
    s.constructEvent.mockReturnValue(event())
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect((await handleStripeWebhook(req(), d)).status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
    const sent = JSON.parse((fetch as any).mock.calls[0][1].body)
    expect(sent.to).toEqual(['buyer@example.com']); expect(sent.text).toContain('$165')
    expect(orders.orders.size).toBe(1)
    // provider failure still 200
    const f2 = vi.fn(async () => { throw new Error('net') }) as unknown as typeof globalThis.fetch
    const o2 = memoryOrders(); s.constructEvent.mockReturnValue(event(session({ id: 'cs_test_other00000000' }), 'checkout.session.completed', 'evt_9'))
    expect((await handleStripeWebhook(req(), { ...d, orders: async () => o2, fetch: f2 })).status).toBe(200)
    expect(o2.orders.size).toBe(1)
    log.mockRestore()
  })
  it('reports why it did not send', async () => {
    const o = orderFromSession(session() as any)
    expect(await sendOrderConfirmation(o, { ...ENV })).toEqual({ sent: false, reason: 'disabled' })
    expect(await sendOrderConfirmation(o, { ...ENV, ORDER_EMAIL_ENABLED: 'true' })).toEqual({ sent: false, reason: 'not_configured' })
    const noMail = orderFromSession(session({ customer_details: null }) as any)
    expect(await sendOrderConfirmation(noMail, { ...ENV, ORDER_EMAIL_ENABLED: 'true', RESEND_API_KEY: 'k', ORDER_EMAIL_FROM: 'a@b.c' })).toEqual({ sent: false, reason: 'no_recipient' })
  })
})
