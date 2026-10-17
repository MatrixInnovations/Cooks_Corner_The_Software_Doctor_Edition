import { describe, expect, it } from 'vitest'
import {
  OPEN_WEEKDAYS, addDays, assignDay, candidateDays, capacityOn, earliestDay, effectiveOrderTime, etDay, etInstant, etParts, formatDay, isDay, isOpenDay, weekdayOf,
} from '../src/shared/schedule'

/** New York wall-clock time -> instant. */
const at = (day: string, h = 12, mi = 0) => etInstant(day, h, mi)
const ealiest = earliestDay

describe('New York time helpers', () => {
  it('etInstant is DST-correct', () => {
    expect(at('2026-10-17', 12).toISOString()).toBe('2026-10-17T16:00:00.000Z') // EDT, UTC-4
    expect(at('2026-12-01', 12).toISOString()).toBe('2026-12-01T17:00:00.000Z') // EST, UTC-5
    expect(at('2026-11-01', 10).toISOString()).toBe('2026-11-01T15:00:00.000Z') // morning after the fall-back
  })
  it('etParts / etDay read the New York wall clock (not UTC)', () => {
    const late = new Date('2026-10-18T02:30:00Z') // Sat 10:30 PM ET
    expect(etDay(late)).toBe('2026-10-17')
    expect(etParts(late)).toMatchObject({ weekday: 6, h: 22, mi: 30 })
  })
  it('isDay validates real calendar dates', () => {
    expect(isDay('2026-10-17')).toBe(true)
    for (const bad of ['2026-02-30', '2026-13-01', '10/17/2026', '2026-1-1', 5, null, undefined]) expect(isDay(bad)).toBe(false)
    expect(isDay('2028-02-29')).toBe(true); expect(isDay('2027-02-29')).toBe(false)
  })
  it('addDays and weekdayOf cross month, year and leap boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(weekdayOf('2026-10-17')).toBe(6) // Saturday
    expect(weekdayOf('2026-10-18')).toBe(0)
  })
  it('formatDay is short or long and never shifts by time zone', () => {
    expect(formatDay('2026-10-21')).toBe('Wed, Oct 21')
    expect(formatDay('2026-10-21', true)).toBe('Wednesday, Oct 21')
    expect(formatDay('2027-01-01')).toBe('Fri, Jan 1')
  })
  it('open days are Monday through Saturday, never Sunday', () => {
    expect(OPEN_WEEKDAYS).toEqual([1, 2, 3, 4, 5, 6])
    expect(isOpenDay('2026-10-18')).toBe(false) // Sunday
    expect(isOpenDay('2026-10-19')).toBe(true)
  })
})

describe('Sunday 9:00 AM cutoff rolls over to Monday', () => {
  it('Sunday 8:59 AM is before the cutoff: counted as placed Sunday, earliest Tuesday', () => {
    expect(effectiveOrderTime(at('2026-10-18', 8, 59)).rolledOver).toBe(false)
    expect(ealiest(at('2026-10-18', 8, 59))).toBe('2026-10-20')
    expect(ealiest(at('2026-10-18', 0, 5))).toBe('2026-10-20')
  })
  it('Sunday 9:00 AM exactly and later rolls over to Monday: earliest Wednesday', () => {
    expect(effectiveOrderTime(at('2026-10-18', 9, 0)).rolledOver).toBe(true)
    expect(ealiest(at('2026-10-18', 9, 0))).toBe('2026-10-21')
    expect(ealiest(at('2026-10-18', 15, 30))).toBe('2026-10-21')
    expect(ealiest(at('2026-10-18', 23, 59))).toBe('2026-10-21')
  })
  it('the rolled-over order counts as placed at the start of Monday', () => {
    expect(effectiveOrderTime(at('2026-10-18', 12)).instant.toISOString()).toBe(at('2026-10-19', 0).toISOString())
  })
  it('the cutoff does not block the same week: Mon to Thu orders get their normal 48-hour day', () => {
    expect(ealiest(at('2026-10-19', 10))).toBe('2026-10-21') // Mon -> Wed
    expect(ealiest(at('2026-10-20', 10))).toBe('2026-10-22') // Tue -> Thu
    expect(ealiest(at('2026-10-21', 12))).toBe('2026-10-23') // Wed -> Fri
    expect(ealiest(at('2026-10-22', 12))).toBe('2026-10-24') // Thu -> Sat
  })
})

describe('48 hours, no same-day, no Sundays', () => {
  it('ready moment after closing (7 PM) moves to the next day', () => {
    expect(ealiest(at('2026-10-19', 18, 59))).toBe('2026-10-21')
    expect(ealiest(at('2026-10-19', 19, 0))).toBe('2026-10-22')
    expect(ealiest(at('2026-10-19', 23, 30))).toBe('2026-10-22')
  })
  it('Friday and Saturday orders skip Sunday to Monday', () => {
    expect(ealiest(at('2026-10-23', 12))).toBe('2026-10-26') // Fri 12:00 -> Sun -> Mon
    expect(ealiest(at('2026-10-23', 20))).toBe('2026-10-26')
    expect(ealiest(at('2026-10-24', 12))).toBe('2026-10-26') // Sat -> Mon
    expect(ealiest(at('2026-10-17', 10))).toBe('2026-10-19')
  })
  it('never same-day, never Sunday, never sooner than 48 hours (sweep of ~100 days)', () => {
    const start = at('2026-09-01', 0).getTime()
    for (let t = start; t < start + 100 * 86_400_000; t += 37 * 60_000) {
      const order = new Date(t)
      const day = earliestDay(order)
      expect(day > etDay(order)).toBe(true)
      expect(weekdayOf(day)).not.toBe(0)
      // the kitchen is open until 7 PM on that day, and the 48 hours have passed by then
      expect(etInstant(day, 19, 0).getTime()).toBeGreaterThan(effectiveOrderTime(order).instant.getTime() + 48 * 3_600_000 - 1)
    }
  })
  it('the 48 hours are real hours across the DST change', () => {
    // Sat Oct 31 7:30 PM EDT + 48 real hours = Mon Nov 2 6:30 PM EST (the clock gains an hour): still Monday
    expect(ealiest(at('2026-10-31', 19, 30))).toBe('2026-11-02')
    // 8:30 PM EDT -> Mon 7:30 PM EST: after closing, Tuesday
    expect(ealiest(at('2026-10-31', 20, 30))).toBe('2026-11-03')
    // after the fall-back Sunday, a roll-over order is Monday 12 AM EST -> Wednesday
    expect(ealiest(at('2026-11-01', 10))).toBe('2026-11-04')
  })
})

