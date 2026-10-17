import type Stripe from 'stripe'
import { DELIVERY_FEE_CENTS, SAUCES, packageFor, planFor } from '../../src/shared/catalog'
import type { CheckoutRequest } from './cart'

export const META_SEP = ' | '
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/** Human-readable names for the sauces (ids are stored in the request, names are what the kitchen reads). */
const sauceNames = (ids: string[]) => ids.map((id) => SAUCES.find((s) => s.id === id)?.name ?? id)

/**
 * Builds the Stripe Checkout Session params from a validated request. Every amount comes from the server-side catalog.
 * One-time packages use payment mode; monthly plans use subscription mode.
 */
export function buildSessionParams(
  req: CheckoutRequest,
  siteUrl: string,
  now: Date = new Date(),
  paymentMethodTypes: Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType[] = ['card'],
): Stripe.Checkout.SessionCreateParams {
  const sub = req.mode === 'subscription'
  const unit = sub ? planFor(req.meals)!.priceCents : packageFor(req.meals)!.priceCents
  const delivery = req.fulfillment === 'delivery'
  const description = clip(
    `Proteins: ${req.proteins.join(', ')}. Sides: ${[...req.vegetables, ...req.starches].join(', ') || 'not chosen'}. Sauces: ${sauceNames(req.sauces).join(', ') || 'none'}.`,
    300,
  )
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: unit,
        ...(sub ? { recurring: { interval: 'month' as const } } : {}),
        product_data: { name: sub ? `${req.meals}-meal monthly subscription` : `${req.meals}-meal tray package`, description },
      },
    },
  ]
  if (delivery && !sub) {
    line_items.push({
      quantity: 1,
      price_data: { currency: 'usd', unit_amount: DELIVERY_FEE_CENTS, product_data: { name: 'Delivery' } },
    })
  }
  const metadata: Record<string, string> = {
    source: 'cooks-corner-site',
    mode: req.mode,
    meals: String(req.meals),
    proteins: req.proteins.join(META_SEP),
    vegetables: req.vegetables.join(META_SEP),
    starches: req.starches.join(META_SEP),
    sauces: sauceNames(req.sauces).join(META_SEP),
    fulfillment: req.fulfillment,
    allergy_note: clip(req.allergyNote, 500),
    policies_accepted_at: now.toISOString(),
    catalog_total_cents: String(unit + (delivery && !sub ? DELIVERY_FEE_CENTS : 0)),
  }
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: req.mode,
    line_items,
    metadata,
    success_url: `${siteUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}#build`,
    cancel_url: `${siteUrl}/?checkout=cancelled#build`,
    // Card only (Apple Pay / Google Pay still ride on card). With Stripe's dynamic list no method is pre-selected and a click on
    // "Pay" with nothing chosen only flashes a small "payment method required" note, which looked like Pay did nothing (pickup has
    // no address block to anchor the eye). A single method renders the card form already open.
    allowed_payment_method_types: paymentMethodTypes,
    phone_number_collection: { enabled: true },
    billing_address_collection: 'auto',
    custom_text: {
      submit: { message: `By paying you accept the order changes and refunds policy, the food allergy notice and the reheating and storage guide: ${siteUrl}/#policies` },
    },
    ...(delivery ? { shipping_address_collection: { allowed_countries: ['US' as const] } } : {}),
  }
  if (sub) params.subscription_data = { metadata }
  else params.payment_intent_data = { metadata, description: `Cook's Corner ${req.meals}-meal package (${req.fulfillment})` }
  return params
}

/** Sum of the line items in cents (used by tests and as a server-side sanity check). */
export function sessionTotalCents(p: Stripe.Checkout.SessionCreateParams): number {
  return (p.line_items ?? []).reduce((n, li) => n + (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 1), 0)
}
