/** Pointer polish, loaded after first paint. Transform only, fine pointers only. Checkout is not moved. */

const SKIP = '.tb-checkout, .brand-intro-skip, .menu-toggle, .tb-bar, .tb-sheet'

export function enhance(doc: Document = document, win: Window = window): () => void {
  let fine = false
  try {
    fine = win.matchMedia('(hover: hover) and (pointer: fine)').matches
  } catch {
    fine = false
  }
  if (!fine) return () => {}
  const stops = [bindMagnetic(doc), bindTilt(doc)]
  return () => stops.forEach((s) => s())
}

function bindMagnetic(doc: Document): () => void {
  let current: HTMLElement | null = null
  const reset = (el: HTMLElement | null) => {
    if (!el) return
    el.style.transition = 'transform .45s cubic-bezier(.22,1,.36,1)'
    el.style.transform = ''
  }
  const onMove = (e: PointerEvent) => {
    const t = e.target
    const btn = t instanceof Element ? (t.closest('.btn') as HTMLElement | null) : null
    if (!btn || btn.matches(SKIP) || btn.closest('.tb-ticket, .tb-sheet, .order-dialog')) {
      if (current) reset(current)
      current = null
      return
    }
    if (current && current !== btn) reset(current)
    const r = btn.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    const dist = Math.hypot(dx, dy) || 1
    const reach = Math.max(r.width, r.height) * 0.9
    if (dist > reach) {
      if (current === btn) reset(btn)
      current = null
      return
    }
    const pull = (1 - dist / reach) * 8
    btn.style.transition = 'transform .08s linear'
    btn.style.transform = `translate3d(${((dx / dist) * pull).toFixed(2)}px, ${((dy / dist) * pull).toFixed(2)}px, 0)`
    current = btn
  }
  const onLeave = () => {
    reset(current)
    current = null
  }
  doc.addEventListener('pointermove', onMove, { passive: true })
  doc.addEventListener('pointerleave', onLeave)
  return () => {
    doc.removeEventListener('pointermove', onMove)
    doc.removeEventListener('pointerleave', onLeave)
    reset(current)
  }
}

function bindTilt(doc: Document): () => void {
  let current: HTMLElement | null = null
  const clear = (el: HTMLElement | null) => {
    if (!el) return
    el.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)'
    el.style.transform = ''
  }
  const onMove = (e: PointerEvent) => {
    const t = e.target
    const card = t instanceof Element ? (t.closest('.tilt') as HTMLElement | null) : null
    if (!card || (card.classList.contains('reveal') && !card.classList.contains('in'))) {
      if (current && current !== card) clear(current)
      return
    }
    if (current && current !== card) clear(current)
    const r = card.getBoundingClientRect()
    if (!r.width || !r.height) return
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    card.style.transition = 'transform .08s linear'
    card.style.transform = `translateY(-8px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`
    current = card
  }
  const onOut = (e: PointerEvent) => {
    const t = e.target
    const card = t instanceof Element ? (t.closest('.tilt') as HTMLElement | null) : null
    if (!card) return
    const next = e.relatedTarget
    if (next instanceof Node && card.contains(next)) return
    clear(card)
    if (current === card) current = null
  }
  doc.addEventListener('pointermove', onMove, { passive: true })
  doc.addEventListener('pointerout', onOut)
  return () => {
    doc.removeEventListener('pointermove', onMove)
    doc.removeEventListener('pointerout', onOut)
    clear(current)
  }
}