describe('month, year and leap-year boundaries', () => {
  it('end of September -> October', () => { expect(ealiest(at('2026-09-30', 12))).toBe('2026-10-02') })
  it('end of October -> November (Sunday skipped)', () => {
    expect(ealiest(at('2026-10-29', 12))).toBe('2026-10-31')
    expect(ealiest(at('2026-10-30', 12))).toBe('2026-11-02')
  })
  it('end of year', () => {
    expect(ealiest(at('2026-12-30', 12))).toBe('2027-01-01')
    expect(ealiest(at('2026-12-31', 12))).toBe('2027-01-02')
  })
  it('leap day', () => {
    expect(ealiest(at('2028-02-27', 10))).toBe('2028-03-01') // Sunday after cutoff -> Monday Feb 28 -> Wed Mar 1
    expect(ealiest(at('2028-02-27', 8))).toBe('2028-02-29') // Sunday before cutoff -> Tue Feb 29
    expect(ealiest(at('2027-02-26', 12))).toBe('2027-03-01') // Fri -> Sun -> Mon (non-leap)
  })
})

describe('10 per day cap and reserved Monday slots', () => {
  const sat = at('2026-10-17', 10) // earliest Mon Oct 19
  const wed = at('2026-10-19', 10) // earliest Wed Oct 21
  it('takes the earliest day while there is room', () => {
    expect(assignDay(wed, {}, 10, {})).toEqual({ day: '2026-10-21', earliest: '2026-10-21', rolledOver: false, bumped: false })
    expect(assignDay(wed, { '2026-10-21': 9 }, 10, {}).day).toBe('2026-10-21')
  })
  it('the 11th order rolls to the next open day', () => {
    const a = assignDay(wed, { '2026-10-21': 10 }, 10, {})
    expect(a).toMatchObject({ day: '2026-10-22', earliest: '2026-10-21', bumped: true })
  })
  it('keeps rolling past several full days', () => {
    expect(assignDay(wed, { '2026-10-21': 10, '2026-10-22': 10, '2026-10-23': 10 }, 10, {}).day).toBe('2026-10-24')
  })
  it('a full Saturday skips Sunday', () => {
    const a = assignDay(at('2026-10-21', 12), { '2026-10-23': 10, '2026-10-24': 10 }, 10, {}) // earliest Fri 23
    expect(a.day).toBe('2026-10-26')
    expect(weekdayOf(a.day!)).toBe(1)
  })
  it('rolls across a month boundary', () => {
    expect(assignDay(at('2026-10-29', 12), { '2026-10-31': 10 }, 10, {}).day).toBe('2026-11-02')
  })
  it('a roll-over (after Sunday 9 AM) order that finds Wednesday full goes to Thursday', () => {
    const a = assignDay(at('2026-10-18', 12), { '2026-10-21': 10 }, 10, {})
    expect(a).toMatchObject({ day: '2026-10-22', rolledOver: true, bumped: true })
  })
  it('a custom cap is honored', () => {
    expect(assignDay(wed, { '2026-10-21': 2 }, 2, {}).day).toBe('2026-10-22')
  })
  it('Monday has 5 reserved slots by default: only 5 one-off orders fit', () => {
    expect(capacityOn('2026-10-19')).toBe(5)
    expect(capacityOn('2026-10-20')).toBe(10)
    expect(assignDay(sat, { '2026-10-19': 4 }).day).toBe('2026-10-19')
  })
  it('with Monday reserved at 5, the 6th one-off order rolls to Tuesday', () => {
    const counts: Record<string, number> = {}
    const days: string[] = []
    for (let i = 0; i < 6; i++) {
      const d = assignDay(sat, counts).day!
      counts[d] = (counts[d] ?? 0) + 1
      days.push(d)
    }
    expect(days).toEqual(['2026-10-19', '2026-10-19', '2026-10-19', '2026-10-19', '2026-10-19', '2026-10-20'])
  })
  it('reservation is overridable (none = Monday takes 10; 10 = Monday takes nobody)', () => {
    expect(capacityOn('2026-10-19', 10, {})).toBe(10)
    expect(assignDay(sat, { '2026-10-19': 9 }, 10, {}).day).toBe('2026-10-19')
    expect(assignDay(sat, {}, 10, { 1: 10 }).day).toBe('2026-10-20')
    expect(capacityOn('2026-10-19', 10, { 1: 99 })).toBe(0)
  })
  it('null when every day in the lookahead is full', () => {
    const counts: Record<string, number> = {}
    for (const d of candidateDays(wed)) counts[d] = 10
    expect(assignDay(wed, counts, 10, {}).day).toBeNull()
  })
})
