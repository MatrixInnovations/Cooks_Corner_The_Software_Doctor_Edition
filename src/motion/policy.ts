/** Motion is opt-in. Reduced motion, a missing matchMedia, or a thrown lookup all mean: show the final page. */
export function allowsPageMotion(prefersReducedMotion: boolean): boolean {
  return prefersReducedMotion === false
}

export function readAllowsMotion(win: { matchMedia?: (q: string) => { matches: boolean } } | undefined): boolean {
  try {
    const mq = win?.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return false
    return allowsPageMotion(mq.matches === true)
  } catch {
    return false
  }
}

/** Branded intro length. Must stay under 1.2s and must never cover clicks. */
export const INTRO_MS = 1050

/** The intro shell and its veil ignore hits so Order / Checkout stay clickable on the first frame. */
export const INTRO_POINTER_EVENTS = 'none'

export function introBlocksClicks(pointerEvents: string | null | undefined): boolean {
  return pointerEvents !== INTRO_POINTER_EVENTS
}
