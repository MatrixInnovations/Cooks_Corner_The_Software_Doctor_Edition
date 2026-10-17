import type { TraySelection } from '../shared/catalog'

/** Posts the tray to the server (which re-validates and prices it) and returns the Stripe Checkout URL. Only used when FEATURES.liveCheckout is on. */
export async function startCheckout(sel: TraySelection): Promise<string> {
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({ mode: 'payment', acceptedPolicies: true, ...sel }),
  })
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string; details?: string[] } }
  if (!res.ok || !data.url) throw new Error(data.error?.details?.[0] ?? data.error?.message ?? 'Checkout is unavailable right now. Please order by DM.')
  return data.url
}
