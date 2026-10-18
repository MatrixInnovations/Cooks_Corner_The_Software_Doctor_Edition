import { describe, expect, it, vi } from 'vitest'
import { handleCreateCheckout } from '../netlify/lib/checkout-handler'
import { sendOrderConfirmation } from '../netlify/lib/email'
import { buildKitchenTicket } from '../netlify/lib/kitchen-ticket'
import { orderFromSession } from '../netlify/lib/orders'
import { memoryStore } from '../netlify/lib/ratelimit'
import { buildSessionParams } from '../netlify/lib/session'
import { handleStripeWebhook } from '../netlify/lib/webhook-handler'
import { parseCheckoutRequest } from '../netlify/lib/cart'
import { etInstant } from '../src/shared/schedule'
import { ENV, SITE, goodCart, memoryCapacity, memoryOrders, mockStripe, post } from './helpers'

const at = (day: string, h = 12) => etInstant(day, h, 0)
// Mon Oct 19 10 AM ET: earliest Wed Oct 21 (Monday and Wednesday have no reservation issue)
const MON = at('2026-10-19', 10)
const created = (d: Date) => Math.floor(d.getTime() / 1000)
const ENV_NO_RESERVE = { ...ENV, RESERVED_SLOTS_MONDAY: '0' }

describe('checkout: assigned day in session metadata', () => {
  const run = async (over: Record<string, unknown> = {}, now = MON, env: Record<string, string | undefined> = ENV) => {
    const s = mockStripe()
    const cap = memoryCapacity()
    const d = { env, stripe: () => s.client, limiter: memoryStore(), capacity: async () => cap.store, now: () => now, ...over }
    const r = await handleCreateCheckout(post(goodCart()), d)
    return { s, cap, r, params: (s.create.mock.calls[0] as any[] | undefined)?.[0] }
  }
  it('records the earliest day in metadata, the success URL and the checkout message; returns it to the page', async () => {
    const { r, params } = await run()
    expect((await r.json()).assignedDay).toBe('2026-10-21')
    expect(params.metadata.assigned_day).toBe('2026-10-21')
    expect(params.success_url).toContain('&day=2026-10-21#build')
    expect(params.custom_text.submit.message).toContain('Wednesday, Oct 21')
    expect(params.subscription_data).toBeUndefined()
    expect(params.payment_intent_data.metadata.assigned_day).toBe('2026-10-21')
  })
  it('an order after Sunday 9 AM rolls over to Monday and gets Wednesday; before 9 AM gets Tuesday', async () => {
    expect((await run({}, at('2026-10-18', 9))).params.metadata.assigned_day).toBe('2026-10-21')
    expect((await run({}, at('2026-10-18', 8))).params.metadata.assigned_day).toBe('2026-10-20')
  })
  it('skips a day that already has 10 paid orders', async () => {
    const s = mockStripe(); const cap = memoryCapacity()
    for (let i = 0; i < 10; i++) await cap.store.claim('2026-10-21', `o${i}`, 10)
    const r = await handleCreateCheckout(post(goodCart()), { env: ENV, stripe: () => s.client, limiter: memoryStore(), capacity: async () => cap.store, now: () => MON })
    expect((await r.json()).assignedDay).toBe('2026-10-22')
  })
  it('Monday with 5 reserved subscriber slots: the 6th one-off order is offered Tuesday', async () => {
    const sat = at('2026-10-17', 10)
    const s = mockStripe(); const cap = memoryCapacity()
    const go = async () => (await (await handleCreateCheckout(post(goodCart()), { env: ENV, stripe: () => s.client, limiter: memoryStore(), capacity: async () => cap.store, now: () => sat })).json()).assignedDay
    for (let i = 0; i < 5; i++) { expect(await go()).toBe('2026-10-19'); await cap.store.claim('2026-10-19', `paid${i}`, 5) }
    expect(await go()).toBe('2026-10-20')
  })
  it('with RESERVED_SLOTS_MONDAY=0 Monday takes all 10', async () => {
    const sat = at('2026-10-17', 10)
    const cap = memoryCapacity()
    for (let i = 0; i < 9; i++) await cap.store.claim('2026-10-19', `o${i}`, 10)
    const { params } = await run({ capacity: async () => cap.store }, sat, ENV_NO_RESERVE)
    expect(params.metadata.assigned_day).toBe('2026-10-19')
  })
  it('counts Stripe subscriptions for Monday only when STRIPE_COUNT_SUBSCRIPTIONS=true', async () => {
    const sat = at('2026-10-17', 10)
    const s = mockStripe()
    ;(s.client as any).subscriptions = { list: vi.fn(async () => ({ data: Array.from({ length: 10 }, (_, i) => ({ id: `sub_${i}`, status: 'active', metadata: {} })), has_more: false })) }
    const cap = memoryCapacity()
    const base = { stripe: () => s.client, limiter: memoryStore(), capacity: async () => cap.store, now: () => sat }
    // off: static reservation of 5 -> Monday has room
    expect((await (await handleCreateCheckout(post(goodCart()), { env: ENV, ...base })).json()).assignedDay).toBe('2026-10-19')
    expect((s.client as any).subscriptions.list).not.toHaveBeenCalled()
    // on: 10 active subscriptions fill Monday -> Tuesday
    const r = await handleCreateCheckout(post(goodCart()), { env: { ...ENV, STRIPE_COUNT_SUBSCRIPTIONS: 'true' }, ...base, limiter: memoryStore() })
    expect((await r.json()).assignedDay).toBe('2026-10-20')
  })
  it('a capacity lookup failure never blocks checkout (rules-only earliest day)', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { r, params } = await run({ capacity: async () => { throw new Error('blobs down') } })
    expect(r.status).toBe(200)
    expect(params.metadata.assigned_day).toBe('2026-10-21')
    err.mockRestore()
  })
  it('without a capacity store it still records the rules-only day', async () => {
    const { params } = await run({ capacity: undefined })
    expect(params.metadata.assigned_day).toBe('2026-10-21')
  })
  it('503 fully_booked (no Stripe call) when no day in the lookahead has room', async () => {
    const s = mockStripe()
    const full = { count: async () => 99, claim: async () => 'full' as const }
    const r = await handleCreateCheckout(post(goodCart()), { env: ENV, stripe: () => s.client, limiter: memoryStore(), capacity: async () => full, now: () => MON })
    expect(r.status).toBe(503)
    expect((await r.json()).error.code).toBe('fully_booked')
    expect(s.create).not.toHaveBeenCalled()
  })
  it('subscription metadata carries the day too', () => {
    const p = parseCheckoutRequest({ ...goodCart(), mode: 'subscription' })
    if (!p.ok) throw new Error('bad cart')
    const params = buildSessionParams(p.value, SITE, MON, ['card'], '2026-10-21')
    expect(params.subscription_data?.metadata?.assigned_day).toBe('2026-10-21')
    expect(buildSessionParams(p.value, SITE, MON, ['card'], 'junk').metadata?.assigned_day).toBeUndefined()
  })
})

