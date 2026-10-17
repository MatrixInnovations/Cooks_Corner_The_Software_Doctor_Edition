import { describe, expect, it, vi } from 'vitest'
import {
  assignOrderDay, dailyCap, firstAvailableDay, kvCapacityStore, memoryKv, reservedFromEnv, reservedWithStripe, type ConditionalKv,
} from '../netlify/lib/capacity'
import { etInstant } from '../src/shared/schedule'
import { memoryCapacity } from './helpers'

const at = (day: string, h = 12) => etInstant(day, h, 0)
const WED = at('2026-10-19', 10) // Mon 10 AM order: earliest Wed Oct 21
const SAT = at('2026-10-17', 10) // earliest Mon Oct 19

describe('claim: race-safe per-day counter', () => {
  it('25 simultaneous orders never put more than 10 on a day', async () => {
    const { store, kv } = memoryCapacity()
    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => assignOrderDay(store, WED, `cs_${i}`, 10, null, {})))
    const per: Record<string, number> = {}
    for (const r of results) per[r.day!] = (per[r.day!] ?? 0) + 1
    expect(per).toEqual({ '2026-10-21': 10, '2026-10-22': 10, '2026-10-23': 5 })
    // what is stored agrees with what was handed out, and ids are unique
    for (const [day, n] of Object.entries(per)) expect(((kv.docs.get(day)!.data as any).orders as string[]).length).toBe(n)
    expect(new Set(results.map((_, i) => `cs_${i}`)).size).toBe(25)
  })
  it('simultaneous orders respect the 5 reserved Monday slots: 8 orders -> 5 Monday, 3 Tuesday', async () => {
    const { store } = memoryCapacity()
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => assignOrderDay(store, SAT, `cs_${i}`, 10)))
    expect(results.filter((r) => r.day === '2026-10-19')).toHaveLength(5)
    expect(results.filter((r) => r.day === '2026-10-20')).toHaveLength(3)
  })
  it('is idempotent: the same order id keeps its day and takes no second slot', async () => {
    const { store } = memoryCapacity()
    const a = await assignOrderDay(store, WED, 'cs_same', 10, null, {})
    const b = await assignOrderDay(store, WED, 'cs_same', 10, null, {})
    expect(b.day).toBe(a.day)
    expect(await store.count('2026-10-21')).toBe(1)
  })
  it('a retry after the day filled still finds the order on its original (bumped) day', async () => {
    const { store } = memoryCapacity()
    for (let i = 0; i < 10; i++) await assignOrderDay(store, WED, `fill_${i}`, 10, null, {})
    const first = await assignOrderDay(store, WED, 'cs_late', 10, null, {})
    expect(first.day).toBe('2026-10-22')
    for (let i = 0; i < 9; i++) await assignOrderDay(store, WED, `more_${i}`, 10, null, {})
    expect((await assignOrderDay(store, WED, 'cs_late', 10, null, {})).day).toBe('2026-10-22')
  })
  it('retries when a competing write lands between read and write (conditional write rejected)', async () => {
    const kv = memoryKv()
    let injected = false
    const racing: ConditionalKv = {
      ...kv,
      async putIfNew(key, data) {
        if (!injected) { injected = true; await kv.putIfNew(key, { orders: ['rival'] }) }
        return kv.putIfNew(key, data)
      },
    }
    const store = kvCapacityStore(racing)
    expect(await store.claim('2026-10-21', 'mine', 10)).toBe('claimed')
    expect(((kv.docs.get('2026-10-21')!.data as any).orders)).toEqual(['rival', 'mine'])
  })
  it('gives up loudly (so the webhook 500s and Stripe retries) under endless contention', async () => {
    const kv = memoryKv()
    const store = kvCapacityStore({ ...kv, putIfNew: async () => false, putIfMatch: async () => false })
    await expect(store.claim('2026-10-21', 'x', 10)).rejects.toThrow('capacity_contention')
  })
  it('a full day is reported full, not overfilled', async () => {
    const { store } = memoryCapacity()
    for (let i = 0; i < 3; i++) expect(await store.claim('2026-10-21', `o${i}`, 3)).toBe('claimed')
    expect(await store.claim('2026-10-21', 'o3', 3)).toBe('full')
    expect(await store.count('2026-10-21')).toBe(3)
  })
})

describe('assignOrderDay: checkout estimate vs payment time', () => {
  it('honors the day shown at checkout when it still has room', async () => {
    const { store } = memoryCapacity()
    expect((await assignOrderDay(store, WED, 'a', 10, '2026-10-22', {})).day).toBe('2026-10-22')
  })
  it('bumps to the next open day if the checkout day filled before payment', async () => {
    const { store } = memoryCapacity()
    for (let i = 0; i < 10; i++) await store.claim('2026-10-21', `o${i}`, 10)
    const r = await assignOrderDay(store, WED, 'a', 10, '2026-10-21', {})
    expect(r).toMatchObject({ day: '2026-10-22', expected: '2026-10-21', bumped: true })
  })
  it('never goes earlier than the rules allow, even if the preferred day is junk or too early', async () => {
    const { store } = memoryCapacity()
    expect((await assignOrderDay(store, WED, 'a', 10, '2026-10-20', {})).day).toBe('2026-10-21') // too early
    expect((await assignOrderDay(store, WED, 'b', 10, 'tomorrow', {})).day).toBe('2026-10-21') // junk
    expect((await assignOrderDay(store, WED, 'c', 10, '2026-10-25', {})).day).toBe('2026-10-26') // Sunday -> Monday
  })
  it('returns day null when there is no room anywhere in the lookahead', async () => {
    const store = { count: async () => 10, claim: async () => 'full' as const }
    expect((await assignOrderDay(store, WED, 'a', 10, null, {})).day).toBeNull()
  })
})

