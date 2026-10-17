import { useEffect, useId, useRef, useState } from 'react'
import { BIZ, CHEF_FACTS, CHEF_MENU_ITEMS, CHEF_STORY, CHEF_TICKET_01, CHEF_TICKET_03 } from '../config/content'
import { PORTRAIT } from '../config/photos'
import { OrderButton } from './ui'

/** Round "CC / Charlotte" stamp (SVG, saffron on charcoal). */
function Seal() {
  const id = useId().replace(/:/g, '')
  return (
    <svg className="cp-seal" viewBox="0 0 132 132" aria-hidden="true" focusable="false">
      <defs><path id={id} d="M66 66 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" /></defs>
      <circle cx="66" cy="66" r="63" fill="#17140f" stroke="#f2b632" strokeWidth="2" />
      <circle cx="66" cy="66" r="56" fill="none" stroke="#f2b632" strokeWidth="1" strokeDasharray="2 3" />
      <text fontFamily="Barlow Condensed" fontWeight="700" fontSize="13" letterSpacing="3.1" fill="#f2b632"><textPath href={`#${id}`}>{'COOK\u2019S CORNER · MEAL PREP · '}</textPath></text>
      <text x="66" y="78" textAnchor="middle" fontFamily="Anton" fontSize="38" fill="#f4ecdd" letterSpacing="1">CC</text>
      <text x="66" y="94" textAnchor="middle" fontFamily="Barlow Condensed" fontWeight="700" fontSize="9" letterSpacing="2.4" fill="#f2b632">CHARLOTTE</text>
    </svg>
  )
}

const TICKETS = 3
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * "Meet the chef" = The Chef's Pass (Sundae's approved layout).
 * Interaction: three notched tickets hang from a rail. Desktop: all three visible, they slide down 24px and fade in
 * (500ms, staggered 0/120/240ms, once, transform + opacity only) when the rail is 35% in view.
 * Mobile: the strip is a swipeable scroll-snap carousel (prev/next buttons, keyboard arrows on the focusable track,
 * counter follows the scroll); each ticket animates in on its own as soon as it peeks in.
 * Reduced motion: final state at once, no animation. Without JS tickets are simply visible.
 * Background publishing approved by Marsaun. Years cooking and signature dish come from CHEF_FACTS (Andrew). Never invent facts here.
 */
