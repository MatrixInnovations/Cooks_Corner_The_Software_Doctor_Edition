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
  webhooks: { constructEvent(payload: string, header: string, secret: string): Stripe.Event }
}

export type Env = Record<string, string | undefined>
export type { Stripe }
