import { META_SEP } from './session'
import type { Stripe } from './types'

export type OrderRecord = {
  id: string // Stripe Checkout Session id
  createdAt: string
  receivedAt: string
  status: 'paid'
  mode: 'payment' | 'subscription'
  amountTotalCents: number
  currency: string
  customer: { email: string | null; name: string | null; phone: string | null }
  fulfillment: 'pickup' | 'delivery'
  deliveryAddress: Stripe.Address | null
  tray: { meals: number; proteins: string[]; vegetables: string[]; starches: string[]; sauces: string[] }
  allergyNote: string
  policiesAcceptedAt: string | null
  stripe: { paymentIntent: string | null; subscription: string | null; customer: string | null }
  /** Kitchen-ticket email outcome (set by the webhook after the order is stored; absent on older orders). */
  kitchenTicket?: { sent: boolean; reason?: string; at: string }
}

export interface OrderStore {
  getOrder(id: string): Promise<OrderRecord | null>
  putOrder(o: OrderRecord): Promise<void>
  hasEvent(id: string): Promise<boolean>
  markEvent(id: string): Promise<void>
}

const list = (s: string | undefined) => (s ? s.split(META_SEP).filter(Boolean) : [])

/** Builds the stored order from a completed Checkout Session. Tray details come from the metadata WE set at session creation. */
export function orderFromSession(s: Stripe.Checkout.Session, now: Date = new Date()): OrderRecord {
  const m = s.metadata ?? {}
  const anyS = s as unknown as { collected_information?: { shipping_details?: { address?: Stripe.Address } }; shipping_details?: { address?: Stripe.Address } }
  const ship = anyS.collected_information?.shipping_details?.address ?? anyS.shipping_details?.address ?? null
  return {
    id: s.id,
    createdAt: new Date(s.created * 1000).toISOString(),
    receivedAt: now.toISOString(),
    status: 'paid',
    mode: s.mode === 'subscription' ? 'subscription' : 'payment',
    amountTotalCents: s.amount_total ?? 0,
    currency: s.currency ?? 'usd',
    customer: { email: s.customer_details?.email ?? null, name: s.customer_details?.name ?? null, phone: s.customer_details?.phone ?? null },
    fulfillment: m.fulfillment === 'delivery' ? 'delivery' : 'pickup',
    deliveryAddress: ship,
    tray: { meals: Number(m.meals) || 0, proteins: list(m.proteins), vegetables: list(m.vegetables), starches: list(m.starches), sauces: list(m.sauces) },
    allergyNote: m.allergy_note ?? '',
    policiesAcceptedAt: m.policies_accepted_at ?? null,
    stripe: {
      paymentIntent: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null,
      subscription: typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null,
      customer: typeof s.customer === 'string' ? s.customer : s.customer?.id ?? null,
    },
  }
}

/** Netlify Blobs-backed store: `orders` (key = session id) and `stripe-events` (dedupe). Loaded lazily so tests don't need Blobs. */
export async function blobOrderStore(): Promise<OrderStore> {
  const { getStore } = await import('@netlify/blobs')
  const orders = getStore({ name: 'orders', consistency: 'strong' })
  const events = getStore({ name: 'stripe-events', consistency: 'strong' })
  return {
    async getOrder(id) { return ((await orders.get(id, { type: 'json' })) as OrderRecord | null) ?? null },
    async putOrder(o) { await orders.setJSON(o.id, o) },
    async hasEvent(id) { return (await events.get(id)) !== null },
    async markEvent(id) { await events.set(id, new Date().toISOString()) },
  }
}
