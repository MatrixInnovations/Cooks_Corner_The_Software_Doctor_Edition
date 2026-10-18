import { useEffect, useRef, useState } from 'react'
import { BIZ } from '../config/content'
import { LOGO } from '../config/photos'
import { OrderButton } from './ui'

const LINKS = [
  ['Menu', '#menu'],
  ['Packages', '#packages'],
  ['Pickup & delivery', '#delivery'],
  ['Contact', '#contact'],
] as const

export default function Header() {
  const ref = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  // One rule: the header takes the tone of the section directly beneath its bottom edge (charcoal over dark sections,
  // bone over light ones, transparent over the story). Sampling the bottom edge means anchor jumps (scroll-margin = header
  // height) land with the header already matching the section you arrive at.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = 0
      const y = (ref.current?.offsetHeight ?? 64) + 1
      let theme = 'story'
      document.querySelectorAll<HTMLElement>('[data-theme],[data-header-theme]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top <= y && r.bottom > y) theme = el.dataset.headerTheme ?? el.dataset.theme!
      })
      if (ref.current && ref.current.dataset.theme !== theme) ref.current.dataset.theme = theme
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(tick) }
    tick()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on) }
  }, [])

  return (
    <header className="site-header" ref={ref} data-theme="story" data-open={open}>
      <div className="hdr-in">
        <a className="brand" href="#top">
          <span className="tile"><img src={LOGO.src} alt={LOGO.alt} width={46} height={46} /></span>
          <span className="bt"><b>{BIZ.name}</b><span>{BIZ.sub.toUpperCase()}</span></span>
        </a>
        <div className="right">
          <nav id="site-nav" aria-label="Main">
            {LINKS.map(([t, h]) => (
              <a key={h} href={h} onClick={() => setOpen(false)}>{t}</a>
            ))}
          </nav>
          <OrderButton className="btn p sm">Order now</OrderButton>
          <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)}>
            <span className="sr">{open ? 'Close menu' : 'Open menu'}</span>
            <i /><i /><i />
          </button>
        </div>
      </div>
      <div className="rule" />
    </header>
  )
}
