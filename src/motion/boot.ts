import { INTRO_MS, INTRO_POINTER_EVENTS, readAllowsMotion } from './policy'

type Stop = () => void

/**
 * Arms CSS motion and the scroll/progress listeners. Does not hide anything when
 * reduced motion is on, and never sets pointer-events on ordering controls.
 * Hover tilt and magnetic pull load in a separate chunk after first paint.
 */
export function bootMotion(doc: Document = document, win: Window = window): Stop {
  if (!readAllowsMotion(win)) {
    doc.documentElement.classList.add('motion-off')
    doc.documentElement.classList.remove('motion', 'motion-io')
    return () => {}
  }
  if (doc.documentElement.dataset.motionBoot === '1') return () => {}
  doc.documentElement.dataset.motionBoot = '1'
  doc.documentElement.classList.add('motion', 'motion-io')
  doc.documentElement.classList.remove('motion-off')

  const stops: Stop[] = []
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    stops.splice(0).forEach((s) => s())
    delete doc.documentElement.dataset.motionBoot
    doc.documentElement.classList.remove('motion', 'motion-io')
  }

  stops.push(mountIntro(doc, win))
  stops.push(settleEntrances(doc, win))
  stops.push(observeReveals(doc, win))
  stops.push(bindScroll(doc, win))
  stops.push(bindBounce(doc))
  stops.push(bindTicker(doc, win))
  stops.push(watchReduce(doc, win, () => {
    dispose()
    doc.documentElement.classList.add('motion-off')
    doc.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'))
  }))

  let cancelIdle: Stop = () => {}
  if (win.requestIdleCallback) {
    const id = win.requestIdleCallback(() => kickEnhance())
    cancelIdle = () => win.cancelIdleCallback?.(id)
  } else {
    const id = win.setTimeout(() => kickEnhance(), 180)
    cancelIdle = () => win.clearTimeout(id)
  }
  stops.push(cancelIdle)

  function kickEnhance() {
    if (disposed) return
    void import('./enhance').then((m) => {
      if (disposed) return
      stops.push(m.enhance(doc, win))
    })
  }

  return dispose
}

function mountIntro(doc: Document, win: Window): Stop {
  const root = doc.createElement('div')
  root.className = 'brand-intro'
  root.style.pointerEvents = INTRO_POINTER_EVENTS
  const veil = doc.createElement('div')
  veil.className = 'brand-intro-veil'
  veil.setAttribute('aria-hidden', 'true')
  veil.style.pointerEvents = INTRO_POINTER_EVENTS
  const base = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || '/'
  veil.innerHTML =
    `<img alt="" width="72" height="72" src="${base}brand/logo-original.jpg" />` +
    `<b>Cook's Corner</b>`
  const skip = doc.createElement('button')
  skip.type = 'button'
  skip.className = 'brand-intro-skip'
  skip.textContent = 'Skip'
  skip.style.pointerEvents = 'auto'
  root.append(veil, skip)
  doc.body.append(root)

  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    win.clearTimeout(timer)
    win.removeEventListener('keydown', onKey)
    root.remove()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') stop()
  }
  skip.addEventListener('click', stop)
  win.addEventListener('keydown', onKey)
  const timer = win.setTimeout(stop, INTRO_MS)
  return stop
}

function settleEntrances(doc: Document, win: Window): Stop {
  const timer = win.setTimeout(() => doc.documentElement.classList.add('entrances-done'), 1700)
  const onEnd = (e: Event) => {
    const ev = e as AnimationEvent
    const t = ev.target
    if (!(t instanceof HTMLElement)) return
    if (ev.animationName === 'nav-drop' && t.classList.contains('site-header')) t.classList.add('nav-done')
    if (ev.animationName === 'cta-glow') t.classList.add('settled')
    if (ev.animationName === 'cta-pop' && t.closest('.site-header')) t.classList.add('settled')
  }
  doc.addEventListener('animationend', onEnd)
  return () => {
    win.clearTimeout(timer)
    doc.removeEventListener('animationend', onEnd)
  }
}

