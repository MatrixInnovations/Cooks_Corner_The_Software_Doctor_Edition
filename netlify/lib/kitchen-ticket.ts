import { dollars } from '../../src/shared/catalog'
import { formatDay, isDay } from '../../src/shared/schedule'
import type { OrderRecord } from './orders'
import type { Env } from './types'

/**
 * Kitchen ticket: ONE plain email to the owner when a new paid order is recorded.
 * OFF unless ORDER_NOTIFY_ENABLED=true AND ORDER_NOTIFY_TO + RESEND_API_KEY + ORDER_EMAIL_FROM are set.
 * Independent of the customer confirmation (email.ts). Failures never throw: the caller logs and moves on.
 */
export type KitchenResult = { sent: boolean; reason?: string }

const MAX_RECIPIENTS = 5
const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/

/** Single line, no control characters (blocks header/ticket injection), trimmed and capped. */
export const oneLine = (s: string | null | undefined, max = 200) =>
  // eslint-disable-next-line no-control-regex
  (s ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export function notifyRecipients(env: Env): string[] {
  return (env.ORDER_NOTIFY_TO ?? '').split(',').map((s) => s.trim()).filter((s) => EMAIL_RE.test(s)).slice(0, MAX_RECIPIENTS)
}

export function kitchenTicketEnabled(env: Env): KitchenResult | null {
  if (env.ORDER_NOTIFY_ENABLED !== 'true') return { sent: false, reason: 'disabled' }
  if (!env.ORDER_NOTIFY_TO?.trim()) return { sent: false, reason: 'disabled' }
  if (!env.RESEND_API_KEY || !env.ORDER_EMAIL_FROM || notifyRecipients(env).length === 0) return { sent: false, reason: 'not_configured' }
  return null
}

const etTime = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown time'
  const s = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d)
  return `${s} ET`
}

/** The day line for the ticket: the assigned day, flagged if it moved from the checkout estimate or could not be assigned. */
export function dayLine(o: OrderRecord): { label: string; text: string; flag: boolean } {
  const verb = o.fulfillment === 'delivery' ? 'DELIVER' : 'PICKUP'
  if (o.assignedDay === undefined) return { label: `${verb} DAY`, text: 'not assigned (older order): ready 48 hours after the order time', flag: false }
  if (!isDay(o.assignedDay)) return { label: `${verb} DAY`, text: 'NO DAY AVAILABLE: every day is full, schedule this one by hand', flag: true }
  const day = formatDay(o.assignedDay, true)
  const moved = o.dayMoved && isDay(o.estimatedDay) ? ` (MOVED from ${formatDay(o.estimatedDay)}: that day filled up)` : ''
  return { label: `${verb} DAY`, text: `${day}${moved}, 11 AM to 7 PM`, flag: Boolean(moved) }
}

