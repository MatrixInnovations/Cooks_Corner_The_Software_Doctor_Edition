# Cook's Corner design spec: Charred & Citrus

Source of truth: `frames/charcoal-hero.png` (approved by Andrew). Mockup only, nothing live.

## Colors
| Role | Hex |
|---|---|
| Charcoal base | `#17140f` (hero edge `#0f0d0a`, lifted panels and cards `#221d17`) |
| Bone, text and light sections | `#f4ecdd` (alt `#ebe1cf`) |
| Chili red, prices and the one accent word | `#e2461f` |
| Button red, white text | `#c9381a` (white on `#e2461f` fails contrast) |
| Saffron, small labels, thin rules, step numbers | `#f2b632` |
| Herb green, optional tiny "Fresh" tags | `#7a9a4a` |

Rules: chili is only for prices, the accent word and buttons. Never use chili for small text on dark or on bone. Saffron on bone is for rules only, never text. No glow, no drop shadows.

## Type and shape
Anton for headlines (sentence case, tall condensed), Barlow for body, Barlow Condensed for tiny labels. Buttons and tags 8px radius, cards 12px.

## Layout
Hero: headline left, tray right (tray must not touch the frame edge), nav top with gold hairline, step counter "01 / 07" with dots at bottom right, clear of the tray. Seven-step tray scroll as in the copy file. Packages on a bone section with charcoal cards (frame held back until the repo is private). Keep every `NEED FROM MARSAUN` tag visible until answered.

## Assets
- `logo/logo-charcoal-chili.png` for bone backgrounds, `logo/logo-bone-saffron.png` for dark backgrounds (drawing unchanged from the client's logo).
- Food plates are AI placeholders to be replaced by Marsaun's real photos; build image slots to be swappable.
- Print drafts and the packages frame contain the client prices, phone and address, so they are held out of this public repo until it is private (kept in /workspace/cooks-corner/repo-design-private/).
