import { createContext, useContext, useRef, type ReactNode } from 'react'
import { BIZ, NEED, ORDER_NOTE, POLICIES } from '../config/content'

/** A visible open question for the client. Keep until Marsaun answers. */
export function Need({ children = NEED, title }: { children?: ReactNode; title?: string }) {
  return (
    <span className="need" title={title ?? 'Only Marsaun can confirm this'}>
      {children}
    </span>
  )
}

type OrderCtx = { open: (what?: string) => void }
const Ctx = createContext<OrderCtx>({ open: () => {} })
export const useOrder = () => useContext(Ctx)

/** Placeholder for checkout. No Stripe yet: opens a small dialog, never collects anything. */
export function OrderProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const what = useRef<HTMLSpanElement>(null)
  const open = (w?: string) => {
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
            To order today, call <a href={BIZ.phoneHref}>{BIZ.phone}</a> or email <a href={`mailto:${BIZ.email}`}>{BIZ.email}</a>.
          </p>
          <p className="od-note"><a href={`#${POLICIES.allergy.id}`} onClick={() => ref.current?.close()}>{ORDER_NOTE}</a></p>
          <p>
            <a className="od-policy" href="#policies" onClick={() => ref.current?.close()}>Order changes, refunds and food allergy notice</a>
          </p>
          <p className="od-need">
            <Need>Need from Marsaun: ordering flow</Need>
          </p>
          <button className="btn p" autoFocus>Close</button>
        </form>
      </dialog>
    </Ctx.Provider>
  )
}

export function OrderButton({ children = 'Order now', className = 'btn p', what }: { children?: ReactNode; className?: string; what?: string }) {
  const { open } = useOrder()
  return (
    <button type="button" className={className} onClick={() => open(what)}>
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
