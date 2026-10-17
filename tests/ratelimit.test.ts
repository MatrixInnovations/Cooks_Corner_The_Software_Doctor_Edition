import { describe, expect, it } from 'vitest'
import { memoryStore, rateLimit } from '../netlify/lib/ratelimit'

describe('rateLimit', () => {
  it('allows up to the limit, blocks, then resets after the window', async () => {
    const s = memoryStore()
    const t0 = 1_000_000
    for (let i = 0; i < 3; i++) expect((await rateLimit(s, 'ip', 3, 60_000, t0 + i)).allowed).toBe(true)
    const blocked = await rateLimit(s, 'ip', 3, 60_000, t0 + 10)
    expect(blocked.allowed).toBe(false); expect(blocked.retryAfterSec).toBeGreaterThan(0)
    expect((await rateLimit(s, 'ip', 3, 60_000, t0 + 60_001)).allowed).toBe(true)
  })
  it('keeps ids separate and stores only hashed keys', async () => {
    const seen: string[] = []
    const base = memoryStore()
    const s = { get: base.get, set: async (k: string, v: any) => { seen.push(k); return base.set(k, v) } }
    expect((await rateLimit(s, 'a', 1, 1000, 0)).allowed).toBe(true)
    expect((await rateLimit(s, 'b', 1, 1000, 0)).allowed).toBe(true)
    expect(seen.every((k) => /^rl-[0-9a-f]{24}$/.test(k))).toBe(true)
  })
})
