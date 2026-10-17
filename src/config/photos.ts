/**
 * ALL image slots live here. To swap in Marsaun's real photos, drop files into /public/photos
 * (same file names, or change `file` below) and, if the framing differs, tweak `fit`.
 * Each slot is shown inside the same 16:9 "plate" box, so photos should be 16:9 with the dish
 * on the right half of the frame and negative space on the left (for the headline).
 * `file` is the base name: `<file>.webp` is served to modern browsers, `<file>.jpg` is the fallback.
 */
export type PhotoSlot = {
  file: string
  alt: string
  /** nudge the image inside the plate box, in percent of the plate box, plus scale */
  fit?: { x?: number; y?: number; scale?: number }
  /** responsive widths: files are `<file>-<w>.webp|jpg`; `dims` is the intrinsic size of the largest */
  widths?: number[]
  dims?: [number, number]
  /** object-position when shown in a cropped banner: desktop / mobile */
  position?: { d: string; m: string }
}

export const PHOTOS = {
  /**
   * REAL photo (Andrew-approved, Marsaun's own trays, no faces): main food image in the Packages banner.
   * Source: client-assets/real-meal-prep-trays-01.jpg. Only cropped (top 28% removed) + a light contrast touch; food not edited.
   */
  trays: {
    file: 'real-trays',
    alt: 'Rows of freshly prepped black meal-prep trays on a kitchen counter: grilled chicken, ribeye and shrimp with broccoli, green beans, roasted sweet potato, rice and mashed potatoes.',
    widths: [800, 1280, 1920],
    dims: [1920, 1843],
    position: { d: '50% 43%', m: '50% 78%' },
  },
  /** Step 1 landing + steps 2-4. Approved hero plate. */
  hero: {
    file: 'hero-tray',
    alt: 'A black meal-prep tray with its lid propped open: grilled ribeye, asparagus and roasted sweet potato, steam rising.',
  },
  /** Step 1 to 2: the empty tray the meal is built into. */
  empty: {
    file: 'empty-tray',
    alt: 'An empty three-compartment black meal-prep tray with its clear lid lifted off, on a dark counter.',
    fit: { x: 14, y: 2, scale: 1.0 },
  },
  /** Step 5: stacked, sealed containers. Same plate as the approved packages frame. */
  packages: {
    file: 'packages-stack',
    alt: 'A tall stack of sealed meal-prep containers with ribeye, broccoli and sweet potato.',
    fit: { x: 20, y: 0, scale: 0.94 },
  },
  /** Step 6: pickup. */
  pickup: {
    file: 'pickup-bag',
    alt: 'A kraft pickup bag with a blank ticket clipped on top, next to two stacked meal-prep containers on a counter.',
  },
  /** Step 7: lids closed. */
  sealed: {
    file: 'stack-sealed',
    alt: 'Six sealed meal-prep containers stacked, lids closed, ready to go.',
    fit: { x: 0, y: 6, scale: 1.0 },
  },
} satisfies Record<string, PhotoSlot>

export type PhotoKey = keyof typeof PHOTOS

/**
 * Brand mark. 'original' = Marsaun's own logo file (default, unaltered).
 * 'recolored' variants exist in /design/logo but are NOT approved by Marsaun.
 */
export const LOGO = {
  src: `${import.meta.env.BASE_URL}brand/logo-original.jpg`,
  alt: "Cook's Corner logo",
}

/**
 * Founder portrait for "Meet the chef". The file is a client photo of a person, so it is NOT committed to the public repo
 * (public/people/ is git-ignored). Run `python3 tools/prepare-portrait.py <source.png>` to create
 * public/people/marsaun-portrait.{jpg,webp}, then set `ready: true`.
 */
export const PORTRAIT = {
  ready: true,
  /** public/people/<file>-d (2:3, desktop) and -m (4:5, mobile) .webp|jpg: Sundae's calmer-grade crops from handoff-chef-pass/portrait */
  file: 'marsaun-portrait',
  alt: "Portrait of Marsaun Cook, founder of Cook's Corner, in his chef whites",
}
