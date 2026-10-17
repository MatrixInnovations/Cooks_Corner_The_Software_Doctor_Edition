import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BIZ, ORDER_NOTE, PACKAGES, PICKUP_HOURS_SHORT, POLICIES, STEPS, TURNAROUND } from '../config/content'
import { PHOTOS, type PhotoKey } from '../config/photos'
import { Need, OrderButton, Photo } from './ui'
import { steamState } from '../three/steamState'

const Steam = lazy(() => import('../three/Steam'))

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
/** smoothstep: slow in, slow out, no overshoot */
const sm = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** one 100vh of scroll per step, plus a short hold on the last one */
const STEP_COUNT = 7
const HOLD_VH = 0.5
const SCROLL_VH = STEP_COUNT + HOLD_VH + 1 // + the pinned viewport itself

function webglOK() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

type Vals = Record<string, number>
/** All scroll-linked values for a continuous step position s (0..7). Pure, so reduced-motion can reuse it. */
function compute(s: number): Vals {
  const heroFade1 = 1 - sm(0.7, 0.95, s) // leaves for the empty tray at the end of step 1
  const heroIn2 = s < 1.05 ? 0 : sm(1.1, 1.45, s)
  const heroOut5 = 1 - sm(4.3, 4.5, s)
  const hero7 = sm(6.0, 6.2, s) * (1 - sm(6.65, 6.7, s))
  const hero = s < 1.05 ? heroFade1 : s < 5.9 ? heroIn2 * heroOut5 : hero7
  return {
    empty: sm(0.55, 0.8, s) * (1 - sm(1.45, 1.55, s)),
    hero,
    heroScale: s < 1.05 ? 1 : s < 4 ? 1.02 - 0.02 * sm(1.1, 1.6, s) : s < 5.9 ? 1 - 0.08 * sm(4.0, 4.5, s) : 1,
    stack: sm(4.05, 4.45, s) * (1 - sm(5.45, 5.55, s)),
    pickup: sm(5.05, 5.45, s) * (1 - sm(6.15, 6.4, s)),
    pickupX: 16 * (1 - sm(5.05, 5.6, s)),
    sealed: sm(6.35, 6.65, s),
    ringA: sm(1.35, 1.5, s) * (1 - sm(1.8, 2.0, s)),
    ringBC: sm(2.3, 2.5, s) * (1 - sm(2.8, 3.0, s)),
    ringD: sm(3.3, 3.5, s) * (1 - sm(3.75, 3.95, s)),
    c1: 1 - sm(0.55, 0.85, s),
    c2: sm(1.12, 1.42, s) * (1 - sm(1.65, 1.95, s)),
    c3: sm(2.12, 2.42, s) * (1 - sm(2.65, 2.95, s)),
    c4: sm(3.12, 3.42, s) * (1 - sm(3.65, 3.95, s)),
    c5: sm(4.15, 4.45, s) * (1 - sm(4.65, 4.95, s)),
    c6: sm(5.15, 5.45, s) * (1 - sm(5.65, 5.95, s)),
    c7: sm(6.12, 6.42, s),
    ticket: clamp((s - 6.4) / 0.45),
    steam: hero,
  }
}

const reducedS = (target: number) => {
  const i = Math.min(STEP_COUNT - 1, Math.floor(target))
  return i === 0 ? 0.3 : i === 6 ? 6.95 : i + 0.55
}

