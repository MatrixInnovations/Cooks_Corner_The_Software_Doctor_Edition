/** Feature flags. liveCheckout stays false until the Netlify Functions + Stripe keys exist (see README, server/stripe-v1). */
/**
 * Internal review tags ("Need from Marsaun", "Confirm with Marsaun", "Proposed wording"...). Build-time flag, OFF by default so
 * production never shows them. Turn on for a review preview only: VITE_SHOW_REVIEW_TAGS=true npm run build
 */
export const SHOW_REVIEW_TAGS = import.meta.env.VITE_SHOW_REVIEW_TAGS === 'true'

export const FEATURES = {
  /** Tray Builder section on the homepage (Order buttons scroll to it). */
  trayBuilder: true,
  /** When true the builder's Checkout button posts the cart to /.netlify/functions/create-checkout-session. Off for now. */
  liveCheckout: true,
}
