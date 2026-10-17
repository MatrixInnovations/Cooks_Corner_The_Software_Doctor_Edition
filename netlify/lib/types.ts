import type Stripe from 'stripe'

/** The slice of the Stripe SDK we use. Real `new Stripe()` satisfies it; tests pass a mock (we never hit Stripe in tests). */
export interface StripeClient {
  checkout: {
    sessions: {
      create(
        params: Stripe.Checkout.SessionCreateParams,
        options?: { idempotencyKey?: string },
      ): Promise<{ id: string; url: string | null }>
    }
  }
  /** Optional: only used when STRIPE_COUNT_SUBSCRIPTIONS=true (needs the key to have Subscriptions: Read). */
  subscriptions?: {
    list(params: { limit: number; starting_after?: string }): Promise<{ data: Array<{ id: string; status?: string; metadata?: Record<string, string> | null }>; has_more: boolean }>
  }
  webhooks: { constructEvent(payload: string, header: string, secret: string): Stripe.Event }
}

export type Env = Record<string, string | undefined>
export type { Stripe }