const session = (id: string, createdAt: Date, meta: Record<string, string> = {}, over: Record<string, unknown> = {}) => ({
  id, created: created(createdAt), mode: 'payment', payment_status: 'paid', amount_total: 15000, currency: 'usd',
  customer_details: { email: 'buyer@example.com', name: 'Pat Buyer', phone: '+17045550100' },
  payment_intent: 'pi_test_1', subscription: null, customer: null,
  metadata: { meals: '10', proteins: 'Turkey Meatballs', vegetables: '', starches: '', sauces: '', fulfillment: 'pickup', allergy_note: '', policies_accepted_at: createdAt.toISOString(), ...meta },
  ...over,
})
const wreq = (body = '{}') => new Request(`${SITE}/api/stripe-webhook`, { method: 'POST', body, headers: { 'stripe-signature': 't=1,v1=abc' } })

function wh(env: Record<string, string | undefined> = ENV) {
  const s = mockStripe(); const orders = memoryOrders(); const cap = memoryCapacity()
  const deps = { env, stripe: () => s.client, orders: async () => orders, capacity: async () => cap.store, fetch: vi.fn(async () => new Response('{}')) as unknown as typeof fetch }
  // the mock "verifies" by parsing the raw body, so concurrent requests each carry their own event
  s.constructEvent.mockImplementation((raw: string) => JSON.parse(raw))
  const send = async (sess: unknown, eventId: string, type = 'checkout.session.completed') =>
    handleStripeWebhook(wreq(JSON.stringify({ id: eventId, type, data: { object: sess } })), deps)
  return { s, orders, cap, deps, send }
}

