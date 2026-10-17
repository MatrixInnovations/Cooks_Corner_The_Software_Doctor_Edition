import { DAILY_ORDER_CAP, DEFAULT_RESERVED, candidateDays, capacityOn, earliestDay, isDay, type Reserved } from '../../src/shared/schedule'
import { int } from './config'
import type { Env, StripeClient } from './types'

/**
 * Per-day order capacity. One small document per fulfillment day (key = 'YYYY-MM-DD') holding the ids of the PAID orders assigned to it.
 * A day's count is the length of that list, so "count paid orders per day" and "claim a slot" are the same record and cannot drift apart.
 * Claims are race-safe: read the document with its ETag, write it back only if the ETag still matches (or only if it is new).
 * If another order won the race the write is rejected and we re-read and try again, so a day can never exceed the cap.
 */
export type ClaimResult = 'claimed' | 'already' | 'full'

export interface CapacityStore {
  /** Paid orders currently assigned to `day`. */
  count(day: string): Promise<number>
  /** Atomically add `orderId` to `day` if there is room. Idempotent: the same order id never takes two slots. */
  claim(day: string, orderId: string, cap: number): Promise<ClaimResult>
}

/** The three operations a conditional-write key/value store needs (Netlify Blobs provides all of them). */
export interface ConditionalKv {
  get(key: string): Promise<{ data: unknown; etag: string } | null>
  /** Create only if the key does not exist. Returns false if it already did. */
  putIfNew(key: string, data: unknown): Promise<boolean>
  /** Replace only if the stored ETag still equals `etag`. Returns false if someone else wrote first. */
  putIfMatch(key: string, data: unknown, etag: string): Promise<boolean>
}

type DayDoc = { orders: string[] }
const MAX_ATTEMPTS = 12

const idsOf = (data: unknown): string[] => {
  const o = (data as DayDoc | null)?.orders
  return Array.isArray(o) ? o.filter((x): x is string => typeof x === 'string') : []
}

export function kvCapacityStore(kv: ConditionalKv): CapacityStore {
  return {
    async count(day) {
      const cur = await kv.get(day)
      return cur ? idsOf(cur.data).length : 0
    },
    async claim(day, orderId, cap) {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const cur = await kv.get(day)
        const ids = cur ? idsOf(cur.data) : []
        if (ids.includes(orderId)) return 'already'
        if (ids.length >= cap) return 'full'
        const next: DayDoc = { orders: [...ids, orderId] }
        const won = cur ? await kv.putIfMatch(day, next, cur.etag) : await kv.putIfNew(day, next)
        if (won) return 'claimed'
      }
      throw new Error('capacity_contention')
    },
  }
}

/** In-memory ConditionalKv (tests and local dev). Every operation yields first so concurrent callers genuinely interleave. */
export function memoryKv(): ConditionalKv & { docs: Map<string, { data: unknown; etag: number }> } {
  const docs = new Map<string, { data: unknown; etag: number }>()
  const tick = () => new Promise<void>((r) => setTimeout(r, 0))
  return {
    docs,
    async get(key) { await tick(); const d = docs.get(key); return d ? { data: structuredClone(d.data), etag: String(d.etag) } : null },
    async putIfNew(key, data) { await tick(); if (docs.has(key)) return false; docs.set(key, { data: structuredClone(data), etag: 1 }); return true },
    async putIfMatch(key, data, etag) {
      await tick()
      const d = docs.get(key)
      if (!d || String(d.etag) !== etag) return false
      docs.set(key, { data: structuredClone(data), etag: d.etag + 1 })
      return true
    },
  }
}

/** Netlify Blobs store `order-days`, strong consistency, using Blobs' conditional writes (onlyIfNew / onlyIfMatch). Loaded lazily. */
export async function blobCapacityStore(): Promise<CapacityStore> {
  const { getStore } = await import('@netlify/blobs')
  const store = getStore({ name: 'order-days', consistency: 'strong' })
  return kvCapacityStore({
    async get(key) {
      const r = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' })
      return r && r.etag ? { data: r.data, etag: r.etag } : null
    },
    async putIfNew(key, data) { return (await store.setJSON(key, data, { onlyIfNew: true })).modified },
    async putIfMatch(key, data, etag) { return (await store.setJSON(key, data, { onlyIfMatch: etag })).modified },
  })
}

