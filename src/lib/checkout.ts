import type { TraySelection } from '../shared/catalog'

const DM = 'Please try again, or order by DM.'

/** Turns a failed checkout response (or a network failure) into a message a customer can act on, with a short cause hint. */
export function checkoutErrorMessage(status: number | null, code?: string, details?: string[]): string {
  if (status === null) return `We couldn't reach the checkout. Check your connection. ${DM} (cause: network)`
  if (status === 429 || code === 'rate_limited') return 'Too many checkout attempts in a row. Wait a few minutes and try again, or order by DM. (cause: rate limit)'
  if (status === 400 && details?.length) return `${details[0]} (cause: tray check)`
  if (status === 400 || status === 415 || status === 413) return `Something about this tray wasn't accepted. Refresh the page and rebuild it. ${DM} (cause: ${code ?? 'invalid request'})`
  if (code === 'fully_booked') return `We're fully booked for now. Please order by DM. (cause: fully booked)`
  if (code === 'not_configured' || status === 503) return `Checkout is not switched on yet. Please order by DM. (cause: not configured)`
  if (status === 403) return `Checkout was blocked for this page address. Open the site from its main link and ${DM.toLowerCase()} (cause: origin)`
  if (code === 'stripe_error' || status === 502) return `Our payment provider didn't start the checkout. ${DM} (cause: payment provider)`
  return `Checkout is unavailable right now. ${DM} (cause: ${code ?? `status ${status}`})`
}

/** Posts the tray to the server (which re-validates and prices it) and returns the Stripe Checkout URL. Only used when FEATURES.liveCheckout is on. */
export async function startCheckout(sel: TraySelection): Promise<string> {
  let res: Response
  try {
    res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({ mode: 'payment', acceptedPolicies: true, ...sel }),
    })
  } catch {
    throw new Error(checkoutErrorMessage(null))
  }
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { code?: string; message?: string; details?: string[] } }
  if (!res.ok || !data.url) throw new Error(checkoutErrorMessage(res.status, data.error?.code, data.error?.details))
  if (!/^https:\/\/checkout\.stripe\.com\//.test(data.url)) throw new Error(checkoutErrorMessage(502, 'bad_url'))
  return data.url
}