const addressLines = (a: OrderRecord['deliveryAddress']): string[] => {
  if (!a) return []
  const cityLine = [oneLine(a.city, 80), [oneLine(a.state, 20), oneLine(a.postal_code, 20)].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [oneLine(a.line1), oneLine(a.line2), cityLine].filter(Boolean)
}

export const stripeLink = (o: OrderRecord) =>
  o.stripe.paymentIntent ? `https://dashboard.stripe.com/${o.id.startsWith('cs_test_') ? 'test/' : ''}payments/${encodeURIComponent(o.stripe.paymentIntent)}` : null

export type Ticket = { subject: string; text: string; html: string; replyTo: string | null }

export function buildKitchenTicket(order: OrderRecord): Ticket {
  const t = order.tray
  const method = order.fulfillment === 'delivery' ? 'DELIVERY' : 'PICKUP'
  const name = oneLine(order.customer.name, 60)
  const email = oneLine(order.customer.email, 120)
  const phone = oneLine(order.customer.phone, 40)
  const allergy = oneLine(order.allergyNote, 500)
  const amount = dollars(order.amountTotalCents)
  const ref = order.id.slice(-10)
  const when = etTime(order.receivedAt)
  const pkg = `${t.meals} meals${order.mode === 'subscription' ? ' (MONTHLY SUBSCRIPTION)' : ''}`
  const list = (a: string[]) => a.map((x) => oneLine(x, 80)).filter(Boolean).join(', ') || 'none'
  const addr = addressLines(order.deliveryAddress)
  const link = stripeLink(order)
  const day = dayLine(order)
  const dayShort = isDay(order.assignedDay) ? ` for ${formatDay(order.assignedDay)}` : ''
  const subject = oneLine(`New order: ${t.meals} meals, ${method}${dayShort}, ${amount}${name ? ` (${name})` : ''}`, 150)

  const rows: Array<[string, string]> = [
    ['Package', pkg],
    ['Proteins', list(t.proteins)],
    ['Vegetables', list(t.vegetables)],
    ['Starches', list(t.starches)],
    ['Sauces', list(t.sauces)],
  ]
  const contact: Array<[string, string]> = [
    ['Name', name || 'not given'],
    ['Phone', phone || 'not given'],
    ['Email', email || 'not given'],
  ]
  const addrText = order.fulfillment === 'delivery' ? (addr.length ? addr : ['ADDRESS MISSING: check the payment in Stripe']) : []
  const total = `${amount} paid`

  const text = [
    `*** ${method} ***`,
    `Order ${ref}   ${when}`,
    `*** ${day.label}: ${day.text.toUpperCase()} ***`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    allergy ? `*** ALLERGY NOTE: ${allergy.toUpperCase()} ***` : 'ALLERGY NOTE: NONE',
    '',
    ...contact.map(([k, v]) => `${k}: ${v}`),
    ...(order.fulfillment === 'delivery' ? ['Deliver to:', ...addrText.map((l) => `  ${l}`)] : ['Pickup: customer comes to the kitchen (no delivery address)']),
    '',
    `Amount: ${total}`,
    link ? `Stripe: ${link}` : 'Stripe: payment link not available',
  ].join('\n')

  const e = escapeHtml
  const td = 'padding:4px 12px 4px 0;vertical-align:top;'
  const table = (r: Array<[string, string]>) =>
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:16px;">${r.map(([k, v]) => `<tr><td style="${td}color:#555;"><b>${e(k)}</b></td><td style="${td}">${e(v)}</td></tr>`).join('')}</table>`
  const banner = order.fulfillment === 'delivery' ? '#b45309' : '#166534'
  const html = [
    '<!doctype html><html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;"><div style="max-width:560px;">',
    `<div style="background:${banner};color:#fff;font-size:28px;font-weight:bold;padding:12px 16px;letter-spacing:1px;">${method}</div>`,
    `<p style="margin:12px 0;font-size:15px;color:#333;">Order <b>${e(ref)}</b> &middot; ${e(when)}</p>`,
    `<div style="margin:12px 0;padding:10px 14px;background:${day.flag ? '#fee2e2' : '#e0f2fe'};border:2px solid ${day.flag ? '#dc2626' : '#0369a1'};font-size:20px;font-weight:bold;">${e(day.label)}: ${e(day.text)}</div>`,
    table(rows),
    allergy
      ? `<div style="margin:16px 0;padding:12px 14px;background:#fef08a;border:3px solid #dc2626;font-size:20px;font-weight:bold;color:#7f1d1d;">ALLERGY NOTE: ${e(allergy)}</div>`
      : '<div style="margin:16px 0;padding:10px 14px;background:#f3f4f6;border:1px solid #d1d5db;font-size:16px;font-weight:bold;">ALLERGY NOTE: NONE</div>',
    table(contact),
    order.fulfillment === 'delivery'
      ? `<p style="font-size:16px;margin:12px 0 4px;"><b>Deliver to:</b><br>${addrText.map(e).join('<br>')}</p>`
      : '<p style="font-size:16px;margin:12px 0 4px;"><b>Pickup:</b> customer comes to the kitchen (no delivery address)</p>',
    `<p style="font-size:18px;margin:12px 0;"><b>Amount:</b> ${e(total)}</p>`,
    link ? `<p style="font-size:14px;"><a href="${e(link)}">Open payment in Stripe</a></p>` : '',
    '</div></body></html>',
  ].join('')

  return { subject, text, html, replyTo: EMAIL_RE.test(email) ? email : null }
}

export async function sendKitchenTicket(order: OrderRecord, env: Env, fetchImpl: typeof fetch = fetch): Promise<KitchenResult> {
  const off = kitchenTicketEnabled(env)
  if (off) return off
  try {
    const tk = buildKitchenTicket(order)
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.ORDER_EMAIL_FROM, to: notifyRecipients(env), subject: tk.subject, text: tk.text, html: tk.html,
        ...(tk.replyTo ? { reply_to: tk.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(6000),
    })
    return res.ok ? { sent: true } : { sent: false, reason: `provider_${res.status}` }
  } catch {
    return { sent: false, reason: 'network_error' }
  }
}
