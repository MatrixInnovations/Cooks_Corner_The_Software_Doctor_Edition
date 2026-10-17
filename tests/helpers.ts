import { vi } from 'vitest'
import type { StripeClient } from '../netlify/lib/types'
import { memoryStore } from '../netlify/lib/ratelimit'
import type { OrderRecord, OrderStore } from '../netlify/lib/orders'

export const SITE = 'https://shop.example.com'
// obviously fake test-mode shaped values; nothing here can reach Stripe
export const ENV = { STRIPE_SECRET_KEY: 'sk_test_fake_for_unit_tests', STRIPE_WEBHOOK_SECRET: 'whsec_fake_for_unit_tests', SITE_URL: SITE }

export const goodCart = () => ({
  mode: 'payment', meals: 10, proteins: ['Turkey Meatballs', 'Grilled Shrimp'], vegetables: ['Steamed Broccoli'], starches: ['Sweet Potato'],
  sauces: ['spank-sauce'], fulfillment: 'pickup', allergyNote: 'peanuts', acceptedPolicies: true,
})

export function mockStripe() {
  const create = vi.fn(async () => ({ id: 'cs_test_123', url: 'https://checkout.stripe.test/c/pay/cs_test_123' }))
  const constructEvent = vi.fn()
  const client: StripeClient = { checkout: { sessions: { create } }, webhooks: { constructEvent } } as unknown as StripeClient
  return { client, create, constructEvent }
}

export const post = (body: unknown, headers: Record<string, string> = {}, raw = false) =>
  new Request(`${SITE}/api/create-checkout-session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: SITE, 'x-nf-client-connection-ip': '203.0.113.9', ...headers },
    body: raw ? (body as string) : JSON.stringify(body),
  })

export function memoryOrders(): OrderStore & { orders: Map<string, OrderRecord>; events: Set<string> } {
  const orders = new Map<string, OrderRecord>()
  const events = new Set<string>()
  return {
    orders, events,
    async getOrder(id) { return orders.get(id) ?? null },
    async putOrder(o) { orders.set(o.id, o) },
    async hasEvent(id) { return events.has(id) },
    async markEvent(id) { events.add(id) },
  }
}
export { memoryStore }