function observeReveals(doc: Document, win: Window): Stop {
  const els = [...doc.querySelectorAll<HTMLElement>('.reveal')]
  if (!els.length) return () => {}
  const IO = (win as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver
  if (typeof IO !== 'function') {
    els.forEach((el) => el.classList.add('in'))
    return () => {}
  }
  const io = new IO(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('in')
        io.unobserve(e.target)
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.12 },
  )
  els.forEach((el) => io.observe(el))
  // Ordering steps stay readable (CSS keeps their opacity at 1). If the observer never
  // fires, still settle them so a stuck animation can't leave the builder mid-slide.
  const fallback = win.setTimeout(() => {
    doc.querySelectorAll('.tb .reveal:not(.in)').forEach((el) => el.classList.add('in'))
  }, 1200)
  return () => {
    io.disconnect()
    win.clearTimeout(fallback)
  }
}

function bindScroll(doc: Document, win: Window): Stop {
  const bar = doc.createElement('div')
  bar.className = 'scroll-progress'
  bar.setAttribute('aria-hidden', 'true')
  bar.style.pointerEvents = INTRO_POINTER_EVENTS
  const fill = doc.createElement('span')
  bar.append(fill)
  doc.body.append(bar)

  doc.querySelectorAll<HTMLElement>('.stack-banner img, .chef-portrait img').forEach((img) => {
    img.setAttribute('data-parallax', '')
  })

  let raf = 0
  const tick = () => {
    raf = 0
    const max = doc.documentElement.scrollHeight - win.innerHeight
    const p = max > 0 ? Math.min(1, Math.max(0, win.scrollY / max)) : 0
    fill.style.transform = `scaleX(${p.toFixed(4)})`
    const story = doc.querySelector<HTMLElement>('.story')
    const scrub = doc.querySelector<HTMLElement>('.story-scrub i')
    if (story && scrub) {
      const total = story.offsetHeight - win.innerHeight
      const scrolled = Math.min(Math.max(-story.getBoundingClientRect().top, 0), Math.max(total, 0))
      const sp = total > 0 ? scrolled / total : 0
      scrub.style.transform = `scaleX(${sp.toFixed(4)})`
    }
    const limit = win.innerWidth < 821 ? 12 : 22
    const scale = win.innerWidth < 821 ? 1.035 : 1.06
    doc.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.bottom < -40 || r.top > win.innerHeight + 40) return
      const rel = (r.top + r.height / 2 - win.innerHeight / 2) / win.innerHeight
      const shift = Math.max(-limit, Math.min(limit, -rel * limit))
      el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0) scale(${scale})`
    })
  }
  const on = () => {
    if (!raf) raf = win.requestAnimationFrame(tick)
  }
  on()
  win.addEventListener('scroll', on, { passive: true })
  win.addEventListener('resize', on)
  return () => {
    win.removeEventListener('scroll', on)
    win.removeEventListener('resize', on)
    if (raf) win.cancelAnimationFrame(raf)
    bar.remove()
    doc.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
      el.style.transform = ''
      el.removeAttribute('data-parallax')
    })
  }
}

function bindBounce(doc: Document): Stop {
  const onClick = (e: Event) => {
    const t = e.target
    if (!(t instanceof Element)) return
    const btn = t.closest('.btn')
    if (!btn) return
    btn.classList.remove('is-pop')
    void (btn as HTMLElement).offsetWidth
    btn.classList.add('is-pop')
  }
  doc.addEventListener('click', onClick)
  return () => doc.removeEventListener('click', onClick)
}

function bindTicker(doc: Document, win: Window): Stop {
  const track = doc.querySelector<HTMLElement>('.ticker-track')
  const box = track?.parentElement
  const IO = (win as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver
  if (!track || !box || typeof IO !== 'function') return () => {}
  const io = new IO(([e]) => {
    track.style.animationPlayState = e?.isIntersecting ? 'running' : 'paused'
  })
  io.observe(box)
  return () => io.disconnect()
}

function watchReduce(doc: Document, win: Window, stopAll: () => void): Stop {
  let mq: MediaQueryList
  try {
    mq = win.matchMedia('(prefers-reduced-motion: reduce)')
  } catch {
    return () => {}
  }
  const on = () => {
    if (!mq.matches) return
    stopAll()
    doc.documentElement.classList.add('motion-off')
    doc.documentElement.classList.remove('motion', 'motion-io')
    doc.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'))
  }
  mq.addEventListener?.('change', on)
  return () => mq.removeEventListener?.('change', on)
}
