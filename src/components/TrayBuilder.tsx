import { useEffect, useId, useRef, useState } from 'react'
import { BIZ, DAILY_LIMIT, NO_SAME_DAY, ORDER_CUTOFF, ORDER_NOTE, ORDER_ROLLOVER, PICKUP_HOURS_SHORT, POLICIES } from '../config/content'
import { earliestDay, formatDay } from '../shared/schedule'
import {
  DELIVERY_FEE_CENTS, MAX_ALLERGY_NOTE, MENU_ITEMS, ONE_TIME_PACKAGES, SAUCES, dollars, packageFor, totalCents,
  type Fulfillment,
} from '../shared/catalog'
import { FEATURES, SHOW_REVIEW_TAGS } from '../config/features'
import { startCheckout } from '../lib/checkout'
import { Need } from './ui'

type State = { meals: number; proteins: string[]; vegetables: string[]; starches: string[]; sauces: string[]; fulfillment: Fulfillment; allergy: string }
const INITIAL: State = { meals: 10, proteins: [], vegetables: [], starches: [], sauces: [], fulfillment: 'pickup', allergy: '' }
const base = import.meta.env.BASE_URL
const tick = (
  <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2 6.4l2.6 2.6L10 3.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const pad2 = (n: number) => String(n)

/** The live tray: the empty tray photo plus one transparent layer per filled compartment (opacity only). */
function TrayStack({ s, className = '' }: { s: State; className?: string }) {
  const L = (name: string, on: boolean) => (
    <img className={'tb-layer' + (on ? ' on' : '')} src={`${base}photos/tray/${name}.webp`} alt="" width={1240} height={700} loading="lazy" decoding="async" draggable={false} />
  )
  return (
    <div className={'tb-stack ' + className} aria-hidden="true">
      <picture>
        <source srcSet={`${base}photos/tray/base.webp`} type="image/webp" />
        <img src={`${base}photos/tray/base.jpg`} alt="" width={1240} height={700} loading="lazy" decoding="async" draggable={false} />
      </picture>
      {L('protein-1', s.proteins.length === 1)}
      {L('protein-2', s.proteins.length >= 2)}
      {L('veg', s.vegetables.length > 0)}
      {L('starch', s.starches.length > 0)}
    </div>
  )
}

const more = (a: string[]) => (a.length > 1 ? `${a[0]} +${a.length - 1}` : a[0])

type Pay = { accepted: boolean; setAccepted: (v: boolean) => void; busy: boolean; error: string; go: () => void }

/** Policy / allergy links inside the phone ticket sheet: close the sheet first, then scroll to the target. */
function goAnchor(e: React.MouseEvent<HTMLAnchorElement>) {
  const sheet = e.currentTarget.closest('dialog')
  if (!sheet) return
  const id = (e.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')
  e.preventDefault()
  sheet.close()
  requestAnimationFrame(() => {
    const target = document.getElementById(id)
    if (!target) return
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
  })
}

function Panel({ s, set, cap, total, idp, pay, photo = true }: { photo?: boolean; s: State; set: (p: Partial<State>) => void; cap: number; total: number; idp: string; pay: Pay }) {
  const filled = [true, s.proteins.length > 0, s.vegetables.length + s.starches.length > 0, s.sauces.length > 0]
  const sauceNames = s.sauces.map((id) => SAUCES.find((x) => x.id === id)?.name ?? id)
  const sides = [...s.vegetables, ...s.starches]
  // rules-only estimate (the server also checks the 10-a-day limit when you pay)
  const day = earliestDay(new Date())
  const missing = [...(s.proteins.length === 0 ? ['choose your proteins'] : []), ...(pay.accepted ? [] : ['tick the policy box'])]
  const desc = `Tray preview: ${s.proteins.length ? s.proteins.join(', ') : 'no proteins yet'}${s.vegetables.length ? ', vegetable' : ''}${s.starches.length ? ', starch' : ''}.`
  return (
    <>
      <div className={'tb-tray' + (photo ? '' : ' txt')} role="img" aria-label={desc}>
        {photo && <TrayStack s={s} />}
        <div className="tb-tl" aria-hidden="true">Your tray so far <span className="tb-seg">{filled.map((f, i) => <i key={i} className={f ? 'f' : ''} />)}</span></div>
        {s.proteins.length > 0 && <><span className="tb-ln l1" aria-hidden="true" /><span className="tb-pin p1" aria-hidden="true">{s.proteins[0]}</span></>}
        {s.proteins.length > 0 ? (
          s.proteins.length > 1 && <><span className="tb-ln l2" aria-hidden="true" /><span className="tb-pin p2" aria-hidden="true">{s.proteins.length > 2 ? `${s.proteins[1]} +${s.proteins.length - 2}` : s.proteins[1]}</span></>
        ) : <span className="tb-pin g p1" aria-hidden="true">Protein · step 2</span>}
        <span className={'tb-pin p3' + (s.vegetables.length ? '' : ' g')} aria-hidden="true">{s.vegetables.length ? more(s.vegetables) : 'Vegetable · step 3'}</span>
        <span className={'tb-pin p4' + (s.starches.length ? '' : ' g')} aria-hidden="true">{s.starches.length ? more(s.starches) : 'Starch · step 3'}</span>
        <span className={'tb-pin p5' + (s.sauces.length ? '' : ' g')} aria-hidden="true">{s.sauces.length ? more(sauceNames) : 'Sauce · step 4'}</span>
      </div>
      {SHOW_REVIEW_TAGS && <p className="tb-comp"><Need>Need from Marsaun: a photo of each item (preview is a composite)</Need></p>}

      <div className="tb-ticket">
        <div className="tb-th"><span>{s.fulfillment === 'delivery' ? 'Your delivery ticket' : 'Your pickup ticket'}</span><span>{s.meals} meals</span></div>
        <div className="tb-tb">
          <div className="tb-row"><span className="k">Package</span><span className="v">{s.meals} meals</span><span className="pr">{dollars(packageFor(s.meals)!.priceCents)}</span></div>
          <div className="tb-row"><span className="k">Proteins</span><span className="v">{s.proteins.length ? s.proteins.join(', ') : <span className="m">Not chosen yet</span>}<small>{s.proteins.length} of {cap} chosen</small></span></div>
          <div className="tb-row"><span className="k">Sides</span><span className="v">{sides.length ? sides.join(', ') : <span className="m">Not chosen yet</span>}</span></div>
          <div className="tb-row"><span className="k">Sauces</span><span className="v">{sauceNames.length ? sauceNames.join(', ') : <span className="m">Not chosen yet</span>}</span></div>
          <div className="tb-row tb-row-allergy"><span className="k">Allergies</span><span className="v">{s.allergy.trim() ? s.allergy.trim() : <span className="m">None listed</span>}</span></div>
          <fieldset className="tb-tg">
            <legend className="sr">Pickup or delivery</legend>
            {(['pickup', 'delivery'] as const).map((f) => (
              <label key={f} className={s.fulfillment === f ? 'on' : ''}>
                <input type="radio" name={`${idp}-ful`} value={f} checked={s.fulfillment === f} onChange={() => set({ fulfillment: f })} />
                <span>{f === 'pickup' ? 'Pickup' : `Delivery · +${dollars(DELIVERY_FEE_CENTS)}`}</span>
              </label>
            ))}
          </fieldset>
          {s.fulfillment === 'pickup' ? (
            <>
              <p className="tn"><b>Pickup is free at the storefront.</b></p>
              <p className="tn m">{BIZ.address} · <span className="nw">{PICKUP_HOURS_SHORT}</span></p>
            </>
          ) : (
            <>
              <p className="tn"><b>Delivery fee: {dollars(DELIVERY_FEE_CENTS)}</b>, within 25 miles.</p>
              <p className="tn m">Same days and hours as pickup. We’ll collect your address at checkout.</p>
            </>
          )}
          <div className="tb-ob">{ORDER_CUTOFF}</div>
          <p className="tn m">{NO_SAME_DAY} {ORDER_ROLLOVER}</p>
          <p className="tn tb-day" data-testid="earliest-day">
            {s.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'} day: <b>{formatDay(day)}</b>
            <small>Earliest day if you order now. At least 48 hours out. {DAILY_LIMIT}</small>
          </p>
          <div className="tb-tot">
            <span className="k">Subtotal<small>{s.fulfillment === 'pickup' ? 'Pickup · no fee' : `Includes ${dollars(DELIVERY_FEE_CENTS)} delivery`}</small></span>
            <span className="t" aria-live="polite">{dollars(total)}</span>
          </div>
          {FEATURES.liveCheckout ? (
            <>
              <label className={'tb-accept' + (pay.accepted ? ' on' : '')}>
                <input type="checkbox" checked={pay.accepted} onChange={(e) => pay.setAccepted(e.target.checked)} />
                <span>I accept the <a href="#policies" onClick={goAnchor}>order changes and refunds policy and food allergy notice</a>.</span>
              </label>
              <button type="button" className="btn p tb-checkout" disabled={missing.length > 0 || pay.busy} aria-describedby={missing.length ? `${idp}-need` : undefined} onClick={pay.go}>{pay.busy ? 'Starting checkout…' : 'Checkout'}</button>
              {missing.length > 0 && !pay.busy && <p className="tb-need-hint" id={`${idp}-need`}>{missing.length === 1 ? `${missing[0][0].toUpperCase()}${missing[0].slice(1)} to continue` : `To continue: ${missing.join(' and ')}`}</p>}
              {pay.error && <p className="tb-err" role="alert">{pay.error}</p>}
              <p className="tb-next">On the next page: enter your email and phone, choose <b>Card</b>, then tap Pay.</p>
            </>
          ) : (
            <>
              <button type="button" className="btn p tb-checkout" aria-disabled="true" onClick={(e) => e.preventDefault()}>Checkout coming soon</button>
              <p className="tb-dm">Order by DM <a href={BIZ.instagramUrl} target="_blank" rel="noopener">{BIZ.instagram}</a> for now.</p>
            </>
          )}
          <p className="fine"><a href={`#${POLICIES.allergy.id}`} onClick={goAnchor}>{ORDER_NOTE}</a></p>
        </div>
      </div>
    </>
  )
}

export default function TrayBuilder() {
  const [s, setS] = useState<State>(INITIAL)
  const [inView, setInView] = useState(false)
  const [live, setLive] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sheet = useRef<HTMLDialogElement>(null)
  const sec = useRef<HTMLElement>(null)
  const idp = useId().replace(/:/g, '')
  const cap = packageFor(s.meals)!.maxProteins
  const total = totalCents(s.meals, s.fulfillment) ?? 0
  const set = (p: Partial<State>) => setS((o) => ({ ...o, ...p }))

  // "Choose this package" / "Order now" elsewhere on the page selects a package and scrolls here
  useEffect(() => {
    const on = (e: Event) => {
      const m = (e as CustomEvent<{ meals?: number }>).detail?.meals
      if (m && packageFor(m)) pickMeals(m)
    }
    window.addEventListener('tray:select', on)
    return () => window.removeEventListener('tray:select', on)
  })
  // Coming back from Stripe with the Back button restores this page frozen on "Starting checkout…" (bfcache): unfreeze it
  useEffect(() => {
    const on = (e: PageTransitionEvent) => { if (e.persisted) { setBusy(false); setError('') } }
    window.addEventListener('pageshow', on)
    return () => window.removeEventListener('pageshow', on)
  }, [])
  useEffect(() => {
    const el = sec.current
    if (!el) return
    // The slim bar is only useful while the builder fills the screen behind it. Hide it as soon as the builder's bottom edge
    // comes up into the viewport (plus a small lead), so it never sits on top of the start of the Menu section below.
    const LEAD = 24
    let raf = 0
    const measure = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      setInView(r.top < vh && r.bottom > vh + LEAD)
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(measure) }
    measure()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    return () => { window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); if (raf) cancelAnimationFrame(raf) }
  }, [])

  function pickMeals(m: number) {
    const c = packageFor(m)!.maxProteins
    setS((o) => {
      if (o.proteins.length > c) setLive(`The ${m}-meal package allows up to ${c} proteins. Extra proteins were removed.`)
      return { ...o, meals: m, proteins: o.proteins.slice(0, c) }
    })
  }
  const toggle = (key: 'proteins' | 'vegetables' | 'starches' | 'sauces', v: string) =>
    setS((o) => {
      const cur = o[key]
      return { ...o, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }
    })
  const pay: Pay = {
    accepted, setAccepted, busy, error,
    go: async () => {
      setBusy(true); setError('')
      try {
        window.location.assign(await startCheckout({ meals: s.meals, proteins: s.proteins, vegetables: s.vegetables, starches: s.starches, sauces: s.sauces, fulfillment: s.fulfillment, allergyNote: s.allergy }))
      } catch (e) {
        setError((e as Error).message); setBusy(false)
      }
    },
  }
  const atCap = s.proteins.length >= cap
  const sides = s.vegetables.length + s.starches.length

  const chip = (key: 'proteins' | 'vegetables' | 'starches', name: string) => {
    const on = s[key].includes(name)
    const blocked = key === 'proteins' && atCap && !on
    return (
      <label key={name} className={'tb-chip' + (on ? ' on' : '') + (blocked ? ' off' : '')}>
        <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggle(key, name)} />
        <span className="ck">{tick}</span>
        {name}
      </label>
    )
  }

  return (
    <section id="build" ref={sec} className="sec dark tb" data-theme="dark" aria-labelledby="tb-t">
      <div className="wrap">
        <div className="tb-intro">
          <div>
            <div className="eyebrow tb-eyebrow">Order online<i /></div>
            <h2 id="tb-t" className="disp">Build your <em>tray.</em></h2>
            <p className="tb-sub">Pick a package, fill it, and watch your week come together.</p>
          </div>
          <dl className="tb-facts">
            <div><dt>Ready in</dt><dd>48+ hours after you order</dd></div>
            <div><dt>Pickup</dt><dd>{PICKUP_HOURS_SHORT}</dd></div>
            <div><dt>Delivery</dt><dd>{dollars(DELIVERY_FEE_CENTS)} fee</dd></div>
          </dl>
        </div>

        <div className="tb-grid">
          <div className="tb-steps">
            <div className="tb-step" role="radiogroup" aria-labelledby={`${idp}-h01`}>
              <div className="tb-sh"><span className="n">01</span><span id={`${idp}-h01`} className="h2 disp">Pick your package</span><span className="cnt">Selected <b>{s.meals} meals</b></span></div>
              <div className="tb-pk">
                {ONE_TIME_PACKAGES.map((p) => (
                  <label key={p.meals} className={'tb-pc' + (s.meals === p.meals ? ' on' : '')}>
                    <input type="radio" name={`${idp}-pkg`} value={p.meals} checked={s.meals === p.meals} onChange={() => pickMeals(p.meals)} />
                    <span className="ck">{tick}</span>
                    <span className="big">{p.meals}</span>
                    <span className="l">Meals</span>
                    <span className="pr">{dollars(p.priceCents)}</span>
                    <span className="cap">Up to {p.maxProteins} proteins</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="tb-step" role="group" aria-labelledby={`${idp}-h02`}>
              <div className="tb-sh"><span className="n">02</span><span id={`${idp}-h02`} className="h2 disp">Choose Proteins</span><span className="cnt"><b>{pad2(s.proteins.length)} of {cap}</b>Proteins</span></div>
              <div className="gl">Protein</div>
              <div className="tb-chips">{MENU_ITEMS.Protein.map((n) => chip('proteins', n))}</div>
              <div className="gl">Seafood</div>
              <div className="tb-chips">{MENU_ITEMS.Seafood.map((n) => chip('proteins', n))}</div>
              <p className="tb-note">{atCap ? <span>You’ve picked the most proteins this package allows. Remove one to swap.</span> : <span>Pick up to {cap} proteins for your {s.meals} meals.</span>}</p>
            </div>

            <div className="tb-step" role="group" aria-labelledby={`${idp}-h03`}>
              <div className="tb-sh"><span className="n">03</span><span id={`${idp}-h03`} className="h2 disp">Choose Sides</span><span className="up">{sides ? `${sides} chosen` : 'Pick any'}</span></div>
              <div className="gl">Vegetable</div>
              <div className="tb-chips">{MENU_ITEMS.Vegetables.map((n) => chip('vegetables', n))}</div>
              <div className="gl mt">Starch</div>
              <div className="tb-chips">{MENU_ITEMS.Starch.map((n) => chip('starches', n))}</div>
              <p className="tb-note"><span>One vegetable and one starch in every meal.</span>{SHOW_REVIEW_TAGS && <Need>Need from Marsaun: how many side picks per package</Need>}</p>
            </div>

            <div className="tb-step" role="group" aria-labelledby={`${idp}-h04`}>
              <div className="tb-sh"><span className="n">04</span><span id={`${idp}-h04`} className="h2 disp">Pick Sauces</span><span className="up">{s.sauces.length ? `${s.sauces.length} chosen` : 'Pick any'}</span></div>
              <div className="tb-sauce">
                {SAUCES.map((x) => {
                  const on = s.sauces.includes(x.id)
                  return (
                    <label key={x.id} className={'tb-sc' + (on ? ' on' : '')}>
                      <input type="checkbox" checked={on} onChange={() => toggle('sauces', x.id)} />
                      <span className="ck">{tick}</span>
                      <b className="disp">{x.name}</b>
                      <span>{x.desc}</span>
                    </label>
                  )
                })}
              </div>
              <p className="tb-note"><span>Housemade sauces.</span>{SHOW_REVIEW_TAGS && <Need>Need from Marsaun: sauces per order and any extra cost</Need>}</p>
            </div>

            <div className="tb-step tb-allergy">
              <div className="tb-sh"><span className="n">05</span><label htmlFor={`${idp}-allergy`} className="h2 disp">List allergies prior to ordering*</label><span className="up">{s.allergy.length}/{MAX_ALLERGY_NOTE}</span></div>
              <textarea
                id={`${idp}-allergy`}
                rows={3}
                maxLength={MAX_ALLERGY_NOTE}
                value={s.allergy}
                onChange={(e) => set({ allergy: e.target.value })}
                placeholder="For example: peanuts, shellfish. Leave blank if none."
                aria-describedby={`${idp}-allergy-h`}
              />
              <p className="tb-note" id={`${idp}-allergy-h`}><span>We’ll review your ingredients and tell you which allergens are included.</span> <a href={`#${POLICIES.allergy.id}`}>Food allergy notice</a></p>
            </div>
          </div>

          <aside className="tb-right" aria-label="Your tray and ticket">
            <Panel s={s} set={set} cap={cap} total={total} idp={`${idp}d`} pay={pay} />
          </aside>
        </div>
      </div>

      <div className="sr" role="status" aria-live="polite">{live}</div>

      {/* mobile: slim button-red bar that opens the ticket sheet */}
      <div className={'tb-bar' + (inView ? ' show' : '')}>
        <div className="m"><b>{s.meals} meals · {dollars(total)}</b><span>{s.proteins.length} of {cap} proteins</span></div>
        <button type="button" className="vt" onClick={() => sheet.current?.showModal()}>View ticket</button>
      </div>
      <dialog ref={sheet} className="tb-sheet" aria-label="Your ticket" onClick={(e) => e.target === sheet.current && sheet.current?.close()}>
        <div className="tb-grab"><span>Your ticket</span><button type="button" onClick={() => sheet.current?.close()}>Close</button></div>
        <Panel s={s} set={set} cap={cap} total={total} idp={`${idp}m`} pay={pay} photo={false} />
      </dialog>
    </section>
  )
}
