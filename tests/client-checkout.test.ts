import { describe, expect, it } from 'vitest'
import { checkoutErrorMessage } from '../src/lib/checkout'

describe('checkoutErrorMessage (what the customer sees when starting checkout fails)', () => {
  it('always names a cause and a way forward', () => {
    for (const [status, code] of [[null, undefined], [429, 'rate_limited'], [400, 'invalid_request'], [403, 'bad_origin'], [415, 'x'], [502, 'stripe_error'], [503, 'not_configured'], [503, 'fully_booked'], [500, undefined]] as const) {
      const m = checkoutErrorMessage(status, code)
      expect(m).toMatch(/\(cause: .+\)/)
      expect(m).toMatch(/DM|try again|Wait|Refresh/i)
    }
  })
  it('shows the first validation detail from the server', () => {
    expect(checkoutErrorMessage(400, 'invalid_request', ['Pick at least one protein.'])).toBe('Pick at least one protein. (cause: tray check)')
  })
})
