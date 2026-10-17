/**
 * Fulfillment-day rules (pickup AND delivery share one schedule). Pure functions, no DOM / no import.meta: the Tray Builder uses it
 * for the "earliest day" estimate and the Netlify Functions use it for the authoritative assignment. All calendar math is America/New_York.
 *
 * Rules (confirmed by Andrew for Marsaun Cook):
 *  - Fulfillment days: Monday through Saturday, 11 AM to 7 PM, never Sunday. (Monday is on the schedule because Marsaun's
 *    5 monthly subscribers are fulfilled Mondays and Andrew said Monday has 5 slots left for new one-off orders.)
 *  - 48-hour turnaround from the order time. No same-day orders or pickup (follows from the 48 hours).
 *  - Order cutoff: Sunday 9:00 AM. An order placed at or after Sunday 9:00:00 AM rolls over to Monday: it is treated as placed at the
 *    start of Monday (12:00 AM ET), so its earliest day is Wednesday. The cutoff only ever affects that week's Tuesday (Sunday before 9 AM: Tuesday, after: Wednesday); it never
 *    blocks Wednesday-to-Saturday of the same week.
 *  - Maximum 10 separate orders per day. Some slots can be RESERVED for existing standing orders (default: 5 on Monday for the monthly
 *    subscribers), so Monday takes only 5 new one-off orders. A full day rolls the order to the next open day (Sundays skipped).
 */
export const TIME_ZONE = 'America/New_York'
export const DAILY_ORDER_CAP = 10
/** 0 = Sunday ... 6 = Saturday. Monday through Saturday (Monday is the subscribers' day, see above). */
export const OPEN_WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5, 6]
/** Slots held back per weekday for standing orders (subscribers). Monday: 5. Overridable by env (RESERVED_SLOTS_MONDAY etc.). */
export type Reserved = Partial<Record<number, number>>
export const DEFAULT_RESERVED: Reserved = { 1: 5 }
export const OPEN_HOUR = 11
export const CLOSE_HOUR = 19
export const TURNAROUND_HOURS = 48
export const CUTOFF_WEEKDAY = 0
export const CUTOFF_HOUR = 9
/** How far ahead we look for a day with room before giving up (about four months). */
export const MAX_LOOKAHEAD_DAYS = 120

const HOUR_MS = 3_600_000
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

type EtParts = { y: number; m: number; d: number; h: number; mi: number; s: number; weekday: number }

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
})
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** The wall-clock parts of an instant in New York. */
export function etParts(date: Date): EtParts {
  const o: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) o[p.type] = p.value
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, weekday: WEEKDAYS[o.weekday] }
}

const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
/** 'YYYY-MM-DD' (New York calendar date) of an instant. */
export function etDay(date: Date): string { const p = etParts(date); return dayKey(p.y, p.m, p.d) }

export function isDay(s: unknown): s is string {
  if (typeof s !== 'string') return false
  const m = DAY_RE.exec(s)
  if (!m) return false
  const [y, mo, d] = [+m[1], +m[2], +m[3]]
  const t = new Date(Date.UTC(y, mo - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d
}

/** Calendar-date arithmetic (no time zones involved, so month and year boundaries just work). */
export function addDays(day: string, n: number): string {
  const m = DAY_RE.exec(day)!
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n))
  return dayKey(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}
export function weekdayOf(day: string): number {
  const m = DAY_RE.exec(day)!
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()
}
export const isOpenDay = (day: string) => OPEN_WEEKDAYS.includes(weekdayOf(day))

/** The instant at which New York wall-clock reads `day` hh:mm (DST-safe; for a non-existent spring-forward time it lands just after the gap). */
export function etInstant(day: string, h = 0, mi = 0): Date {
  const m = DAY_RE.exec(day)!
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], h, mi)
  let t = wall
  for (let i = 0; i < 3; i++) {
    const p = etParts(new Date(t))
    const shown = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s)
    const diff = wall - shown
    if (diff === 0) break
    t += diff
  }
  return new Date(t)
}

/** Orders at or after Sunday 9:00:00 AM ET roll over to Monday. Returns the instant the order counts as placed. */
export function effectiveOrderTime(order: Date): { instant: Date; rolledOver: boolean } {
  const p = etParts(order)
  const afterCutoff = p.weekday === CUTOFF_WEEKDAY && p.h >= CUTOFF_HOUR
  if (!afterCutoff) return { instant: order, rolledOver: false }
  return { instant: etInstant(addDays(dayKey(p.y, p.m, p.d), 1), 0, 0), rolledOver: true }
}

/** First calendar day the order could possibly be ready: 48 hours after the effective order time, rolled forward if that moment is after closing, to an open day. */
export function earliestDay(order: Date): string {
  const { instant } = effectiveOrderTime(order)
  const ready = new Date(instant.getTime() + TURNAROUND_HOURS * HOUR_MS)
  const p = etParts(ready)
  let day = dayKey(p.y, p.m, p.d)
  if (p.h >= CLOSE_HOUR) day = addDays(day, 1)
  while (!isOpenDay(day)) day = addDays(day, 1)
  return day
}

/** Open days in order, starting at the earliest possible day (lazy: callers stop at the first day with room). */
export function* candidateDays(order: Date, lookaheadDays = MAX_LOOKAHEAD_DAYS): Generator<string> {
  const first = earliestDay(order)
  for (let i = 0; i <= lookaheadDays; i++) {
    const day = addDays(first, i)
    if (isOpenDay(day)) yield day
  }
}

/** New one-off orders a day can still take: the daily cap minus slots reserved for standing orders (never below 0). */
export const capacityOn = (day: string, cap = DAILY_ORDER_CAP, reserved: Reserved = DEFAULT_RESERVED) =>
  Math.max(0, cap - (reserved[weekdayOf(day)] ?? 0))

export type DayAssignment = { day: string | null; earliest: string; rolledOver: boolean; bumped: boolean }

/** Pure assignment from known per-day counts of paid one-off orders (missing day = 0; reserved slots are subtracted from the cap). `day` is null only if every day in the lookahead is full. */
export function assignDay(order: Date, counts: Record<string, number>, cap = DAILY_ORDER_CAP, reserved: Reserved = DEFAULT_RESERVED): DayAssignment {
  const earliest = earliestDay(order)
  const rolledOver = effectiveOrderTime(order).rolledOver
  for (const day of candidateDays(order)) {
    if ((counts[day] ?? 0) < capacityOn(day, cap, reserved)) return { day, earliest, rolledOver, bumped: day !== earliest }
  }
  return { day: null, earliest, rolledOver, bumped: false }
}

/** "Wed, Oct 21" (short) or "Wednesday, Oct 21" (long). Works on the calendar date itself, so it never shifts by time zone. */
export function formatDay(day: string, long = false): string {
  const m = DAY_RE.exec(day)!
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: long ? 'long' : 'short', month: 'short', day: 'numeric' }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])))
}