export default function Chef() {
  const sec = useRef<HTMLElement>(null)
  const tix = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [i, setI] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    if (reduce || !('IntersectionObserver' in window)) return () => mq.removeEventListener('change', sync)
    setReady(true)
    const el = tix.current
    const cards = Array.from(el?.querySelectorAll<HTMLElement>('.cp-ticket') ?? [])
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (!e.isIntersecting) return
        if (e.target === el) el?.classList.add('in')
        else (e.target as HTMLElement).classList.add('in')
        io.unobserve(e.target)
      }),
      { threshold: mq.matches ? 0.04 : 0.35 },
    )
    // desktop: the whole strip triggers once; mobile: each ticket triggers by itself
    if (mq.matches) cards.forEach((c) => io.observe(c))
    else if (el) io.observe(el)
    return () => { io.disconnect(); mq.removeEventListener('change', sync) }
  }, [mobile])

  useEffect(() => {
    const el = tix.current
    if (!el || !mobile) return
    let raf = 0
    const run = () => {
      raf = 0
      const first = el.children[0] as HTMLElement
      const step = (el.children[1] as HTMLElement).offsetLeft - first.offsetLeft
      let k = Math.round(el.scrollLeft / step)
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) k = TICKETS - 1
      setI(Math.max(0, Math.min(TICKETS - 1, k)))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(run) }
    el.addEventListener('scroll', on, { passive: true })
    return () => { el.removeEventListener('scroll', on); if (raf) cancelAnimationFrame(raf) }
  }, [mobile])

  const go = (k: number) => {
    const el = tix.current
    if (!el) return
    const t = Math.max(0, Math.min(TICKETS - 1, k))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const c = el.children[t] as HTMLElement
    el.scrollTo({ left: c.offsetLeft - (el.children[0] as HTMLElement).offsetLeft, behavior: reduce ? 'auto' : 'smooth' })
  }

  const done = (e: React.AnimationEvent<HTMLElement>) => e.currentTarget.classList.add('done')
  const base = `${import.meta.env.BASE_URL}people/${PORTRAIT.file}`

  return (
    <section id="chef" ref={sec} className={'sec dark chef' + (ready ? ' js-ready' : '')} data-theme="dark" aria-labelledby="chef-t">
      <div className="wrap">
        <div className="chef-top">
          <div className="chef-copy">
            <div className="eyebrow chef-eyebrow">Meet the chef<i /></div>
            <h2 id="chef-t" className="disp">Meet<br /><em>Marsaun Cook.</em></h2>
            <p className="chef-sub">The cook behind every tray.</p>
            <div className="chef-story">
              <h3>Marsaun’s story</h3>
              {/* Background and wording approved by Marsaun/Andrew: no confirm tags. */}
              <p>{CHEF_STORY}</p>
            </div>
            <dl className="chef-strip">
              <div><dt>Years cooking</dt><dd className="v">{CHEF_FACTS.years}</dd></div>
              <div><dt>Pickup</dt><dd className="v">Cooked fresh for pickup on Old Statesville Rd.</dd></div>
              <div><dt>Signature dish</dt><dd className="v">{CHEF_FACTS.signature}</dd></div>
            </dl>
            <div className="chef-btns">
              <OrderButton className="btn p">Order now</OrderButton>
              <a className="btn g" href="#menu">See the menu</a>
            </div>
          </div>

          <div className="chef-pwrap">
            <figure className="chef-portrait">
              {PORTRAIT.ready && (
                <picture>
                  <source media="(max-width: 820px)" srcSet={`${base}-m.webp`} type="image/webp" />
                  <source media="(max-width: 820px)" srcSet={`${base}-m.jpg`} type="image/jpeg" />
                  <source srcSet={`${base}-d.webp`} type="image/webp" />
                  <img src={`${base}-d.jpg`} alt={PORTRAIT.alt} width={800} height={1200} decoding="async" />
                </picture>
              )}
              <figcaption className="cp-pill"><b>Marsaun Cook</b><span>Founder · Cook’s Corner</span></figcaption>
            </figure>
            <Seal />
          </div>
        </div>

        <div className="cp-pass">
          <div className="cp-passlabel">
            <span className="eyebrow">The chef’s pass</span>
            <span className="cp-n">
              <span aria-live="polite">{pad(i + 1)} / {pad(TICKETS)}</span>
              <span className="cp-ctl">
                <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous ticket"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                <button type="button" onClick={() => go(i + 1)} disabled={i === TICKETS - 1} aria-label="Next ticket"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
              </span>
            </span>
          </div>
          <div className="cp-rail" aria-hidden="true" />
          <div
            className="cp-tix"
            ref={tix}
            {...(mobile ? { tabIndex: 0, role: 'group', 'aria-roledescription': 'carousel', 'aria-label': 'The chef’s pass, three tickets. Swipe or use the arrow keys.' } : {})}
          >
            <div className="cp-tk" style={{ '--i': 0 } as React.CSSProperties}>
              <div className="cp-clip" aria-hidden="true" />
              <article className="cp-ticket" onAnimationEnd={done} aria-label="Ticket 1 of 3">
                <div className="cp-th"><span>Ticket 01 · Who’s cooking</span></div>
                <div className="cp-tb">
                  <h3>{CHEF_TICKET_01.name}</h3>
                  <p>{CHEF_TICKET_01.role}</p>
                  <div className="cp-perf" />
                  <p className="cp-flush">{CHEF_TICKET_01.line}</p>
                </div>
              </article>
            </div>
            <div className="cp-tk" style={{ '--i': 1 } as React.CSSProperties}>
              <div className="cp-clip" aria-hidden="true" />
              <article className="cp-ticket" onAnimationEnd={done} aria-label="Ticket 2 of 3">
                <div className="cp-th"><span>Ticket 02 · What he cooks</span></div>
                <div className="cp-tb">
                  <h3 className="cp-s">Curated meal prep</h3>
                  <ul>{CHEF_MENU_ITEMS.map((m) => <li key={m}>{m}</li>)}</ul>
                  <div className="cp-perf" />
                  <p className="cp-flush">Housemade sauces. Catering and private events.</p>
                </div>
              </article>
            </div>
            <div className="cp-tk" style={{ '--i': 2 } as React.CSSProperties}>
              <div className="cp-clip" aria-hidden="true" />
              <article className="cp-ticket" onAnimationEnd={done} aria-label="Ticket 3 of 3">
                <div className="cp-th"><span>Ticket 03 · Why he cooks</span></div>
                <div className="cp-tb">
                  <h3 className="cp-s">{CHEF_TICKET_03.head[0]} {CHEF_TICKET_03.head[1]}<br />{CHEF_TICKET_03.head[2]}</h3>
                  <div className="cp-perf" />
                  <p className="cp-flush">{CHEF_TICKET_03.why}</p>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div className="chef-foot">
          <span>{BIZ.name} · {BIZ.address}</span>
          <span>Meal preps · Catering · Private events</span>
        </div>
      </div>
    </section>
  )
}
