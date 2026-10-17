import { BIZ, CATERING_HOW, DELIVERY_FEE, ORDERING, PICKUP_HOURS, SAUCES, MENU, NO_SAME_DAY, ORDER_CUTOFF, ORDER_NOTE, ORDER_ROLLOVER, PACKAGES, POLICIES, SUBSCRIPTIONS, SUBSCRIPTION_DELIVERY, TURNAROUND } from '../config/content'
import { PHOTOS, LOGO } from '../config/photos'
import { Need, OrderButton, Photo, ResponsivePhoto } from './ui'
import Jingle from './Jingle'

const Head = ({ eyebrow, title, sub, light }: { eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; light?: boolean }) => (
  <div className={'sec-head' + (light ? ' on-dark' : '')}>
    <div className="eyebrow rules">{eyebrow}</div>
    <h2 className="disp">{title}</h2>
    {sub && <p className="sec-sub">{sub}</p>}
  </div>
)

export function Packages() {
  const p = PHOTOS.trays
  return (
    <section id="packages" className="sec bone" data-theme="light" aria-labelledby="pk-t">
      <div className="wrap">
        <Head eyebrow="05 · Meal packages" title={<span id="pk-t">Pick how many meals<br className="m" /> your week needs.</span>} sub="Each package is built from the menu below." />
        <div className="stack-banner real" style={{ '--op-d': p.position.d, '--op-m': p.position.m } as React.CSSProperties}>
          <ResponsivePhoto file={p.file} alt={p.alt} widths={p.widths} dims={p.dims} sizes="(max-width: 1440px) 100vw, 1440px" />
        </div>
        <ul className="cards">
          {PACKAGES.map((k) => (
            <li className="card" key={k.meals} data-n={k.meals}>
              <h3 className="m">{k.meals} meals</h3>
              <div className="price disp">${k.price}</div>
              <hr />
              <div className="pm">
                {k.proteins}
              </div>
              <OrderButton what={`You picked the ${k.meals}-meal package.`} meals={k.meals}>Choose this package</OrderButton>
            </li>
          ))}
        </ul>
        <p className="order-note"><a href={`#${POLICIES.allergy.id}`}>{ORDER_NOTE}</a></p>
        <p className="note">“Protein maximum” is the most different proteins you can choose within one package. <Need>Proposed wording, Marsaun to confirm</Need></p>
      </div>
    </section>
  )
}

