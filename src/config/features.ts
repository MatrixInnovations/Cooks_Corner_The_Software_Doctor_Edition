/** Feature flags. liveCheckout stays false until the Netlify Functions + Stripe keys exist (see README, server/stripe-v1). */
export const FEATURES = {
  /** Tray Builder section on the homepage (Order buttons scroll to it). */
  trayBuilder: true,
  /** When true the builder's Checkout button posts the cart to /.netlify/functions/create-checkout-session. Off for now. */
  liveCheckout: false,
}
