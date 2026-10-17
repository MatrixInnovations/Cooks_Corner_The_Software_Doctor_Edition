import { dollars } from '../../src/shared/catalog'
import { formatDay, isDay } from '../../src/shared/schedule'
import type { OrderRecord } from './orders'
import type { Env } from './types'

export type EmailResult = { sent: boolean; reason?: string }

/**
 * Optional order confirmation. OFF unless ORDER_EMAIL_ENABLED=true AND RESEND_API_KEY + ORDER_EMAIL_FROM are set.
 * Failures never break the webhook (the order is already stored). Provider: Resend (plain fetch, no SDK).
 */
export async function sendOrderConfirmation(order: OrderRecord, env: Env, fetchImpl: typeof fetch = fetch): Promise<EmailResult> {
  if (env.ORDER_EMAIL_ENABLED !== 'true') return { sent: false, reason: 'disabled' }
  if (!env.RESEND_API_KEY || !env.ORDER_EMAIL_FROM) return { sent: false, reason: 'not_configured' }
  if (!order.customer.email) return { sent: false, reason: 'no_recipient' }
  const t = order.tray
  const lines = [
    `Thanks for your order${order.customer.name ? ', ' + order.customer.name.split(' ')[0] : ''}!`,
    '',
    `${t.meals}-meal ${order.mode === 'subscription' ? 'monthly subscription' : 'package'}: ${dollars(order.amountTotalCents)} total`,
    `Proteins: ${t.proteins.join(', ') || 'n/a'}`,
    `Sides: ${[...t.vegetables, ...t.starches].join(', ') || 'n/a'}`,
    `Sauces: ${t.sauces.join(', ') || 'none'}`,
    isDay(order.assignedDay)
      ? `Your ${order.fulfillment === 'delivery' ? 'delivery' : 'pickup'} day: ${formatDay(order.assignedDay, true)}, 11 AM to 7 PM.`
      : `${order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}: at least 48 hours after your order. We will confirm your day.`,
    order.allergyNote ? `Allergies you listed: ${order.allergyNote}` : 'No allergies listed.',
    '',
    "Questions? DM @_cooks_corner_ on Instagram or call 704.350.5827.",
    `Order reference: ${order.id.slice(-10)}`,
  ]
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.ORDER_EMAIL_FROM, to: [order.customer.email], ...(env.ORDER_NOTIFY_BCC ? { bcc: [env.ORDER_NOTIFY_BCC] } : {}), subject: "Your Cook's Corner order", text: lines.join('\n') }),
    })
    return res.ok ? { sent: true } : { sent: false, reason: `provider_${res.status}` }
  } catch {
    return { sent: false, reason: 'network_error' }
  }
}
