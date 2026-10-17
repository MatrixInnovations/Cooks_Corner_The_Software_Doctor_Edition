import { describe, expect, it } from 'vitest'
import { DELIVERY_FEE_CENTS, ONE_TIME_PACKAGES, SUBSCRIPTION_PLANS, dollars, totalCents, validateTray } from '../src/shared/catalog'

const base = { meals: 10, proteins: ['Grilled Ribeye'], vegetables: [], starches: [], sauces: [], fulfillment: 'pickup', allergyNote: '' }

describe('catalog pricing', () => {
  it('one-time prices match the confirmed menu', () => {
    expect(ONE_TIME_PACKAGES.map((p) => [p.meals, p.priceCents / 100, p.maxProteins])).toEqual([[8, 116, 3], [10, 150, 3], [12, 155, 4], [16, 190, 6]])
  })
  it('monthly plans: 12 meals is flagged unconfirmed and disabled', () => {
    expect(SUBSCRIPTION_PLANS.map((p) => [p.meals, p.priceCents / 100, p.enabled])).toEqual([[8, 400, true], [10, 500, true], [12, 575, false], [16, 768, true]])
  })
  it('adds the $15 delivery fee only for delivery', () => {
    expect(DELIVERY_FEE_CENTS).toBe(1500)
    expect(totalCents(8, 'pickup')).toBe(11600)
    expect(totalCents(8, 'delivery')).toBe(13100)
    expect(totalCents(16, 'delivery')).toBe(20500)
    expect(totalCents(9, 'pickup')).toBeNull()
  })
  it('formats dollars', () => { expect(dollars(11600)).toBe('$116'); expect(dollars(11650)).toBe('$116.50') })
})

describe('validateTray', () => {
  it('accepts a valid tray and normalises the note', () => {
    const r = validateTray({ ...base, allergyNote: '  nuts\u0007 ' })
    expect(r.ok && r.value.allergyNote).toBe('nuts')
  })
  it.each([[8, 3], [10, 3], [12, 4], [16, 6]])('enforces the %i-meal protein cap of %i', (meals, cap) => {
    const names = ['Grilled Ribeye', 'Grilled Chicken Breast', 'Grilled Chicken Thigh', 'Ground Turkey', 'Turkey Meatballs', 'Grilled Salmon', 'Grilled Shrimp']
    expect(validateTray({ ...base, meals, proteins: names.slice(0, cap) }).ok).toBe(true)
    expect(validateTray({ ...base, meals, proteins: names.slice(0, cap + 1) }).ok).toBe(false)
  })
  it('rejects unknown package, items, duplicates, bad fulfillment, empty proteins and long notes', () => {
    expect(validateTray({ ...base, meals: 9 }).ok).toBe(false)
    expect(validateTray({ ...base, proteins: ['Honey Nut Salmon'] }).ok).toBe(false) // not orderable until confirmed
    expect(validateTray({ ...base, proteins: ['Grilled Ribeye', 'Grilled Ribeye'] }).ok).toBe(false)
    expect(validateTray({ ...base, vegetables: ['Pizza'] }).ok).toBe(false)
    expect(validateTray({ ...base, sauces: ['ketchup'] }).ok).toBe(false)
    expect(validateTray({ ...base, fulfillment: 'drone' }).ok).toBe(false)
    expect(validateTray({ ...base, proteins: [] }).ok).toBe(false)
    expect(validateTray({ ...base, allergyNote: 'x'.repeat(501) }).ok).toBe(false)
    expect(validateTray(null).ok).toBe(false)
    expect(validateTray({ ...base, proteins: 'Grilled Ribeye' }).ok).toBe(false)
  })
})
