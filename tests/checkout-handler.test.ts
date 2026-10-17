import { describe, expect, it, vi } from 'vitest'
import { handleCreateCheckout } from '../netlify/lib/checkout-handler'
import { memoryStore } from '../netlify/lib/ratelimit'
import { ENV, SITE, goodCart, mockStripe, post } from './helpers'

const deps = (over: Partial<Parameters<typeof handleCreateCheckout>[1]> = {}) => {
  const s = mockStripe()
  const stripe = vi.fn(() => s.client)
  return { s, stripe, d: { env: ENV, stripe, limiter: memoryStore(), ...over } }
}
const body = async (r: Response) => (await r.json()) as any

describe('create-checkout-session handler (Stripe mocked)', () => {
  it('creates a session and returns its URL', async () => {
    const { s, d } = deps()
    const r = await handleCreateCheckout(post(goodCart(), { 'idempotency-key': 'abcdef123456' }), d)
    expect(r.status).toBe(200)
    expect(await body(r)).toEqual({ id: 'cs_test_123', url: 'https://checkout.stripe.test/c/pay/cs_test_123' })
    expect(s.create).toHaveBeenCalledTimes(1)
    const [params, opts] = s.create.mock.calls[0] as any[]
    expect(params.line_items[0].price_data.unit_amount).toBe(15000)
    expect(opts).toEqual({ idempotencyKey: 'abcdef123456' })
    expect(r.headers.get('access-control-allow-origin')).toBe(SITE)
  })
  it.each([8, 10, 12, 16])('pickup %i meals (minimal tray, empty or "None" allergy note) creates a card-only session with no delivery fee', async (meals) => {
    for (const allergyNote of ['', 'None']) {
      const { s, d } = deps()
      const r = await handleCreateCheckout(post({ ...goodCart(), meals, fulfillment: 'pickup', proteins: ['Grilled Ribeye'], vegetables: [], starches: [], sauces: [], allergyNote }), d)
      expect(r.status).toBe(200)
      const [params] = s.create.mock.calls[0] as any[]
      expect(params.line_items).toHaveLength(1)
      expect(params.shipping_address_collection).toBeUndefined()
      expect(params.allowed_payment_method_types).toEqual(['card'])
    }
  })
  it('CHECKOUT_PAYMENT_METHODS can widen the list; junk falls back to card', async () => {
    const a = deps({ env: { ...ENV, CHECKOUT_PAYMENT_METHODS: 'card, link' } })
    await handleCreateCheckout(post(goodCart()), a.d)
    expect((a.s.create.mock.calls[0] as any[])[0].allowed_payment_method_types).toEqual(['card', 'link'])
    const b = deps({ env: { ...ENV, CHECKOUT_PAYMENT_METHODS: 'card,bitcoin' } })
    await handleCreateCheckout(post(goodCart()), b.d)
    expect((b.s.create.mock.calls[0] as any[])[0].allowed_payment_method_types).toEqual(['card'])
  })
  it('ignores a malformed idempotency key', async () => {
    const { s, d } = deps()
    await handleCreateCheckout(post(goodCart(), { 'idempotency-key': 'bad key!' }), d)
    expect((s.create.mock.calls[0] as any[])[1]).toBeUndefined()
  })
  it('400s on invalid orders without calling Stripe', async () => {
    const { s, d } = deps()
    const r = await handleCreateCheckout(post({ ...goodCart(), proteins: ['Grilled Ribeye', 'Ground Turkey', 'Grilled Cod', 'Grilled Salmon'] }), d)
    expect(r.status).toBe(400)
    expect((await body(r)).error.code).toBe('invalid_request')
    const r2 = await handleCreateCheckout(post({ ...goodCart(), acceptedPolicies: false }), d)
    expect(r2.status).toBe(400)
    expect(s.create).not.toHaveBeenCalled()
  })
  it('400 on bad JSON, 415 on wrong content type, 413 on oversize, 405 on GET', async () => {
    const { d } = deps()
    expect((await handleCreateCheckout(post('{nope', {}, true), d)).status).toBe(400)
    expect((await handleCreateCheckout(post(goodCart(), { 'content-type': 'text/plain' }), d)).status).toBe(415)
    expect((await handleCreateCheckout(post({ ...goodCart(), allergyNote: 'x'.repeat(20000) }), d)).status).toBe(413)
    expect((await handleCreateCheckout(new Request(`${SITE}/api/create-checkout-session`), d)).status).toBe(405)
  })
  it('rejects a foreign Origin', async () => {
    const { s, d } = deps()
    const r = await handleCreateCheckout(post(goodCart(), { origin: 'https://evil.example' }), d)
    expect(r.status).toBe(403)
    expect(s.create).not.toHaveBeenCalled()
  })
  it('answers CORS preflight only for the site origin', async () => {
    const { d } = deps()
    const ok = await handleCreateCheckout(new Request(`${SITE}/x`, { method: 'OPTIONS', headers: { origin: SITE } }), d)
    expect(ok.status).toBe(204)
    const no = await handleCreateCheckout(new Request(`${SITE}/x`, { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), d)
    expect(no.status).toBe(403)
  })
  it('rate limits per IP (429 + Retry-After) and does not create a session', async () => {
    const { s, d } = deps({ env: { ...ENV, CHECKOUT_RATE_LIMIT_MAX: '2' } })
    expect((await handleCreateCheckout(post(goodCart()), d)).status).toBe(200)
    expect((await handleCreateCheckout(post(goodCart()), d)).status).toBe(200)
    const r = await handleCreateCheckout(post(goodCart()), d)
    expect(r.status).toBe(429)
    expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(s.create).toHaveBeenCalledTimes(2)
    // a different IP is unaffected
    expect((await handleCreateCheckout(post(goodCart(), { 'x-nf-client-connection-ip': '198.51.100.7' }), d)).status).toBe(200)
  })
  it('503 when not configured; never builds a Stripe client', async () => {
    const { stripe, d } = deps({ env: { SITE_URL: SITE } })
    const r = await handleCreateCheckout(post(goodCart()), d)
    expect(r.status).toBe(503)
    expect(stripe).not.toHaveBeenCalled()
  })
  it('refuses live keys unless STRIPE_ALLOW_LIVE=true', async () => {
    const live = { ...ENV, STRIPE_SECRET_KEY: 'rk_live_fake' }
    const a = deps({ env: live })
    expect((await handleCreateCheckout(post(goodCart()), a.d)).status).toBe(500)
    expect(a.stripe).not.toHaveBeenCalled()
    const b = deps({ env: { ...live, STRIPE_ALLOW_LIVE: 'true' } })
    expect((await handleCreateCheckout(post(goodCart()), b.d)).status).toBe(200)
  })
  it('requires https SITE_URL', async () => {
    const { d } = deps({ env: { ...ENV, SITE_URL: 'http://shop.example.com' } })
    expect((await handleCreateCheckout(post(goodCart(), { origin: 'http://shop.example.com' }), d)).status).toBe(503)
  })
  it('502 without leaking Stripe error text', async () => {
    const { s, d } = deps()
    s.create.mockRejectedValueOnce(Object.assign(new Error('secret detail sk_test_leak'), { type: 'StripeInvalidRequestError', code: 'x' }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await handleCreateCheckout(post(goodCart()), d)
    expect(r.status).toBe(502)
    expect(JSON.stringify(await body(r))).not.toContain('sk_test_leak')
    expect(JSON.stringify(spy.mock.calls)).not.toContain('sk_test_leak')
    spy.mockRestore()
  })
})
