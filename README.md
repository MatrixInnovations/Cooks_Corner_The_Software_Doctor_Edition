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
$575 / 12-meal subscription period (shows a "Confirm monthly" tag), subscription menu contents and billing/pause/cancel, delivery address method, catering group sizes/example menus/travel distance, photos.

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
Instagram _cooks_corner_ (linked); sauces Spank Sauce + Spice Man; pickup Tue-Sat 11-7, no Sundays, delivery same schedule ($15); order any day/time via site or Instagram DM; catering is custom, by phone and/or DM; protein maximums 3/3/4/6; subscriptions are monthly ($400/$500/$768; $575 for 12 meals awaits period confirmation); 48-hour turnaround confirmed; Reheating & Storage policy card added.
