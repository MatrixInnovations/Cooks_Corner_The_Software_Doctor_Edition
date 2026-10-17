import { createHash } from 'node:crypto'

export type Counter = { count: number; resetAt: number }
export interface CounterStore {
  get(key: string): Promise<Counter | null>
  set(key: string, value: Counter): Promise<void>
}

export function memoryStore(): CounterStore {
  const m = new Map<string, Counter>()
  return {
    async get(k) { return m.get(k) ?? null },
    async set(k, v) {
      if (m.size > 5000) for (const [kk, vv] of m) if (vv.resetAt < Date.now()) m.delete(kk)
      m.set(k, v)
    },
  }
}

/** Fixed-window limiter. Keys are hashed so no raw IP is stored. Best effort (not atomic): it blunts abuse, it is not a security boundary. */
export async function rateLimit(store: CounterStore, id: string, limit: number, windowMs: number, now = Date.now()) {
  const key = 'rl-' + createHash('sha256').update(id).digest('hex').slice(0, 24)
  const cur = await store.get(key)
  if (!cur || cur.resetAt <= now) {
    await store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 }
  }
  if (cur.count >= limit) return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) }
  await store.set(key, { count: cur.count + 1, resetAt: cur.resetAt })
  return { allowed: true, remaining: limit - cur.count - 1, retryAfterSec: 0 }
}
