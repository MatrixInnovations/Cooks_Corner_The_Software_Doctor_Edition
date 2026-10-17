# Cook's Corner Meal Prep: homepage (preview build)

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
Sauce names and pairings, pickup days and hours, order cutoff, ordering flow, delivery days/times/fee, 16-meal protein maximum, subscription period/terms/billing, catering details, Instagram handle spelling, business hours.