export function Menu() {
  return (
    <section id="menu" className="sec dark" data-theme="dark" aria-labelledby="mn-t">
      <div className="wrap">
        <Head light eyebrow="Menu" title={<span id="mn-t">Build your meals</span>} sub="Pick a protein or seafood, a vegetable and a starch. Mix and match to make each meal yours." />
        <div className="menu-grid">
          {Object.entries(MENU).map(([group, items]) => (
            <div className="menu-col" key={group}>
              <h3>{group}</h3>
              <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="menu-note">Housemade sauces come with your proteins unless you decline them.</p>
        <ul className="sauces">
          {SAUCES.map((x) => (
            <li key={x.name}><b className="disp">{x.name}</b><span>{x.desc}</span></li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Delivery() {
  return (
    <section id="delivery" className="sec bone2" data-theme="light" aria-labelledby="dl-t">
      <div className="wrap">
        <Head eyebrow="Pickup & delivery" title={<span id="dl-t">Grab it, or we’ll bring it.</span>} sub={TURNAROUND} />
        <div className="two">
          <div className="panel">
            <h3 className="disp">Pickup</h3>
            <p className="big">{BIZ.address}</p>
            <p className="big">{PICKUP_HOURS}</p>
            <p className="big">{ORDERING}</p>
            <p className="big">{ORDER_CUTOFF}. {NO_SAME_DAY} {ORDER_ROLLOVER}</p>
          </div>
          <div className="panel">
            <h3 className="disp">Delivery</h3>
            <p className="big">Delivery within 25 miles of our pickup point. Delivery fee: {DELIVERY_FEE}.</p>
            <p className="big">Delivery follows the same schedule as pickup.</p>
            <ul className="need-list">
              <li>How customers give their address <Need /></li>
            </ul>
            <a className="btn p" href={`mailto:${BIZ.email}?subject=Delivery`}>Ask about delivery</a>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Subscriptions() {
  return (
    <section id="subscriptions" className="sec dark" data-theme="dark" aria-labelledby="sb-t">
      <div className="wrap">
        <Head light eyebrow="Subscriptions" title={<span id="sb-t">Monthly meal subscriptions</span>} sub="Monthly subscriptions are available. Pick how many meals fit your month." />
        <ul className="cards sub-cards">
          {SUBSCRIPTIONS.map((k) => (
            <li className="card" key={k.meals}>
              <h3 className="m">{k.meals} meals</h3>
              <div className="price disp">${k.price}</div>
              <hr />
              <div className="pm">
                per month
              </div>
            </li>
          ))}
        </ul>
        <p className="sub-delivery">{SUBSCRIPTION_DELIVERY}</p>
        <ul className="need-list on-dark">
          <li>What the subscription menu includes; protein maximums <Need /></li>
          <li>How billing works, and how to pause or cancel <Need /></li>
        </ul>
        <a className="btn g" href={`mailto:${BIZ.email}?subject=Subscriptions`}>Ask about subscriptions</a>
      </div>
    </section>
  )
}

export function Catering() {
  return (
    <section id="catering" className="sec bone" data-theme="light" aria-labelledby="ct-t">
      <div className="wrap narrow">
        <Head eyebrow="Meal preps • Catering • Private events" title={<span id="ct-t">Catering and private events</span>} sub="Cook’s Corner also does catering and private events." />
        <p className="need-row center">{CATERING_HOW}</p>
        <p className="need-row center">Call <a href={BIZ.phoneHref}>{BIZ.phone}</a> or DM <a href={BIZ.instagramUrl} rel="noopener">{BIZ.instagram}</a> on Instagram.</p>
        <p className="need-row center">Group sizes, example menus and travel distance <Need>Catering details</Need></p>
        <div className="center"><a className="btn p" href={BIZ.phoneHref}>Call to ask about catering</a></div>
      </div>
    </section>
  )
}

export function Policies() {
  const parts = [POLICIES.refunds, POLICIES.allergy, POLICIES.reheating]
  return (
    <section id="policies" className="sec bone2 policies" data-theme="light" aria-labelledby="po-t">
      <div className="wrap">
        <Head eyebrow="Policies" title={<span id="po-t">Orders, refunds, allergies and storage</span>} />
        <div className="policy-grid">
          {parts.map((p) => (
            <article className="policy" id={p.id} key={p.id} aria-labelledby={`${p.id}-h`}>
              <h3 id={`${p.id}-h`} className="disp">{p.title}</h3>
              {p.paragraphs.map((t, i) => {
                const lead = p.id === POLICIES.reheating.id ? t.indexOf(': ') : -1
                return <p key={i}>{lead > 0 ? <><strong>{t.slice(0, lead + 1)}</strong>{t.slice(lead + 1)}</> : t}</p>
              })}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer id="contact" className="foot" data-theme="dark" aria-labelledby="ft-t">
      <div className="wrap foot-grid">
        <div className="foot-brand">
          <span className="tile big"><img src={LOGO.src} alt="" width={120} height={120} loading="lazy" /></span>
          <div>
            <h2 id="ft-t" className="disp">{BIZ.name}</h2>
            <p>{BIZ.tagline}</p>
            <p className="eyebrow">Meal Preps • Catering • Private Events</p>
            <Jingle />
          </div>
        </div>
        <address className="foot-contact">
          <p>{BIZ.address}</p>
          <p>Phone: <a href={BIZ.phoneHref}>{BIZ.phone}</a></p>
          <p>Email: <a href={`mailto:${BIZ.email}`}>{BIZ.email}</a></p>
          <p>Instagram: <a href={BIZ.instagramUrl} rel="noopener">{BIZ.instagram}</a></p>
          <p>Web: {BIZ.domain} <span className="soon">(coming soon)</span></p>
          <p><a href="#policies">Policies: order changes, refunds, food allergy notice, reheating and storage</a></p>
          <p>Pickup: {PICKUP_HOURS}</p>
        </address>
      </div>
      <div className="wrap legal">
        <span>© {new Date().getFullYear()} Cook’s Corner LLC.</span>
        <span>Preview build. Not live. Photos are AI placeholders until Marsaun’s own.</span>
      </div>
      <div className="wrap credit">
        <p>Designed and Developed by Andrew Lowery, <a href="https://thesoftwaredoctor.com" target="_blank" rel="noopener">The Software Doctor<span className="sr"> (opens in a new tab)</span></a></p>
      </div>
    </footer>
  )
}
