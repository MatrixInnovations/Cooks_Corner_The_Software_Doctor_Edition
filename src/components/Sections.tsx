import { BIZ, DELIVERY_FEE, MENU, ORDER_NOTE, PACKAGES, POLICIES, SUBSCRIPTIONS, TURNAROUND } from '../config/content'
import { PHOTOS, LOGO } from '../config/photos'
import { Need, OrderButton, Photo } from './ui'

const Head = ({ eyebrow, title, sub, light }: { eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; light?: boolean }) => (
  <div className={'sec-head' + (light ? ' on-dark' : '')}>
    <div className="eyebrow rules">{eyebrow}</div>
    <h2 className="disp">{title}</h2>
    {sub && <p className="sec-sub">{sub}</p>}
  </div>
)

export function Packages() {
  const p = PHOTOS.packages
  return (
    <section id="packages" className="sec bone" data-theme="light" aria-labelledby="pk-t">
      <div className="wrap">
        <Head eyebrow="05 · Meal packages" title={<span id="pk-t">Pick how many meals<br className="m" /> your week needs.</span>} sub="Each package is built from the menu below." />
        <div className="stack-banner">
          <Photo file={p.file} alt={p.alt} />
        </div>
        <ul className="cards">
          {PACKAGES.map((k) => (
            <li className="card" key={k.meals} data-n={k.meals}>
              <h3 className="m">{k.meals} meals</h3>
              <div className="price disp">${k.price}</div>
              <hr />
              <div className="pm">
                {k.proteins ?? (<>Protein maximum:<Need /></>)}
              </div>
              <OrderButton what={`You picked the ${k.meals}-meal package.`}>Choose this package</OrderButton>
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
        <p className="menu-note">Housemade sauces come with your proteins unless you decline them. <Need>Sauce names</Need></p>
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
            <ul className="need-list">
              <li>Pickup days and hours <Need /></li>
              <li>How to place an order <Need>Ordering flow</Need></li>
            </ul>
          </div>
          <div className="panel">
            <h3 className="disp">Delivery</h3>
            <p className="big">Delivery within 25 miles of our pickup point. Delivery fee: {DELIVERY_FEE}.</p>
            <ul className="need-list">
              <li>Delivery days and times <Need /></li>
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
        <Head light eyebrow="Subscriptions" title={<span id="sb-t">Monthly meal subscriptions</span>} sub="Monthly subscriptions are available and offer lower pricing per week than the one-time packages." />
        <ul className="cards sub-cards">
          {SUBSCRIPTIONS.map((k) => (
            <li className="card" key={k.meals}>
              <h3 className="m">{k.meals} meals</h3>
              <div className="price disp">${k.price}</div>
              <hr />
              <div className="pm">Billing period <Need /></div>
            </li>
          ))}
        </ul>
        <ul className="need-list on-dark">
          <li>Is the price per week or per month? Meals per week? <Need>Subscription terms</Need></li>
          <li>What the subscription menu includes; a 16-meal plan; protein maximums <Need /></li>
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
        <p className="need-row center">What’s offered, group sizes, example menus, travel distance and how to ask for a quote <Need>Catering details</Need></p>
        <div className="center"><a className="btn p" href={`mailto:${BIZ.email}?subject=Catering`}>Ask about catering</a></div>
      </div>
    </section>
  )
}

export function Policies() {
  const parts = [POLICIES.refunds, POLICIES.allergy]
  return (
    <section id="policies" className="sec bone2 policies" data-theme="light" aria-labelledby="po-t">
      <div className="wrap">
        <Head eyebrow="Policies" title={<span id="po-t">Orders, refunds and allergies</span>} />
        <div className="policy-grid">
          {parts.map((p) => (
            <article className="policy" id={p.id} key={p.id} aria-labelledby={`${p.id}-h`}>
              <h3 id={`${p.id}-h`} className="disp">{p.title}</h3>
              {p.paragraphs.map((t, i) => <p key={i}>{t}</p>)}
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
          </div>
        </div>
        <address className="foot-contact">
          <p>{BIZ.address}</p>
          <p>Phone: <a href={BIZ.phoneHref}>{BIZ.phone}</a></p>
          <p>Email: <a href={`mailto:${BIZ.email}`}>{BIZ.email}</a></p>
          <p>Instagram: {BIZ.instagram} <Need>Confirm exact handle</Need></p>
          <p>Web: {BIZ.domain} <span className="soon">(coming soon)</span></p>
          <p><a href="#policies">Policies: order changes, refunds and food allergy notice</a></p>
          <p>Hours <Need /></p>
        </address>
      </div>
      <div className="wrap legal">
        <span>© {new Date().getFullYear()} Cook’s Corner.</span>
        <span>Preview build. Not live. Photos are AI placeholders until Marsaun’s own.</span>
      </div>
    </footer>
  )
}
