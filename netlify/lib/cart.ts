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
    // Delivery on a subscription: the recurring delivery fee has not been confirmed by Marsaun, so it is refused rather than guessed.
    if (tray.value.fulfillment === 'delivery') errors.push('Delivery is not available on subscriptions yet. Choose pickup.')
  }
  if (errors.length || !tray.ok) return { ok: false, errors }
  return { ok: true, value: { ...tray.value, mode: mode as CheckoutMode, acceptedPolicies: true } }
}
