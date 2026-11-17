/**
 * Visual frame of a count-up. At t >= 1 the original string is returned unchanged
 * (same digits, punctuation, and words). Only digit runs already in `original` move.
 */
export function countFrame(original: string, t: number): string {
  if (t >= 1) return original
  const eased = 1 - (1 - Math.max(0, t)) ** 3
  let out = ''
  let last = 0
  for (const m of original.matchAll(/\d+(?:\.\d+)?/g)) {
    const i = m.index ?? 0
    out += original.slice(last, i)
    const raw = m[0]
    const final = Number(raw)
    const decimals = raw.includes('.') ? (raw.split('.')[1]?.length ?? 0) : 0
    const cur = final * eased
    out += decimals ? cur.toFixed(decimals) : String(Math.round(cur))
    last = i + raw.length
  }
  out += original.slice(last)
  return out
}
