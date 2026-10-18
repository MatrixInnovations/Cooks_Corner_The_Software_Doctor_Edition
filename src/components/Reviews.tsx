import { useEffect, useRef, useState } from 'react'
import { REVIEWS, REVIEW_SUMMARY } from '../config/content'
import { SHOW_REVIEW_TAGS } from '../config/features'
import { Need } from './ui'

/**
 * Customer quotes as a native scroll-snap carousel: swipe, trackpad, arrow keys (the track is focusable),
 * prev/next buttons, or the position dots. Nothing auto-advances. Every quote is in the DOM and readable at all times.
 */
export default function Reviews() {
  const track = useRef<HTMLUListElement>(null)
  const [i, setI] = useState(0)
  const n = REVIEWS.length

  useEffect(() => {
    const el = track.current
    if (!el) return
    let raf = 0
    const run = () => {
      raf = 0
      const slides = Array.from(el.children) as HTMLElement[]
      const left = el.scrollLeft
      let best = 0
      let d = Infinity
      slides.forEach((s, k) => {
        const dist = Math.abs(s.offsetLeft - el.offsetLeft - left)
        if (dist < d) { d = dist; best = k }
      })
      if (left + el.clientWidth >= el.scrollWidth - 4) best = n - 1
      setI(best)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(run) }
    el.addEventListener('scroll', on, { passive: true })
    return () => { el.removeEventListener('scroll', on); if (raf) cancelAnimationFrame(raf) }
  }, [n])

  const go = (k: number) => {
    const el = track.current
    if (!el) return
    const t = Math.max(0, Math.min(n - 1, k))
    const s = el.children[t] as HTMLElement
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: s.offsetLeft - el.offsetLeft, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <section id="reviews" className="sec bone2 reviews" data-theme="light" aria-labelledby="rv-t">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow rules">Kind words</div>
          <h2 className="disp" id="rv-t">What customers say</h2>
          <p className="rv-score" aria-label={`${REVIEW_SUMMARY.score} stars from ${REVIEW_SUMMARY.count} Google reviews`}>
            <span aria-hidden="true">{REVIEW_SUMMARY.line}</span>
          </p>
          {/* PREVIEW ONLY: remove once Marsaun has OK'd publishing these customer quotes. */}
          {SHOW_REVIEW_TAGS && <p><Need>CONFIRM WITH MARSAUN: OK to publish customer quotes</Need></p>}
        </div>

        <div className="rv" role="region" aria-roledescription="carousel" aria-label="Customer quotes">
          <ul className="rv-track" ref={track} tabIndex={0} aria-label="Quotes, scroll sideways or use the arrow keys">
            {REVIEWS.map((r, k) => (
              <li className="rv-card" key={k} aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}>
                <figure>
                  <span className="rv-mark disp" aria-hidden="true">“</span>
                  <blockquote><p>{r.text}</p></blockquote>
                  <figcaption>
                    <span className="rv-who">{r.who}</span>
                    <span className="rv-via">
                      {r.stars && <><span className="rv-stars" aria-hidden="true">★★★★★</span><span className="sr">5 stars, </span></>}
                      {r.via}
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <div className="rv-ctl">
            <button type="button" className="rv-arrow" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous quote">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="rv-dots">
              {REVIEWS.map((_, k) => (
                <button type="button" key={k} onClick={() => go(k)} aria-label={`Go to quote ${k + 1} of ${n}`} aria-current={k === i ? 'true' : undefined}><span /></button>
              ))}
            </div>
            <button type="button" className="rv-arrow" onClick={() => go(i + 1)} disabled={i === n - 1} aria-label="Next quote">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
