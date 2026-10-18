import { describe, expect, it, vi } from 'vitest'
import { buildKitchenTicket, escapeHtml, notifyRecipients, sendKitchenTicket } from '../netlify/lib/kitchen-ticket'
import { orderFromSession } from '../netlify/lib/orders'
import { handleStripeWebhook } from '../netlify/lib/webhook-handler'
import { ENV, SITE, memoryOrders, mockStripe } from './helpers'

const session = (over: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) => ({
  id: 'cs_live_abcdef1234567890', created: 1792243200, mode: 'payment', payment_status: 'paid', amount_total: 11600, currency: 'usd',
  customer_details: { email: 'buyer@example.com', name: 'Pat Buyer', phone: '+17045550100' },
  collected_information: { shipping_details: { address: { line1: '1 Main St', line2: 'Apt 2', city: 'Charlotte', state: 'NC', postal_code: '28269', country: 'US' } } },
  payment_intent: 'pi_3Abc', subscription: null, customer: null,
  metadata: { meals: '8', proteins: 'Turkey Meatballs | Grilled Shrimp', vegetables: 'Steamed Broccoli', starches: 'Sweet Potato', sauces: 'Spank Sauce', fulfillment: 'pickup', allergy_note: '', policies_accepted_at: '2026-10-17T12:00:00.000Z', ...meta },
  ...over,
})
const order = (over = {}, meta = {}) => orderFromSession(session(over, meta) as any, new Date('2026-10-17T19:12:00Z'))
const ev = (s: unknown, id = 'evt_1', type = 'checkout.session.completed') => ({ id, type, data: { object: s } })
const req = () => new Request(`${SITE}/api/stripe-webhook`, { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=abc' } })
const ON = { ...ENV, ORDER_NOTIFY_ENABLED: 'true', ORDER_NOTIFY_TO: 'chef@example.com', RESEND_API_KEY: 're_fake', ORDER_EMAIL_FROM: 'orders@example.com' }
const okFetch = () => vi.fn(async () => new Response('{}', { status: 200 }))
const bodyOf = (f: any, i = 0) => JSON.parse(f.mock.calls[i][1].body)

describe('buildKitchenTicket', () => {
  it('pickup: type at top, subject, items, NONE allergy, stripe link, ET time', () => {
    const t = buildKitchenTicket(order())
    expect(t.subject).toBe('New order: Pat Buyer, Pickup day to be scheduled')
    expect(t.text.split('\n')[0]).toBe('You have a new order, Marsaun.'); expect(t.text.split('\n')[2]).toBe('*** PICKUP ***'); expect(t.text).toContain('Hit reply to email the customer directly, or open the payment in Stripe.')
    expect(t.text).toContain('Order 1234567890')
    expect(t.text).toContain('Sat, Oct 17, 3:12 PM ET')
    expect(t.text).toContain('Proteins: Turkey Meatballs, Grilled Shrimp')
    expect(t.text).toContain('Vegetables: Steamed Broccoli')
    expect(t.text).toContain('Starches: Sweet Potato')
    expect(t.text).toContain('Sauces: Spank Sauce')
    expect(t.text).toContain('ALLERGY NOTE: NONE')
    expect(t.text).toContain('Phone: +17045550100')
    expect(t.text).toContain('Email: buyer@example.com')
    expect(t.text).toContain('Amount: $116 paid')
    expect(t.text).toContain('https://dashboard.stripe.com/payments/pi_3Abc')
    expect(t.text).not.toContain('Main St')
    expect(t.html).toContain('PICKUP')
    expect(t.replyTo).toBe('buyer@example.com')
  })
  it('delivery: address shown, allergy highlighted, test sessions link to the test dashboard', () => {
    const t = buildKitchenTicket(order({ id: 'cs_test_zzzzzzzzzz1234', amount_total: 13150 }, { fulfillment: 'delivery', meals: '8', allergy_note: 'peanuts' }))
    expect(t.subject).toBe('New order: Pat Buyer, Delivery day to be scheduled')
    expect(t.text.split('\n')[2]).toBe('*** DELIVERY ***')
    expect(t.text).toContain('1 Main St'); expect(t.text).toContain('Charlotte, NC 28269')
    expect(t.text).toContain('*** ALLERGY NOTE: PEANUTS ***')
    expect(t.html).toContain('ALLERGY NOTE: peanuts')
    expect(t.html).toContain('border:3px solid #dc2626')
    expect(t.text).toContain('https://dashboard.stripe.com/test/payments/pi_3Abc')
  })
  it('delivery without an address says so; missing customer fields are handled', () => {
    const t = buildKitchenTicket(order({ collected_information: null, customer_details: null }, { fulfillment: 'delivery' }))
    expect(t.text).toContain('ADDRESS MISSING'); expect(t.text).toContain('Phone: not given'); expect(t.subject).toBe('New order: customer, Delivery day to be scheduled')
    expect(t.replyTo).toBeNull()
  })
  it('escapes customer-controlled fields in HTML and strips newlines from text/subject', () => {
    const evil = '<img src=x onerror=alert(1)>"\'&'
    const t = buildKitchenTicket(order({ customer_details: { email: 'a@b.co', name: `Eve\r\nBcc: x@y.z ${evil}`, phone: evil } }, { allergy_note: `<script>alert(1)</script>\nline2` }))
    expect(t.html).not.toContain('<script>'); expect(t.html).not.toContain('<img'); expect(t.html).not.toContain('onerror=alert(1)>')
    expect(t.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(t.html).toContain('&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;')
    expect(t.subject).not.toMatch(/[\r\n]/); expect(t.replyTo).toBe('a@b.co')
    expect(t.text).toContain('LINE2')
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
  })
  it('a hostile customer email never becomes reply_to', () => {
    expect(buildKitchenTicket(order({ customer_details: { email: 'a@b.co, evil@x.co', name: 'N', phone: null } })).replyTo).toBeNull()
  })
  it('flags subscriptions', () => {
    expect(buildKitchenTicket(order({ mode: 'subscription', subscription: 'sub_1' })).text).toContain('MONTHLY SUBSCRIPTION')
  })
})

describe('sendKitchenTicket', () => {
  it('reports disabled / not_configured and never calls Resend', async () => {
    const f = okFetch(); const o = order()
    expect(await sendKitchenTicket(o, { ...ENV }, f as any)).toEqual({ sent: false, reason: 'disabled' })
    expect(await sendKitchenTicket(o, { ...ON, ORDER_NOTIFY_ENABLED: undefined }, f as any)).toEqual({ sent: false, reason: 'disabled' })
    expect(await sendKitchenTicket(o, { ...ON, ORDER_NOTIFY_TO: undefined }, f as any)).toEqual({ sent: false, reason: 'disabled' })
    expect(await sendKitchenTicket(o, { ...ON, RESEND_API_KEY: undefined }, f as any)).toEqual({ sent: false, reason: 'not_configured' })
    expect(await sendKitchenTicket(o, { ...ON, ORDER_EMAIL_FROM: undefined }, f as any)).toEqual({ sent: false, reason: 'not_configured' })
    expect(await sendKitchenTicket(o, { ...ON, ORDER_NOTIFY_TO: 'not-an-email' }, f as any)).toEqual({ sent: false, reason: 'not_configured' })
    expect(f).not.toHaveBeenCalled()
  })
  it('posts one Resend request to the owner with html + text', async () => {
    const f = okFetch()
    expect(await sendKitchenTicket(order(), ON, f as any)).toEqual({ sent: true })
    expect(f).toHaveBeenCalledTimes(1)
    expect((f as any).mock.calls[0][0]).toBe('https://api.resend.com/emails')
    expect((f as any).mock.calls[0][1].headers.authorization).toBe('Bearer re_fake')
    const b = bodyOf(f)
    expect(b.to).toEqual(['chef@example.com']); expect(b.from).toBe('orders@example.com')
    expect(b.text).toContain('*** PICKUP ***'); expect(b.html).toContain('<html'); expect(b.reply_to).toBe('buyer@example.com')
  })
  it('maps provider errors and network errors to a reason, never throws', async () => {
    expect(await sendKitchenTicket(order(), ON, (async () => new Response('x', { status: 422 })) as any)).toEqual({ sent: false, reason: 'provider_422' })
    expect(await sendKitchenTicket(order(), ON, (async () => { throw new Error('net') }) as any)).toEqual({ sent: false, reason: 'network_error' })
  })
  it('parses a recipient list (valid only, max 5)', () => {
    expect(notifyRecipients({ ORDER_NOTIFY_TO: 'a@b.co, bad, c@d.co' })).toEqual(['a@b.co', 'c@d.co'])
    expect(notifyRecipients({ ORDER_NOTIFY_TO: Array.from({ length: 9 }, (_, i) => `u${i}@x.co`).join(',') })).toHaveLength(5)
  })
})

describe('webhook + kitchen ticket', () => {
  const setup = (env: Record<string, string | undefined>) => {
    const s = mockStripe(); const orders = memoryOrders(); const fetch = okFetch()
    return { s, orders, fetch, d: { env, stripe: () => s.client, orders: async () => orders, fetch: fetch as any } }
  }
  it('default (flag off): no kitchen email, no status recorded', async () => {
    const { s, orders, fetch, d } = setup(ENV)
    s.constructEvent.mockReturnValue(ev(session()))
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect((await handleStripeWebhook(req(), d)).status).toBe(200)
    expect(fetch).not.toHaveBeenCalled()
    expect(orders.orders.get('cs_live_abcdef1234567890')!.kitchenTicket).toBeUndefined()
  })
  it('sends exactly one ticket per order, records status, skips duplicate events and replays', async () => {
    const { s, orders, fetch, d } = setup(ON)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    s.constructEvent.mockReturnValue(ev(session()))
    await handleStripeWebhook(req(), d)
    await handleStripeWebhook(req(), d) // same event id
    s.constructEvent.mockReturnValue(ev(session(), 'evt_2', 'checkout.session.async_payment_succeeded'))
    await handleStripeWebhook(req(), d) // same session, new event
    expect(fetch).toHaveBeenCalledTimes(1) // customer confirmation is off here, so this is the ticket only
    expect(bodyOf(fetch).to).toEqual(['chef@example.com'])
    expect(orders.orders.get('cs_live_abcdef1234567890')!.kitchenTicket).toMatchObject({ sent: true })
  })
  it('unpaid sessions send nothing', async () => {
    const { s, fetch, d } = setup(ON)
    s.constructEvent.mockReturnValue(ev(session({ payment_status: 'unpaid' })))
    await handleStripeWebhook(req(), d)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('provider failure or a throwing fetch: still 200, order kept, failure recorded', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const a = setup(ON); a.d.fetch = (async () => new Response('x', { status: 500 })) as any
    a.s.constructEvent.mockReturnValue(ev(session()))
    expect((await handleStripeWebhook(req(), a.d)).status).toBe(200)
    expect(a.orders.orders.get('cs_live_abcdef1234567890')!.kitchenTicket).toMatchObject({ sent: false, reason: 'provider_500' })
    const b = setup(ON); b.d.fetch = (async () => { throw new Error('boom') }) as any
    b.s.constructEvent.mockReturnValue(ev(session()))
    expect((await handleStripeWebhook(req(), b.d)).status).toBe(200)
    expect(b.orders.orders.get('cs_live_abcdef1234567890')!.kitchenTicket).toMatchObject({ sent: false, reason: 'network_error' })
  })
  it('failing to record the status does not fail the webhook', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {})
    const { s, orders, d } = setup(ON)
    let puts = 0; const put = orders.putOrder.bind(orders)
    orders.putOrder = async (o) => { if (++puts > 1) throw new Error('blobs'); await put(o) }
    s.constructEvent.mockReturnValue(ev(session()))
    expect((await handleStripeWebhook(req(), d)).status).toBe(200)
    expect(orders.orders.size).toBe(1)
  })
  it('customer confirmation stays independent: both emails when both enabled', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const { s, fetch, d } = setup({ ...ON, ORDER_EMAIL_ENABLED: 'true' })
    s.constructEvent.mockReturnValue(ev(session()))
    await handleStripeWebhook(req(), d)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(bodyOf(fetch, 0).to).toEqual(['chef@example.com']); expect(bodyOf(fetch, 1).to).toEqual(['buyer@example.com'])
    expect(bodyOf(fetch, 1).subject).toBe("Your Cook's Corner order")
  })
})