describe('webhook: final day assignment when the paid order is recorded', () => {
  it('records assignedDay (equal to the checkout estimate when there is room) and estimatedDay', async () => {
    const { orders, send } = wh()
    await send(session('cs_a000000001', MON, { assigned_day: '2026-10-21' }), 'evt_1')
    expect(orders.orders.get('cs_a000000001')).toMatchObject({ assignedDay: '2026-10-21', estimatedDay: '2026-10-21', dayMoved: false })
  })
  it('bumps to the next open day if the estimated day filled between checkout and payment', async () => {
    const { orders, cap, send } = wh()
    for (let i = 0; i < 10; i++) await cap.store.claim('2026-10-21', `other${i}`, 10)
    await send(session('cs_a000000002', MON, { assigned_day: '2026-10-21' }), 'evt_2')
    expect(orders.orders.get('cs_a000000002')).toMatchObject({ assignedDay: '2026-10-22', estimatedDay: '2026-10-21', dayMoved: true })
  })
  it('uses the checkout time, not the payment time, for the 48 hours and the cutoff', async () => {
    const { orders, send } = wh()
    // started Sunday 8:55 AM (before cutoff) with no metadata day: Tuesday, even though the webhook runs later
    await send(session('cs_a000000003', at('2026-10-18', 8)), 'evt_3')
    expect(orders.orders.get('cs_a000000003')?.assignedDay).toBe('2026-10-20')
  })
  it('duplicate events and the async-payment event never take a second slot', async () => {
    const { orders, cap, send } = wh()
    const sess = session('cs_a000000004', MON, { assigned_day: '2026-10-21' })
    await send(sess, 'evt_4'); await send(sess, 'evt_4'); await send(sess, 'evt_5', 'checkout.session.async_payment_succeeded')
    expect(orders.orders.size).toBe(1)
    expect(await cap.store.count('2026-10-21')).toBe(1)
  })
  it('12 simultaneous paid orders: exactly 10 on the first day, 2 on the next (Monday reservation off)', async () => {
    const { orders, send } = wh(ENV_NO_RESERVE)
    await Promise.all(Array.from({ length: 12 }, (_, i) => send(session(`cs_b00000000${i}`, MON, { assigned_day: '2026-10-21' }), `evt_b${i}`)))
    const days = [...orders.orders.values()].map((o) => o.assignedDay)
    expect(days.filter((d) => d === '2026-10-21')).toHaveLength(10)
    expect(days.filter((d) => d === '2026-10-22')).toHaveLength(2)
  })
  it('Monday with 5 reserved: the 6th paid one-off order lands on Tuesday', async () => {
    const sat = at('2026-10-17', 10)
    const { orders, send } = wh()
    for (let i = 0; i < 6; i++) await send(session(`cs_c00000000${i}`, sat), `evt_c${i}`)
    const days = [...orders.orders.values()].map((o) => o.assignedDay)
    expect(days).toEqual(['2026-10-19', '2026-10-19', '2026-10-19', '2026-10-19', '2026-10-19', '2026-10-20'])
  })
  it('stores assignedDay null (and still the order) when no day has room', async () => {
    const { orders, deps, s } = wh()
    const full = { count: async () => 99, claim: async () => 'full' as const }
    s.constructEvent.mockImplementation(() => ({ id: 'evt_f', type: 'checkout.session.completed', data: { object: session('cs_d000000001', MON) } }))
    const r = await handleStripeWebhook(wreq(), { ...deps, capacity: async () => full })
    expect(r.status).toBe(200)
    expect(orders.orders.get('cs_d000000001')?.assignedDay).toBeNull()
  })
  it('500 (Stripe retries) and no order stored if the day counter is unavailable', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { orders, deps, s } = wh()
    s.constructEvent.mockImplementation(() => ({ id: 'evt_g', type: 'checkout.session.completed', data: { object: session('cs_e000000001', MON) } }))
    const r = await handleStripeWebhook(wreq(), { ...deps, capacity: async () => { throw new Error('blobs down') } })
    expect(r.status).toBe(500)
    expect(orders.orders.size).toBe(0)
    err.mockRestore()
  })
  it('without a capacity store (older setups) orders are stored with no day', async () => {
    const { orders, deps, s } = wh()
    s.constructEvent.mockImplementation(() => ({ id: 'evt_h', type: 'checkout.session.completed', data: { object: session('cs_f000000001', MON) } }))
    await handleStripeWebhook(wreq(), { ...deps, capacity: undefined })
    expect(orders.orders.get('cs_f000000001')?.assignedDay).toBeUndefined()
  })
})