export default function Story() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const el = useRef<Record<string, HTMLElement | null>>({})
  const reg = (k: string) => (n: HTMLElement | null) => { el.current[k] = n }
  const [idx, setIdx] = useState(0)
  const [over, setOver] = useState(false)
  const [gl, setGl] = useState(false)
  const idxRef = useRef(0)

  // three.js only loads when it can actually help: WebGL present, motion allowed, a real viewport
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    if (!webglOK() || mq.matches || new URLSearchParams(location.search).has('nosteam')) return
    const go = () => setGl(true)
    const t = 'requestIdleCallback' in window ? (window as any).requestIdleCallback(go, { timeout: 1800 }) : setTimeout(go, 900)
    return () => { 'cancelIdleCallback' in window ? (window as any).cancelIdleCallback(t) : clearTimeout(t) }
  }, [])

  // hide the step counter + dots once the sequence has scrolled away (so they never sit over the nav on later sections)
  useEffect(() => {
    let raf = 0
    const check = () => {
      raf = 0
      const r = root.current?.getBoundingClientRect()
      if (r) setOver(r.bottom < innerHeight - 24)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(check) }
    check()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf) }
  }, [])

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = mq.matches
    const onMq = (e: MediaQueryListEvent) => { reduced = e.matches; root.current?.classList.toggle('reduced', reduced) }
    mq.addEventListener('change', onMq)
    root.current?.classList.toggle('reduced', reduced)

    const q = new URLSearchParams(location.search)
    const forceS = q.has('s') ? parseFloat(q.get('s')!) : null // ?s=2.5 pins a step position (used for screenshots)

    let s = 0, target = 0, last = performance.now(), raf = 0, visible = true
    let px = 0, py = 0, ppx = 0, ppy = 0
    const readTarget = () => {
      if (forceS !== null) return clamp(forceS, 0, STEP_COUNT)
      const r = root.current!.getBoundingClientRect()
      return clamp(-r.top / innerHeight, 0, STEP_COUNT)
    }
    const apply = (v: Vals, sv: number) => {
      const set = (k: string, o: number, tf?: string) => {
        const n = el.current[k]
        if (!n) return
        n.style.opacity = o.toFixed(3)
        n.style.visibility = o < 0.01 ? 'hidden' : 'visible'
        if (tf !== undefined && !reduced) n.style.transform = tf
      }
      set('hero', v.hero, `scale(${v.heroScale.toFixed(4)})`)
      set('empty', v.empty)
      set('stack', v.stack, `scale(${(1 + 0.02 * (1 - sm(4.05, 4.6, sv))).toFixed(4)})`)
      set('pickup', v.pickup, `translateX(${v.pickupX.toFixed(2)}px)`)
      set('sealed', v.sealed)
      for (const k of ['ringA', 'ringB', 'ringC', 'ringD']) {
        const o = k === 'ringA' ? v.ringA : k === 'ringD' ? v.ringD : v.ringBC
        set(k, o, `translate(-50%,-50%) rotate(var(--rot,0deg)) scale(${(0.9 + 0.1 * o).toFixed(3)})`)
      }
      for (let i = 1; i <= 7; i++) set('c' + i, v['c' + i], `translateY(${((1 - v['c' + i]) * 16).toFixed(2)}px)`)
      // ticket prints in 6 stepped increments, like a receipt printer
      const tk = el.current.ticket
      if (tk) {
        const stepped = reduced ? v.ticket : Math.floor(v.ticket * 6 + 1e-6) / 6
        tk.style.transform = `translateY(${((1 - stepped) * -100).toFixed(3)}%)`
        tk.style.visibility = v.ticket <= 0 ? 'hidden' : 'visible'
      }
      steamState.level = v.steam
      const i = Math.min(STEP_COUNT - 1, Math.floor(sv + 0.0001))
      if (i !== idxRef.current) { idxRef.current = i; setIdx(i) }
    }
    const frame = (now: number) => {
      raf = 0
      const dt = Math.min(0.1, (now - last) / 1000); last = now
      target = readTarget()
      if (reduced) s = reducedS(target)
      else {
        const k = 1 - Math.pow(1 - 0.08, dt * 60) // critically damped lerp, no overshoot
        s += (target - s) * k
        if (Math.abs(target - s) < 0.0004) s = target
      }
      // damped pointer parallax, up to 12 design px
      if (!reduced && box.current) {
        ppx += (px - ppx) * (1 - Math.pow(1 - 0.06, dt * 60)); ppy += (py - ppy) * (1 - Math.pow(1 - 0.06, dt * 60))
        const u = stage.current ? stage.current.clientWidth / 1440 : 1
        box.current.style.transform = `translate3d(${(ppx * 12 * Math.min(u, 1.3)).toFixed(2)}px, ${(ppy * 8 * Math.min(u, 1.3)).toFixed(2)}px, 0)`
      }
      apply(compute(s), s)
      if (visible && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame) } }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick() }, { rootMargin: '10% 0px' })
    io.observe(root.current!)
    const onPtr = (e: PointerEvent) => { px = (e.clientX / innerWidth) * 2 - 1; py = (e.clientY / innerHeight) * 2 - 1 }
    addEventListener('pointermove', onPtr, { passive: true })
    document.addEventListener('visibilitychange', kick)
    // initial paint is exact (no smoothing) so the first frame matches the approved hero
    s = target = readTarget(); apply(compute(reduced ? reducedS(s) : s), reduced ? reducedS(s) : s)
    kick()
    return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener('pointermove', onPtr); document.removeEventListener('visibilitychange', kick); mq.removeEventListener('change', onMq) }
  }, [])

  const goStep = (i: number) => {
    const r = root.current!
    const top = r.getBoundingClientRect().top + scrollY
    const y = top + (i === 0 ? 0 : i + (i === 6 ? 0.55 : 0.3)) * innerHeight
    scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  const layer = (k: PhotoKey, key: string, priority = false) => {
    const p = PHOTOS[k] as { file: string; alt: string; fit?: { x?: number; y?: number; scale?: number } }
    const f = p.fit
    return (
      <div className={`layer l-${key}`} ref={reg(key)} key={key}>
        <div className="fit" style={f ? { transform: `translate(${f.x ?? 0}%, ${f.y ?? 0}%) scale(${f.scale ?? 1})` } : undefined}>
          <Photo file={p.file} alt={p.alt} priority={priority} />
        </div>
      </div>
    )
  }

  return (
    <section id="top" className="story" ref={root} aria-label="Cook's Corner: the page is the tray" style={{ height: `${SCROLL_VH * 100}svh` }}>
      <div className="stage" ref={stage}>
        <div className="frame">
          <div className="plates" aria-hidden={false}>
            <div className="plate-box" ref={box}>
              {layer('empty', 'empty')}
              {layer('hero', 'hero', true)}
              {layer('packages', 'stack')}
              {layer('pickup', 'pickup')}
              {layer('sealed', 'sealed')}
              <i className="ring ringA" ref={reg('ringA')} />
              <i className="ring ringB" ref={reg('ringB')} />
              <i className="ring ringC" ref={reg('ringC')} />
              <i className="ring ringD" ref={reg('ringD')} />
              {gl && (
                <Suspense fallback={null}>
                  <Steam />
                </Suspense>
              )}
            </div>
          </div>

          {/* step 1: the approved hero copy */}
          <div className="copy c1" ref={reg('c1')}>
            <div className="eyebrow">Meal Preps • Catering • Private Events</div>
            <h1 className="disp">
              We cook<br className="d" /> when<br />
              <em>you can't.</em>
            </h1>
            <p className="sub">Curated meal prep, freshly prepared and ready for pickup at our location on Old Statesville Rd., or delivered within 25 miles of the pickup point.</p>
            <div className="btns">
              <OrderButton>Order now</OrderButton>
              <a className="btn g" href="#menu">See the menu</a>
            </div>
            <div className="hint">Scroll to fill your tray ↓</div>
          </div>

          <div className="copy cap c2" ref={reg('c2')}>
            <div className="eyebrow">02 · Protein</div>
            <h2 className="disp">{STEPS[1].cap}</h2>
            <p className="sub">Pick a protein or a seafood: grilled ribeye, chicken breast or thigh, ground turkey, turkey meatballs, salmon, shrimp, scallops or cod.</p>
          </div>
          <div className="copy cap c3" ref={reg('c3')}>
            <div className="eyebrow">03 · Sides</div>
            <h2 className="disp">{STEPS[2].cap}</h2>
            <p className="sub">One vegetable and one starch in every meal, from grilled asparagus to garlic parmesan mash.</p>
          </div>
          <div className="copy cap c4" ref={reg('c4')}>
            <div className="eyebrow">04 · Sauce</div>
            <h2 className="disp">{STEPS[3].cap}</h2>
            <p className="sub">Housemade sauces come with your proteins unless you decline them.</p>
            <p className="need-row">Spank Sauce (Greek yogurt base, preferably for salmon) and Spice Man (sweet Thai chili base).</p>
          </div>
          <div className="copy cap c5" ref={reg('c5')}>
            <div className="eyebrow">05 · Packages</div>
            <h2 className="disp">{STEPS[4].cap}</h2>
            <p className="sub">Packages of 8, 10, 12 or 16 meals. Each one is built from the menu.</p>
            <ul className="chips">
              {PACKAGES.map((p) => (
                <li key={p.meals}><span>{p.meals} meals</span><b className="disp">${p.price}</b></li>
              ))}
            </ul>
            <a className="btn g" href="#packages">See packages</a>
          </div>
          <div className="copy cap c6" ref={reg('c6')}>
            <div className="eyebrow">06 · Pickup</div>
            <h2 className="disp">{STEPS[5].cap}</h2>
            <p className="sub">{BIZ.address}. {TURNAROUND}</p>
            <p className="need-row">Tuesday through Saturday, 11 AM to 7 PM unless advised otherwise. No Sundays.</p>
          </div>
          <div className="copy cap c7" ref={reg('c7')}>
            <div className="eyebrow">07 · Done</div>
            <h2 className="sr">{STEPS[6].cap}</h2>
            <div className="ticket-wrap">
              <div className="slot" aria-hidden="true" />
              <div className="ticket-clip">
                <div className="ticket" ref={reg('ticket')}>
                  <div className="t-label">Pickup ticket</div>
                  <div className="t-big disp" aria-hidden="true">{STEPS[6].cap}</div>
                  <div className="t-line">{BIZ.name}</div>
                  <div className="t-row">{BIZ.address}</div>
                  <div className="t-row">Ready 48 hours after you order</div>
                  <div className="t-row">Pickup {PICKUP_HOURS_SHORT}</div>
                  <OrderButton className="btn p t-btn">Order now</OrderButton>
                  <a className="t-note" href={`#${POLICIES.allergy.id}`}>{ORDER_NOTE}</a>
                </div>
              </div>
            </div>
          </div>

          <div className={'dots' + (over ? ' off' : '')} role="group" aria-label="Story steps" aria-hidden={over || undefined}>
            <b aria-live="polite">{String(idx + 1).padStart(2, '0')} / 07</b>
            {STEPS.map((st, i) => (
              <button key={st.n} type="button" className={i === idx ? 'on' : ''} aria-label={`Step ${st.n}: ${st.label}`} aria-current={i === idx ? 'step' : undefined} onClick={() => goStep(i)}>
                <i />
              </button>
            ))}
          </div>
        </div>
      </div>
      <ol className="sr">
        {STEPS.map((s) => <li key={s.n}>{s.cap}</li>)}
      </ol>
    </section>
  )
}
