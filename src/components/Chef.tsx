import { Fragment, useEffect, useRef, useState } from 'react'
import { CHEF_STOPS } from '../config/content'
import { PORTRAIT } from '../config/photos'
import { Need } from './ui'

/** wrap key phrases in <span class="hl"> without changing a single character of the sentence */
function Marked({ text, marks }: { text: string; marks: readonly string[] }) {
  if (!marks.length) return <>{text}</>
  const esc = marks.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  return (
    <>
      {text.split(new RegExp(`(${esc})`)).map((part, i) =>
        marks.includes(part) ? <span className="hl" key={i}>{part}</span> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}

/**
 * "Meet the chef": the portrait stays pinned (sticky) while four stops scroll past.
 * The stop nearest the reading line becomes active: its sentence goes to full strength, its key phrases get a saffron
 * underline, the ticket under the portrait switches to that stop's label, and the rail fills.
 * Every sentence stays in the DOM, in order, at all times (verbatim text, nothing hidden). Motion is opacity/transform only.
 * Rail nodes are real buttons: Tab to one, Enter/Space jumps to that stop.
 */
export default function Chef() {
  const [active, setActive] = useState(0)
  const [js, setJs] = useState(false)
  const list = useRef<HTMLOListElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const stops = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    setJs(true)
    let raf = 0
    const run = () => {
      raf = 0
      const ol = list.current
      if (!ol) return
      const vh = window.innerHeight
      const line = vh * (window.innerWidth <= 820 ? 0.64 : 0.5)
      let best = 0
      let d = Infinity
      stops.current.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        const dist = Math.abs(r.top + r.height / 2 - line)
        if (dist < d) { d = dist; best = i }
      })
      setActive(best)
      const first = stops.current[0]?.getBoundingClientRect()
      const last = stops.current[stops.current.length - 1]?.getBoundingClientRect()
      if (first && last && fill.current) {
        const a = first.top + first.height / 2
        const b = last.top + last.height / 2
        const p = Math.min(1, Math.max(0, (line - a) / (b - a)))
        fill.current.style.transform = `scaleY(${p})`
      }
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(run) }
    run()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const go = (i: number) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = stops.current[i]
    if (!el) return
    const r = el.getBoundingClientRect()
    const line = window.innerHeight * (window.innerWidth <= 820 ? 0.64 : 0.5)
    window.scrollBy({ top: r.top + r.height / 2 - line, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <section id="chef" className={'sec dark chef' + (js ? ' live' : '')} data-theme="dark" aria-labelledby="chef-t">
      <div className="wrap chef-grid">
        <div className="chef-pin">
          <figure className="portrait">
            {PORTRAIT.ready ? (
              <picture>
                <source srcSet={`${import.meta.env.BASE_URL}people/${PORTRAIT.file}.webp`} type="image/webp" />
                <img
                  src={`${import.meta.env.BASE_URL}people/${PORTRAIT.file}.jpg`}
                  alt={PORTRAIT.alt}
                  width={800}
                  height={1000}
                  loading="lazy"
                  style={{ objectPosition: PORTRAIT.objectPosition }}
                />
              </picture>
            ) : (
              <div className="portrait-ph" role="img" aria-label="Portrait of Marsaun Cook goes here">
                <span className="disp" aria-hidden="true">MC</span>
                <Need>Portrait photo</Need>
              </div>
            )}
          </figure>
          <div className="chef-ticket" aria-hidden="true">
            <div className="ct-top">
              <span>Chef’s ticket</span>
              <span>{CHEF_STOPS[active].n} / 0{CHEF_STOPS.length}</span>
            </div>
            <div className="ct-body">
              {CHEF_STOPS.map((s, i) => (
                <p key={s.n} className={i === active ? 'on' : ''}>{s.ticket}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="chef-main">
          <div className="chef-head">
            <div className="eyebrow">Meet the chef</div>
            <h2 id="chef-t" className="disp">Marsaun Cook</h2>
            {/* PREVIEW ONLY: remove this tag once Marsaun has OK'd publishing his background (law enforcement, education). */}
            <p><Need>CONFIRM WITH MARSAUN: OK to publish background</Need></p>
          </div>
          <ol className="stops" ref={list}>
            <span className="rail" aria-hidden="true"><span className="rail-fill" ref={fill} /></span>
            {CHEF_STOPS.map((s, i) => (
              <li
                key={s.n}
                className={'stop' + (i === active ? ' on' : '')}
                ref={(el) => { stops.current[i] = el }}
                aria-current={i === active ? 'step' : undefined}
              >
                <button type="button" className="node" onClick={() => go(i)} aria-label={`Stop ${i + 1} of ${CHEF_STOPS.length}: ${s.label}`}>
                  <span aria-hidden="true">{s.n}</span>
                </button>
                <span className="s-label">{s.label}</span>
                <p><Marked text={s.text} marks={s.marks} /></p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
