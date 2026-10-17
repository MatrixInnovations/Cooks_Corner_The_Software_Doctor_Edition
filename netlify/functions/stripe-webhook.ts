import Stripe from 'stripe'
import { blobOrderStore } from '../lib/orders'
import { handleStripeWebhook } from '../lib/webhook-handler'

export default async (req: Request) =>
  handleStripeWebhook(req, {
    env: process.env,
    // constructEvent only does local HMAC verification; the key is not used to call Stripe here
    stripe: () => new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_unset'),
    orders: blobOrderStore,
  })

export const config = { path: '/api/stripe-webhook' }
