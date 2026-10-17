import { useEffect, useRef, useState } from 'react'
import { BIZ } from '../config/content'
import { formatDay, isDay, isOpenDay } from '../shared/schedule'

type Kind = 'success' | 'cancelled'

/** Read ?checkout=success|cancelled once, on first render. */
function readReturn(): Kind | '' {
  if (typeof window === 'undefined') return ''
  const c = new URLSearchParams(window.location.search).get('checkout')
  return c === 'success' || c === 'cancelled' ? c : ''
}

/** The day we scheduled at checkout (?day=YYYY-MM-DD). Display only: ignored unless it is a real open day. */
function readDay(): string {
  if (typeof window === 'undefined') return ''
  const d = new URLSearchParams(window.location.search).get('day')
  return isDay(d) && isOpenDay(d) ? d : ''
}

/**
 * Full-width confirmation panel pinned to the top of the page after Stripe sends the customer back
 * (?checkout=success&session_id=... or ?checkout=cancelled). Stays until closed. The query string is
 * cleaned with history.replaceState only after the panel has rendered.
 */
export default function OrderReturn() {
  const [kind, setKind] = useState<Kind | ''>(readReturn)
  const [day] = useState(readDay)
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!kind) return
    const u = new URL(window.location.href)
    u.searchParams.delete('checkout')
    u.searchParams.delete('session_id')
    u.searchParams.delete('day')
    window.history.replaceState(null, '', u.pathname + u.search)
  }, [kind])

  if (!kind) return null
  const ok = kind === 'success'
  return (
    <div className={'order-return' + (ok ? ' ok' : '')} role="status" aria-live="polite" data-return={kind}>
      <div className="or-in">
        <div className="or-msg">
          <b className="or-t">{ok ? 'Thank you! Your order is in.' : 'No charge was made.'}</b>
          <p>
            {ok
              ? `${day ? `Your pickup or delivery day: ${formatDay(day, true)}, 11 AM to 7 PM. If that day fills up first, we move you to the next open day.` : 'Your pickup or delivery is at least 48 hours after your order, on the next open day.'} Check your email for your Stripe receipt.`
              : 'Your checkout was cancelled. Build your tray again whenever you’re ready.'}
          </p>
          <p className="or-dm">Questions? DM <a href={BIZ.instagramUrl} target="_blank" rel="noopener">{BIZ.instagram}</a></p>
        </div>
        <button type="button" ref={closeBtn} className="or-x" onClick={() => setKind('')} aria-label="Close this message">Close<span aria-hidden="true"> ✕</span></button>
      </div>
    </div>
  )
}