describe('firstAvailableDay (read-only, used at checkout)', () => {
  it('skips full days and the reserved Monday slots', async () => {
    const { store } = memoryCapacity()
    for (let i = 0; i < 5; i++) await store.claim('2026-10-19', `m${i}`, 5)
    expect(await firstAvailableDay(store, SAT, 10)).toBe('2026-10-20') // Monday full (5 + 5 reserved)
    expect(await firstAvailableDay(store, SAT, 10, {})).toBe('2026-10-19') // no reservation: Monday has room
  })
})

describe('reserved slots config', () => {
  it('defaults to 5 on Monday', () => { expect(reservedFromEnv({})).toEqual({ 1: 5 }) })
  it('RESERVED_SLOTS_MONDAY overrides; other weekdays can be set; junk is ignored', () => {
    expect(reservedFromEnv({ RESERVED_SLOTS_MONDAY: '3' })[1]).toBe(3)
    expect(reservedFromEnv({ RESERVED_SLOTS_MONDAY: '0' })[1]).toBe(0)
    expect(reservedFromEnv({ RESERVED_SLOTS_FRIDAY: '2' })).toEqual({ 1: 5, 5: 2 })
    expect(reservedFromEnv({ RESERVED_SLOTS_MONDAY: 'lots' })[1]).toBe(5)
    expect(reservedFromEnv({ RESERVED_SLOTS_MONDAY: '-4' })[1]).toBe(0)
  })
  it('ORDER_DAILY_CAP defaults to 10 and is clamped', () => {
    expect(dailyCap({})).toBe(10)
    expect(dailyCap({ ORDER_DAILY_CAP: '12' })).toBe(12)
    expect(dailyCap({ ORDER_DAILY_CAP: '0' })).toBe(10)
    expect(dailyCap({ ORDER_DAILY_CAP: '5000' })).toBe(200)
    expect(dailyCap({ ORDER_DAILY_CAP: 'x' })).toBe(10)
  })
})

describe('optional Stripe subscription count (STRIPE_COUNT_SUBSCRIPTIONS)', () => {
  const sub = (id: string, status = 'active', source?: string) => ({ id, status, metadata: source ? { source } : {} })
  const client = (pages: Array<{ data: any[]; has_more: boolean }>) => {
    const list = vi.fn(async () => pages.shift()!)
    return { list, stripe: () => ({ subscriptions: { list } }) as any }
  }
  it('is OFF by default: Stripe is never called', async () => {
    const c = client([])
    expect(await reservedWithStripe({}, c.stripe)).toEqual({ 1: 5 })
    expect(c.list).not.toHaveBeenCalled()
  })
  it('when on, Monday reservation = active subscriptions not created by this site', async () => {
    const c = client([{ data: [sub('s1'), sub('s2'), sub('s3', 'canceled'), sub('s4', 'trialing'), sub('s5', 'active', 'cooks-corner-site'), sub('s6', 'past_due')], has_more: false }])
    expect(await reservedWithStripe({ STRIPE_COUNT_SUBSCRIPTIONS: 'true' }, c.stripe)).toEqual({ 1: 4 })
  })
  it('pages through more than 100 subscriptions', async () => {
    const c = client([{ data: [sub('a'), sub('b')], has_more: true }, { data: [sub('c')], has_more: false }])
    expect((await reservedWithStripe({ STRIPE_COUNT_SUBSCRIPTIONS: 'true' }, c.stripe))[1]).toBe(3)
    expect(c.list).toHaveBeenCalledTimes(2)
    expect((c.list.mock.calls[1] as any[])[0]).toMatchObject({ starting_after: 'b' })
  })
  it('falls back to RESERVED_SLOTS_MONDAY if the key lacks Subscriptions: Read (never blocks orders)', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const stripe = () => ({ subscriptions: { list: async () => { throw new Error('permission') } } }) as any
    expect(await reservedWithStripe({ STRIPE_COUNT_SUBSCRIPTIONS: 'true', RESERVED_SLOTS_MONDAY: '4' }, stripe)).toEqual({ 1: 4 })
    err.mockRestore()
  })
  it('falls back when the client has no subscriptions API', async () => {
    expect(await reservedWithStripe({ STRIPE_COUNT_SUBSCRIPTIONS: 'true' }, () => ({}) as any)).toEqual({ 1: 5 })
  })
})
