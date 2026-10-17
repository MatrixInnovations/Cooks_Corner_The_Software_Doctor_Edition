# Cook's Corner: homepage (preview build)

React + Vite + TypeScript, with a lazy-loaded three.js (@react-three/fiber) steam layer. Palette **Charred & Citrus** (see `design/DESIGN.md`).
This is an unlisted preview: `noindex, nofollow` meta, `X-Robots-Tag` header and `robots.txt` Disallow. Checkout is a placeholder (no Stripe, no keys).

```
npm install
npm run dev        # local dev
npm run build      # type-check + production build to dist/
npm run preview    # serve dist/
npm run shots      # playwright screenshots into shots/ (needs a running preview, see tools/shots.mjs)
```

## Where things live
| What | Where |
|---|---|
| Colors, radii, easing (single source) | `src/tokens.css` |
| **All image slots** (swap Marsaun's real photos here) | `src/config/photos.ts` + files in `public/photos/` |
| Logo (original by default) | `src/config/photos.ts` (`LOGO`), file in `public/brand/` |
| Copy, prices, menu lists | `src/config/content.ts` |
| Seven-step tray scroll (the page is the tray) | `src/components/Story.tsx` (step timings are the `compute()` function) |
| three.js steam (lazy chunk) | `src/three/Steam.tsx` |
| Sections below the story | `src/components/Sections.tsx` |
| Design spec, frames, recolored logos | `design/` |
| Motion spec + plate sources | `design/art/` |
| Approved captions and button labels | `copy/homepage-captions.md` |

## Swapping in real photos
Each slot is a 16:9 image with the dish on the right and space on the left for the headline. Replace the file in `public/photos/` (provide both `.jpg` and `.webp`, same base name) or change `file` in `src/config/photos.ts`; use `fit` to nudge framing. The fade-to-background mask is applied by CSS, so no editing is needed.

## Motion
One 100vh of scroll per step, seven steps plus a short hold. Values are smoothed with a critically damped lerp (0.08), no bounce, transform and opacity only. `prefers-reduced-motion` shows each step's final state with a 200 ms opacity fade and skips three.js. The ticket prints in six stepped increments. Test hooks: `?s=2.5` pins the story position, `?nosteam` skips three.js.

## Still open (kept visible on the page as "Need from Marsaun" tags)
subscription menu contents and billing/pause/cancel, delivery address method, catering group sizes/example menus/travel distance, photos.

## Confirmed by Andrew (now on the page)
Business name Cook's Corner; planned domain cookscornerllc.com (placeholder, not live; the EIN is internal and is NOT on the site); pickup or delivery 48 hours after the order; delivery fee $15 within 25 miles; "List allergies prior to ordering*" note; policies section (verbatim text in `src/config/content.ts`, `POLICIES`).


## v5 additions
- Subscriptions are MONTHLY: 8 meals $400, 10 meals $500, 16 meals $768 per month; 12 meals $575 shows a "Confirm monthly" tag.
- "Meet the chef": pinned portrait + four scroll stops (`CHEF_STOPS` in `src/config/content.ts`). Preview-only confirm tag; remove after Marsaun OKs it.
- Portrait is a client photo of a person and is NOT in the repo (`public/people/` is git-ignored). Run `python3 tools/prepare-portrait.py <file>` and set `PORTRAIT.ready = true` in `src/config/photos.ts`. Until then a placeholder with a NEED tag shows.
- "What customers say": Google quotes + anonymous text-message quotes (`REVIEWS`), 5.0 / 19 Google reviews line, preview-only confirm tag. Review screenshots stay in client-assets and are not deployed.
- Jingle: Marsaun's 42s file in `public/audio/` (mp3 + m4a), play/pause button in the footer; never autoplays, pauses when the tab is hidden, resets at the end.
- Footer legal line: Cook's Corner LLC.

## v9 confirmed facts
Instagram _cooks_corner_ (linked); sauces Spank Sauce + Spice Man; pickup Mon-Sat 11-7 (Monday: 5 of 10 slots reserved for monthly subscribers), no Sundays, max 10 orders/day, delivery same schedule ($15); order via site or Instagram DM (the "any day, any time" wording was removed Oct 17 after the Sunday 9:00 AM cutoff and no same-day rule); catering is custom, by phone and/or DM; protein maximums 3/3/4/6; subscriptions are monthly ($400/$500/$768; $575 for 12 meals, confirmed monthly Oct 17; delivery is $15 each time, billed separately, including for subscribers); 48-hour turnaround confirmed; Reheating & Storage policy card added.

## Tray Builder (`#build`)

Order now / Choose this package scroll to the builder (`src/components/TrayBuilder.tsx`). Flow: package (8/10/12/16) → proteins (caps 3/3/4/6) → sides → sauces (Spank Sauce, Spice Man) → allergy note → pickup or delivery (+$15) on the ticket.
- Prices, caps, menu and validation live in `src/shared/catalog.ts` (pure TS, also used by the server Functions; the server never trusts client prices).
- Desktop: sticky tray picture + ticket column (shrinks on short screens). Mobile: slim button-red bar that opens a full-screen ticket sheet.
- The tray picture is a **composite**: transparent layers (`public/photos/tray/*.webp`, built by `tools/tray-layers.py`) cut from the real tray photo. There are no per-item photos yet, so any protein/side shows a generic stand-in. Need: a photo of each item.
- Checkout is not live. `src/config/features.ts` → `liveCheckout: false` shows "Checkout coming soon, order by DM @_cooks_corner_ for now".
- Order cutoff is Sunday at 9:00 AM, and there are no same-day orders or pickup (Andrew, Oct 17; which week it applies to is still to confirm with Marsaun). Still tagged NEED FROM MARSAUN: side picks per package, sauces per order (and extra cost). Honey Nut Salmon is intentionally not selectable until confirmed as a protein.

## Server side: Stripe Checkout (Phase 1, branch `server/stripe-v1`)

Netlify Functions (TypeScript), served at `/api/*`:
- `POST /api/create-checkout-session` (`netlify/functions/create-checkout-session.ts`): validates the tray, prices it from `src/shared/catalog.ts` (**client prices are ignored**), creates a Stripe Checkout Session and returns `{ id, url }`.
  - One-time packages → `payment` mode: 8/$116, 10/$150, 12/$155, 16/$190 (+$15 delivery as its own line item). Protein caps 3/3/4/6.
  - Monthly subscriptions → `subscription` mode (`mode: "subscription"`): 8/$400, 10/$500, 16/$768. **12/$575 is disabled** until Andrew confirms the period. Delivery on subscriptions is refused until the recurring delivery fee is confirmed.
  - Requires `acceptedPolicies: true`. Delivery orders collect a US shipping address in Checkout; phone is collected too. Tray, sauces, allergy note, pickup/delivery and the policy-acceptance time are stored in session metadata.
  - Guards: origin check (SITE_URL), JSON only, 8 KB body cap, per-IP rate limit (default 10 / 10 min, counters hashed, kept in Netlify Blobs), optional `Idempotency-Key` header, Stripe errors never echoed to the browser, live keys refused unless `STRIPE_ALLOW_LIVE=true`.
- `POST /api/stripe-webhook` (`netlify/functions/stripe-webhook.ts`): verifies the Stripe signature on the raw body, then on `checkout.session.completed` / `async_payment_succeeded` (paid only) stores the order in Netlify Blobs (`orders`, key = session id; `stripe-events` dedupes by event id). Idempotent. Returns 500 on storage failure so Stripe retries.
- Optional confirmation email (`netlify/lib/email.ts`, Resend): **off** unless `ORDER_EMAIL_ENABLED=true` plus `RESEND_API_KEY` and `ORDER_EMAIL_FROM`. A failure never fails the webhook.
- Front end: `FEATURES.liveCheckout` in `src/config/features.ts` is **false**, so the builder still shows "Checkout coming soon, order by DM". When true, the Checkout button (with a policy checkbox) calls `startCheckout()` in `src/lib/checkout.ts`.

### Setup (test mode first)
1. In Stripe (test mode) create a **restricted key** with only *Checkout Sessions: Write* (a standard `sk_test_` key also works). Copy `.env.example` → `.env` (never commit it) or add the variables in Netlify → Site configuration → Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL` (https).
2. Add a webhook endpoint `https://<site>/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`; copy its signing secret to `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:8888/api/stripe-webhook` then `netlify dev`.
3. Flip `liveCheckout` to `true`, deploy, pay with Stripe test card `4242 4242 4242 4242`, and check the order appears in Blobs (`netlify blobs:list orders`).
4. Live: use live keys and set `STRIPE_ALLOW_LIVE=true` only when Andrew approves. Turn on the Stripe Dashboard terms/refund links and tax settings as needed.

### Tests
`npm test` (vitest, 47 tests): catalog pricing and caps, request validation, session params (amounts, delivery, subscription, metadata, client-price tampering), handler (rate limit, origin, errors, live-key guard), webhook (signature, idempotency, storage, email hook). Stripe is always mocked; nothing calls Stripe. `npm run typecheck:server` type-checks the functions and tests.
