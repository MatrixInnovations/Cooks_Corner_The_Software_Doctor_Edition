import Stripe from 'stripe'
import { handleCreateCheckout } from '../lib/checkout-handler'
import { memoryStore, type CounterStore } from '../lib/ratelimit'

const fallback = memoryStore()
/** Rate-limit counters live in Netlify Blobs (shared across function instances); falls back to per-instance memory if Blobs is unavailable. */
async function limiter(): Promise<CounterStore> {
  try {
    const { getStore } = await import('@netlify/blobs')
    const s = getStore({ name: 'ratelimit', consistency: 'strong' })
    return {
      async get(k) { return ((await s.get(k, { type: 'json' })) as { count: number; resetAt: number } | null) ?? null },
      async set(k, v) { await s.setJSON(k, v) },
    }
  } catch {
    return fallback
  }
}

export default async (req: Request) =>
  handleCreateCheckout(req, {
    env: process.env,
    stripe: (key) => new Stripe(key, { maxNetworkRetries: 1 }),
    limiter: await limiter(),
  })

export const config = { path: '/api/create-checkout-session' }
