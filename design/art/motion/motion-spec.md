# Cook's Corner: premium motion spec (Kitchen Stage, 7-step tray scroll, Charred & Citrus palette)

Rules: no bounce, no overshoot, no squash and stretch, no spring. Motion is slow-in, slow-out, and it stops cleanly. Everything is scroll-driven and reversible. Honor prefers-reduced-motion: show the final state of each step with a 200 ms opacity fade.

Easing tokens
- ease-out-soft: cubic-bezier(0.22, 0.61, 0.36, 1) (arrivals)
- ease-in-out-soft: cubic-bezier(0.45, 0.05, 0.25, 1) (lid, crossfades)
- ease-in-soft: cubic-bezier(0.5, 0, 0.75, 0.4) (departures)
- ease-linear: only for the ticket print and the steam drift

Palette tokens used by motion
- Page ground: charcoal #17140f; hero edge #0f0d0a; lifted panels #221d17.
- Ring, step numbers, thin rules: saffron #f2b632. Active step dot: saffron; inactive: bone #f4ecdd at 30%.
- Price and accent word: chili #e2461f. Buttons: #c9381a with white text, 8 px radius, hover darkens to #b32f14 over 160 ms ease-out-soft (no lift, no scale).
- Text: bone #f4ecdd. Plates are native charcoal, so crossfades between plates show no seams.

Scroll mapping: pin the tray scene, 100vh of scroll per step, 7 steps. Smooth the scroll value with a critically damped lerp (factor 0.08 per frame at 60 fps, no overshoot).

| Step | Beat | Duration (scroll-linked) | Easing | Notes |
|---|---|---|---|---|
| 1 | Empty tray settles in | 900 ms | ease-out-soft | Tray fades in 0 to 1 and rises 24 px; lid stays propped; headline fades up 16 px |
| 2 | Protein arrives | 800 ms | ease-out-soft | Plate crossfades empty to protein in 600 ms (ease-in-out-soft); 2% scale-down settle (1.02 to 1.0); soft contact shadow tightens 120 ms behind it |
| 3 | Sides arrive | 800 ms | ease-out-soft | Same as step 2, 120 ms stagger between asparagus and sweet potato; saffron (#f2b632) 1.5 px ring draws around the item over 500 ms |
| 4 | Sauce | 700 ms | ease-out-soft | Saffron ring moves with a 500 ms ease-in-out-soft; caption swaps with 200 ms cross-dissolve |
| 5 | Packages | 900 ms | ease-in-out-soft | Tray scales to 0.92 and fades back 40%; stack plate fades up 0 to 1 over 700 ms; cards rise 20 px with a 80 ms stagger |
| 6 | Pickup | 900 ms | ease-in-out-soft | Crossfade 700 ms; image slides 16 px |
| 7 | Lid closes and ticket prints | lid 700 ms, ticket 1200 ms | lid ease-in-out-soft; ticket linear | Lid rotates from open to closed in 700 ms with no bounce; ticket starts 300 ms after the lid latches, slides out of the slot 0 to 100% in 1200 ms linear with 6 stepped 200 ms increments (like a printer), then holds |

Steam (hero and step 2)
- 2 to 3 soft layers of the steam wisp at 8 to 14% opacity, blurred 12 to 24 px.
- Drift upward 40 to 70 px over 6 to 9 s, linear, looping, with each layer offset in phase. Fade in over the first 20% and out over the last 30%.
- Pause steam in the lid-closed state (step 7), fading out over 600 ms.

Lid close (step 7, the real tray render)
- Use 12 pre-rendered frames (open to closed) scrubbed over 700 ms, or a 3D hinge rotation of 0 to 100% with ease-in-out-soft and a 3% settle at the end only through the easing curve, never a rebound.
- Add a soft contact shadow growth (0 to 100% over 700 ms) and a 2 to 3% brightness shift on the lid reflection.

Ambient
- No glow and no CSS shadows (per the palette rules). The warm light is baked into the plates. Optional: the upper-right warm light layer breathes between 94% and 100% opacity on an 8 s sine.
- Hero tray: parallax of up to 12 px against pointer movement, damped (lerp 0.06).

Performance
- Animate only transform and opacity. Use will-change sparingly. Cap devicePixelRatio at 2. Pause the animation when the tab is hidden.
