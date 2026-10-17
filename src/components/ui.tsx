import { createContext, useContext, useRef, type ReactNode } from 'react'
import { BIZ, NEED, NO_SAME_DAY, ORDER_CUTOFF, ORDER_NOTE, ORDER_ROLLOVER, POLICIES } from '../config/content'
import { FEATURES } from '../config/features'

/** A visible open question for the client. Keep until Marsaun answers. */
export function Need({ children = NEED, title }: { children?: ReactNode; title?: string }) {
  return (
    <span className="need" title={title ?? 'Only Marsaun can confirm this'}>
      {children}
    </span>
  )
}

type OrderCtx = { open: (what?: string, meals?: number) => void }
const Ctx = createContext<OrderCtx>({ open: () => {} })
export const useOrder = () => useContext(Ctx)

/** Placeholder for checkout. No Stripe yet: opens a small dialog, never collects anything. */
export function OrderProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const what = useRef<HTMLSpanElement>(null)
  const open = (w?: string, meals?: number) => {
    // With the Tray Builder on the page, every Order button takes you to it (and pre-selects the package).
    const target = FEATURES.trayBuilder ? document.getElementById('build') : null
    if (target) {
      window.dispatchEvent(new CustomEvent('tray:select', { detail: { meals } }))
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
      return
    }
    if (what.current) what.current.textContent = w ?? ''
    ref.current?.showModal()
  }
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <dialog ref={ref} className="order-dialog" aria-labelledby="od-title" onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <form method="dialog">
          <h2 id="od-title" className="disp">Online ordering is coming soon</h2>
          <p>
            Checkout isn’t switched on yet. <span ref={what} className="od-what" />
          </p>
          <p>
            To order, call <a href={BIZ.phoneHref}>{BIZ.phone}</a>, send a DM to <a href={BIZ.instagramUrl} rel="noopener">{BIZ.instagram}</a> on Instagram, or email <a href={`mailto:${BIZ.email}`}>{BIZ.email}</a>. {ORDER_CUTOFF}. {NO_SAME_DAY} {ORDER_ROLLOVER}
          </p>
          <p className="od-note"><a href={`#${POLICIES.allergy.id}`} onClick={() => ref.current?.close()}>{ORDER_NOTE}</a></p>
          <p>
            <a className="od-policy" href="#policies" onClick={() => ref.current?.close()}>Order changes, refunds, food allergy notice, reheating and storage</a>
          </p>
          <button className="btn p" autoFocus>Close</button>
        </form>
      </dialog>
    </Ctx.Provider>
  )
}

export function OrderButton({ children = 'Order now', className = 'btn p', what, meals }: { children?: ReactNode; className?: string; what?: string; meals?: number }) {
  const { open } = useOrder()
  return (
    <button type="button" className={className} onClick={() => open(what, meals)}>
      {children}
    </button>
  )
}

/** Responsive image slot: webp first, jpg fallback. */
export function Photo({ file, alt, className, priority, style }: { file: string; alt: string; className?: string; priority?: boolean; style?: React.CSSProperties }) {
  const base = `${import.meta.env.BASE_URL}photos/${file}`
  return (
    <picture>
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img
        className={className}
        style={style}
        src={`${base}.jpg`}
        alt={alt}
        width={1280}
        height={720}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        draggable={false}
      />
    </picture>
  )
}

/** Responsive photo with real srcset (`<file>-<w>.webp|jpg`). Used for the real client photos. */
export function ResponsivePhoto({ file, alt, widths, dims, sizes, className, style }: { file: string; alt: string; widths: number[]; dims: [number, number]; sizes: string; className?: string; style?: React.CSSProperties }) {
  const base = `${import.meta.env.BASE_URL}photos/${file}`
  const set = (ext: string) => widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ')
  const mid = widths[Math.min(1, widths.length - 1)]
  return (
    <picture>
      <source srcSet={set('webp')} sizes={sizes} type="image/webp" />
      <img
        className={className}
        style={style}
        src={`${base}-${mid}.jpg`}
        srcSet={set('jpg')}
        sizes={sizes}
        alt={alt}
        width={dims[0]}
        height={dims[1]}
        decoding="async"
        loading="lazy"
        draggable={false}
      />
    </picture>
  )
}
