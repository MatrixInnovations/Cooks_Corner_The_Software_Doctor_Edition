import { describe, expect, it } from 'vitest'
import { parseCheckoutRequest } from '../netlify/lib/cart'
import { buildSessionParams, sessionTotalCents } from '../netlify/lib/session'
import { SITE, goodCart } from './helpers'

const build = (over: Record<string, unknown> = {}) => {
  const r = parseCheckoutRequest({ ...goodCart(), ...over })
  if (!r.ok) throw new Error(r.errors.join('; '))
  return buildSessionParams(r.value, SITE, new Date('2026-10-17T12:00:00Z'))
}

describe('parseCheckoutRequest', () => {
  it('requires policy acceptance', () => {
    expect(parseCheckoutRequest({ ...goodCart(), acceptedPolicies: false }).ok).toBe(false)
    const { acceptedPolicies: _a, ...rest } = goodCart()
    expect(parseCheckoutRequest(rest).ok).toBe(false)
  })
  it('defaults mode to payment, rejects unknown modes', () => {
    const { mode: _m, ...rest } = goodCart()
    const r = parseCheckoutRequest(rest); expect(r.ok && r.value.mode).toBe('payment')
    expect(parseCheckoutRequest({ ...goodCart(), mode: 'setup' }).ok).toBe(false)
  })
  it('refuses the unconfirmed 12-meal subscription but allows 8/10/16', () => {
    const sub = (meals: number) => parseCheckoutRequest({ ...goodCart(), mode: 'subscription', meals })
    expect(sub(12).ok).toBe(false)
    expect(sub(8).ok && sub(10).ok && sub(16).ok).toBe(true)
  })
  it('refuses delivery on subscriptions (recurring fee not confirmed)', () => {
    expect(parseCheckoutRequest({ ...goodCart(), mode: 'subscription', fulfillment: 'delivery' }).ok).toBe(false)
  })
})

describe('buildSessionParams', () => {
  it.each([[8, 11600], [10, 15000], [12, 15500], [16, 19000]])('%i meals pickup totals %i cents', (meals, cents) => {
    const p = build({ meals })
    expect(p.mode).toBe('payment')
    expect(sessionTotalCents(p)).toBe(cents)
    expect(p.shipping_address_collection).toBeUndefined()
  })
  it('delivery adds a $15 line item and collects a US shipping address', () => {
    const p = build({ fulfillment: 'delivery' })
    expect(sessionTotalCents(p)).toBe(15000 + 1500)
    expect(p.line_items).toHaveLength(2)
    expect(p.shipping_address_collection).toEqual({ allowed_countries: ['US'] })
    expect(p.metadata?.fulfillment).toBe('delivery')
  })
  it('NEVER trusts client prices: price/amount/total fields are ignored', () => {
    const p = build({ price: 1, amount: 1, total: 1, unit_amount: 1, priceCents: 1, currency: 'eur', line_items: [{ price: 'price_x' }] })
    expect(sessionTotalCents(p)).toBe(15000)
    expect(p.line_items![0].price_data!.currency).toBe('usd')
  })
  it('monthly subscription uses subscription mode with a monthly recurring price', () => {
    const p = build({ mode: 'subscription', meals: 16 })
    expect(p.mode).toBe('subscription')
    expect(p.line_items![0].price_data).toMatchObject({ unit_amount: 76800, recurring: { interval: 'month' } })
    expect(p.subscription_data?.metadata?.meals).toBe('16')
    expect(p.payment_intent_data).toBeUndefined()
  })
  it('stores the tray, allergy note and policy acceptance in metadata (sauce names, not ids)', () => {
    const m = build().metadata!
    expect(m).toMatchObject({ meals: '10', proteins: 'Turkey Meatballs | Grilled Shrimp', sauces: 'Spank Sauce', allergy_note: 'peanuts', policies_accepted_at: '2026-10-17T12:00:00.000Z', catalog_total_cents: '15000', source: 'cooks-corner-site' })
    for (const v of Object.values(m as Record<string, string>)) expect(v.length).toBeLessThanOrEqual(500)
  })
  it('success/cancel URLs point at SITE_URL', () => {
    const p = build()
    expect(p.success_url!.startsWith(`${SITE}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`)).toBe(true)
    expect(p.cancel_url).toBe(`${SITE}/?checkout=cancelled#build`)
  })
})
