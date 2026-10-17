/**
 * Single source of truth for what can be ordered and what it costs. Pure data + pure functions: no DOM, no import.meta,
 * so the same file is used by the Tray Builder (UI) and by the Netlify Functions (server, which never trusts client prices).
 * Amounts are integer cents. Source: Andrew's confirmed facts.
 */
export const DELIVERY_FEE_CENTS = 1500

export const ONE_TIME_PACKAGES = [
  { meals: 8, priceCents: 11600, maxProteins: 3 },
  { meals: 10, priceCents: 15000, maxProteins: 3 },
  { meals: 12, priceCents: 15500, maxProteins: 4 },
  { meals: 16, priceCents: 19000, maxProteins: 6 },
] as const

/** Monthly subscriptions: 8/$400, 10/$500, 12/$575, 16/$768 per month (12-meal plan confirmed monthly by Andrew/Marsaun, Oct 17). */
export const SUBSCRIPTION_PLANS = [
  { meals: 8, priceCents: 40000, enabled: true, confirmed: true },
  { meals: 10, priceCents: 50000, enabled: true, confirmed: true },
  { meals: 12, priceCents: 57500, enabled: true, confirmed: true },
  { meals: 16, priceCents: 76800, enabled: true, confirmed: true },
] as const

export const MENU_ITEMS = {
  Protein: ['Grilled Ribeye', 'Grilled Chicken Breast', 'Grilled Chicken Thigh', 'Ground Turkey', 'Turkey Meatballs'],
  Seafood: ['Grilled Salmon', 'Grilled Shrimp', 'Grilled Scallops', 'Grilled Cod'],
  Vegetables: ['Grilled Asparagus', 'Grilled Zucchini/Squash', 'Steamed Broccoli', 'Steamed Green Beans', 'Grilled Peppers', 'Roasted Carrots'],
  Starch: ['Sweet Potato', 'Roasted Corn', 'Black Beans', 'Garlic Parmesan Mash', 'Rice Pilaf', 'Brown Rice/Quinoa'],
} as const

/** Honey Nut Salmon is Marsaun's signature dish but is NOT orderable as a protein until Andrew confirms it. */
export const PROTEINS: readonly string[] = [...MENU_ITEMS.Protein, ...MENU_ITEMS.Seafood]
export const SAUCES = [
  { id: 'spank-sauce', name: 'Spank Sauce', desc: 'Greek yogurt base, preferably for salmon' },
  { id: 'spice-man', name: 'Spice Man', desc: 'Sweet Thai chili base' },
] as const

export const MAX_ALLERGY_NOTE = 500
export type Fulfillment = 'pickup' | 'delivery'

export const packageFor = (meals: number) => ONE_TIME_PACKAGES.find((p) => p.meals === meals)
export const planFor = (meals: number) => SUBSCRIPTION_PLANS.find((p) => p.meals === meals)

export type TraySelection = {
  meals: number
  proteins: string[]
  vegetables: string[]
  starches: string[]
  sauces: string[]
  fulfillment: Fulfillment
  allergyNote: string
}

/** Total in cents from the catalog only (never from client-supplied prices). Returns null for an unknown package. */
export function totalCents(meals: number, fulfillment: Fulfillment): number | null {
  const p = packageFor(meals)
  if (!p) return null
  return p.priceCents + (fulfillment === 'delivery' ? DELIVERY_FEE_CENTS : 0)
}

export const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`

const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string')
const uniq = (a: string[]) => new Set(a).size === a.length

/** Validates a tray selection against the catalog. Returns a list of human-readable errors (empty = valid). */
export function validateTray(sel: unknown): { ok: true; value: TraySelection } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const s = (sel ?? {}) as Record<string, unknown>
  const pkg = typeof s.meals === 'number' ? packageFor(s.meals) : undefined
  if (!pkg) errors.push('Pick a package of 8, 10, 12 or 16 meals.')
  const arr = (k: string) => (isStrArr(s[k]) ? (s[k] as string[]) : (errors.push(`${k} must be a list.`), [] as string[]))
  const proteins = arr('proteins'), vegetables = arr('vegetables'), starches = arr('starches'), sauces = arr('sauces')
  if (!uniq(proteins) || !uniq(vegetables) || !uniq(starches) || !uniq(sauces)) errors.push('Each item can only be picked once.')
  if (proteins.length < 1) errors.push('Choose at least one protein.')
  if (pkg && proteins.length > pkg.maxProteins) errors.push(`The ${pkg.meals}-meal package allows up to ${pkg.maxProteins} proteins.`)
  if (proteins.some((p) => !PROTEINS.includes(p))) errors.push('Unknown protein.')
  if (vegetables.some((v) => !(MENU_ITEMS.Vegetables as readonly string[]).includes(v))) errors.push('Unknown vegetable.')
  if (starches.some((v) => !(MENU_ITEMS.Starch as readonly string[]).includes(v))) errors.push('Unknown starch.')
  if (sauces.some((x) => !SAUCES.some((c) => c.id === x))) errors.push('Unknown sauce.')
  const fulfillment = s.fulfillment
  if (fulfillment !== 'pickup' && fulfillment !== 'delivery') errors.push('Choose pickup or delivery.')
  const note = typeof s.allergyNote === 'string' ? s.allergyNote : ''
  if (s.allergyNote !== undefined && typeof s.allergyNote !== 'string') errors.push('Allergy note must be text.')
  if (note.length > MAX_ALLERGY_NOTE) errors.push(`Allergy note is limited to ${MAX_ALLERGY_NOTE} characters.`)
  if (errors.length || !pkg) return { ok: false, errors }
  return {
    ok: true,
    value: {
      meals: pkg.meals,
      proteins, vegetables, starches, sauces,
      fulfillment: fulfillment as Fulfillment,
      // strip control characters, keep it plain text
      allergyNote: note.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim(),
    },
  }
}
