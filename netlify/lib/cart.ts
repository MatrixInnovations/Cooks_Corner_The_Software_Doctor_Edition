import { planFor, validateTray, type TraySelection } from '../../src/shared/catalog'

export type CheckoutMode = 'payment' | 'subscription'
export type CheckoutRequest = TraySelection & { mode: CheckoutMode; acceptedPolicies: true }

/**
 * Validates the request body. Only the fields below are read: any price, amount, total or currency the browser sends is
 * ignored on purpose (amounts always come from src/shared/catalog.ts).
 */
export function parseCheckoutRequest(body: unknown): { ok: true; value: CheckoutRequest } | { ok: false; errors: string[] } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const errors: string[] = []
  const mode = b.mode === undefined ? 'payment' : b.mode
  if (mode !== 'payment' && mode !== 'subscription') errors.push('mode must be "payment" or "subscription".')
  if (b.acceptedPolicies !== true) errors.push('You must accept the order changes and refunds policy and the food allergy notice.')
  const tray = validateTray(b)
  if (!tray.ok) errors.push(...tray.errors)
  if (tray.ok && mode === 'subscription') {
    const plan = planFor(tray.value.meals)
    if (!plan) errors.push('Unknown subscription plan.')
    else if (!plan.enabled || !plan.confirmed) errors.push(`The ${plan.meals}-meal subscription is not available yet.`)
    // Delivery for subscribers is $15 each time, billed separately (not part of the monthly plan), so this subscription checkout path is pickup only.
    if (tray.value.fulfillment === 'delivery') errors.push('Delivery is $15 each time, billed separately. Choose pickup for subscription checkout, or contact us to arrange delivery.')
  }
  if (errors.length || !tray.ok) return { ok: false, errors }
  return { ok: true, value: { ...tray.value, mode: mode as CheckoutMode, acceptedPolicies: true } }
}