describe('kitchen ticket and confirmation email show the day', () => {
  const o = (over: Record<string, unknown> = {}) => ({ ...orderFromSession(session('cs_t000000001', MON, { assigned_day: '2026-10-21' }) as any, new Date('2026-10-19T14:00:00Z')), assignedDay: '2026-10-21', dayMoved: false, ...over })
  it('puts the assigned day near the top, in the subject and in the HTML', () => {
    const t = buildKitchenTicket(o() as any)
    expect(t.subject).toBe('New order: Pat Buyer, Pickup Wed, Oct 21')
    expect(t.text.split('\n')[4]).toBe('*** PICKUP DAY: WEDNESDAY, OCT 21, 11 AM TO 7 PM ***')
    expect(t.html).toContain('PICKUP DAY: Wednesday, Oct 21, 11 AM to 7 PM')
  })
  it('flags a day that moved and an order with no day', () => {
    const moved = buildKitchenTicket(o({ assignedDay: '2026-10-22', dayMoved: true }) as any)
    expect(moved.text).toContain('MOVED FROM WED, OCT 21')
    expect(moved.html).toContain('#fee2e2')
    const none = buildKitchenTicket(o({ assignedDay: null }) as any)
    expect(none.text).toContain('NO DAY AVAILABLE')
    expect(none.subject).toBe('New order: Pat Buyer, Pickup day to be scheduled')
    expect(moved.text).toContain('Heads up: the day was moved (Wed, Oct 21 filled up')
    expect(moved.text).toContain('You have a new order, Marsaun.')
    expect(moved.text).toContain('Hit reply to email the customer directly')
    const late = buildKitchenTicket(o({ receivedAt: '2026-10-18T14:00:00Z' }) as any)
    expect(late.text).toContain('after the Sunday 9 AM cutoff')
    expect(buildKitchenTicket(o() as any).text).not.toContain('Heads up')
  })
  it('delivery orders say DELIVER DAY', () => {
    expect(buildKitchenTicket(o({ fulfillment: 'delivery' }) as any).text).toContain('DELIVER DAY: WEDNESDAY')
  })
  it('the customer email states the day (feature stays off unless enabled)', async () => {
    const fetchMock = vi.fn(async () => new Response('{}')) as unknown as typeof fetch
    await sendOrderConfirmation(o() as any, { ...ENV, ORDER_EMAIL_ENABLED: 'true', RESEND_API_KEY: 'k', ORDER_EMAIL_FROM: 'a@b.co' }, fetchMock)
    expect(JSON.parse((fetchMock as any).mock.calls[0][1].body).text).toContain('Your pickup day: Wednesday, Oct 21, 11 AM to 7 PM.')
  })
})
