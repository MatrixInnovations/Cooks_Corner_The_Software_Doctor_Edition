import { useEffect, useRef, useState } from 'react'
import { BIZ } from '../config/content'

type Kind = 'success' | 'cancelled'

/** Read ?checkout=success|cancelled once, on first render. */
function readReturn(): Kind | '' {
  if (typeof window === 'undefined') return ''
  const c = new URLSearchParams(window.location.search).get('checkout')
  return c === 'success' || c === 'cancelled' ? c : ''
}

/**
 * Full-width confirmation panel pinned to the top of the page after Stripe sends the customer back
 * (?checkout=success&session_id=... or ?checkout=cancelled). Stays until closed. The query string is
 * cleaned with history.replaceState only after the panel has rendered.
 */
export default function OrderReturn() {
  const [kind, setKind] = useState<Kind | ''>(readReturn)
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!kind) return
    const u = new URL(window.location.href)
    u.searchParams.delete('checkout')
    u.searchParams.delete('session_id')
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
              ? 'Your pickup or delivery will happen 48 hours after your order. Check your email for your Stripe receipt.'
              : 'Your checkout was cancelled. Build your tray again whenever you’re ready.'}
          </p>
          <p className="or-dm">Questions? DM <a href={BIZ.instagramUrl} target="_blank" rel="noopener">{BIZ.instagram}</a></p>
        </div>
        <button type="button" ref={closeBtn} className="or-x" onClick={() => setKind('')} aria-label="Close this message">Close<span aria-hidden="true"> ✕</span></button>
      </div>
    </div>
  )
}