const DAY_ENV = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
/** Slots held back for standing orders: RESERVED_SLOTS_<WEEKDAY> (0 to the cap). Default: 5 on Monday (Marsaun's monthly subscribers). */
export function reservedFromEnv(env: Env): Reserved {
  const out: Reserved = { ...DEFAULT_RESERVED }
  DAY_ENV.forEach((name, i) => {
    const v = env[`RESERVED_SLOTS_${name}`]
    const n = v === undefined || v.trim() === '' ? NaN : Number(v)
    if (Number.isFinite(n)) out[i] = Math.min(200, Math.max(0, Math.floor(n)))
  })
  return out
}

/**
 * OPTIONAL (STRIPE_COUNT_SUBSCRIPTIONS=true, off by default): replace the static Monday reservation with the live number of active monthly
 * subscriptions in Stripe, excluding ones created by this site (those are claimed from the day counter like any order, so counting them here
 * would count them twice). Needs the key to have "Subscriptions: Read". Any failure (missing permission, network) falls back to the static value.
 */
export async function reservedWithStripe(env: Env, stripe: () => StripeClient, reserved: Reserved = reservedFromEnv(env)): Promise<Reserved> {
  if (env.STRIPE_COUNT_SUBSCRIPTIONS !== 'true') return reserved
  try {
    const subs = stripe().subscriptions
    if (!subs) return reserved
    let n = 0, after: string | undefined
    for (let page = 0; page < 5; page++) {
      const r = await subs.list({ limit: 100, ...(after ? { starting_after: after } : {}) })
      for (const s of r.data) {
        if (['active', 'trialing', 'past_due'].includes(s.status ?? 'active') && s.metadata?.source !== 'cooks-corner-site') n++
      }
      if (!r.has_more || r.data.length === 0) break
      after = r.data[r.data.length - 1].id
    }
    return { ...reserved, 1: n }
  } catch (e) {
    console.error('capacity: stripe subscription count failed, using RESERVED_SLOTS_MONDAY', (e as Error).name)
    return reserved
  }
}

/** Daily cap: ORDER_DAILY_CAP (1 to 200) or the default 10 (0, negative or junk = 10). */
export const dailyCap = (env: Env) => Math.min(200, Math.max(1, int(env.ORDER_DAILY_CAP, DAILY_ORDER_CAP)))

/** Read-only: the first open day (from the order time) that still has room. Used at checkout to show/record the expected day. */
export async function firstAvailableDay(store: CapacityStore, orderTime: Date, cap: number, reserved: Reserved = DEFAULT_RESERVED): Promise<string | null> {
  for (const day of candidateDays(orderTime)) if ((await store.count(day)) < capacityOn(day, cap, reserved)) return day
  return null
}

/** `expected` = the day we started from (shown at checkout); `bumped` = the order landed on a later day because earlier ones were full. */
export type Assigned = { day: string | null; expected: string; bumped: boolean }

/**
 * Authoritative assignment, run when the paid order is recorded. Starts at the day shown at checkout (`preferred`, only trusted if it is a
 * real candidate day, never earlier than the rules allow) and claims the first day with room; if that day filled in the meantime the order
 * moves to the next open day. Idempotent per order id.
 */
export async function assignOrderDay(store: CapacityStore, orderTime: Date, orderId: string, cap: number, preferred?: string | null, reserved: Reserved = DEFAULT_RESERVED): Promise<Assigned> {
  const earliest = earliestDay(orderTime)
  const start = isDay(preferred) && preferred >= earliest ? preferred : earliest
  for (const day of candidateDays(orderTime)) {
    if (day < start) continue
    const room = capacityOn(day, cap, reserved)
    if (room <= 0) continue
    const r = await store.claim(day, orderId, room)
    if (r === 'claimed' || r === 'already') return { day, expected: start, bumped: day !== start }
  }
  return { day: null, expected: start, bumped: false }
}
