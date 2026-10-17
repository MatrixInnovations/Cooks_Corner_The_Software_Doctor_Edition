import { MENU_ITEMS, ONE_TIME_PACKAGES } from '../shared/catalog'

/** Copy + facts. Source: copy/homepage-captions.md and the client's own flyers. No claims beyond these. */
export const BIZ = {
  name: "Cook's Corner",
  sub: 'Meal Prep', // small descriptor under the name in the header only; the business name is "Cook's Corner"
  domain: 'cookscornerllc.com', // placeholder, not live yet
  tagline: "We cook when you can't.",
  address: '8432 Old Statesville Rd., Suite 100',
  phone: '704.350.5827',
  phoneHref: 'tel:+17043505827',
  email: 'TheCooksCornerChefs@yahoo.com',
  instagram: '@_cooks_corner_', // confirmed by Andrew
  instagramUrl: 'https://instagram.com/_cooks_corner_',
}

/** Confirmed by Andrew. */
export const SAUCES = [
  { name: 'Spank Sauce', desc: 'Greek yogurt base, preferably for salmon' },
  { name: 'Spice Man', desc: 'sweet Thai chili base' },
] as const
export const PICKUP_HOURS = 'Tuesday through Saturday, 11 AM to 7 PM unless advised otherwise. No Sundays.'
export const PICKUP_HOURS_SHORT = 'Tue\u2013Sat, 11 AM\u20137 PM'
export const ORDERING = 'Order by checking out on the site or sending us a DM on Instagram.'
export const CATERING_HOW = 'Catering is special and custom. Request it by phone and/or DM.'

export const NEED = 'Need from Marsaun'

export const STEPS = [
  { n: 1, label: 'Empty tray', cap: "We cook when you can't." },
  { n: 2, label: 'Protein', cap: 'Start with the protein.' },
  { n: 3, label: 'Sides', cap: 'Add your sides.' },
  { n: 4, label: 'Sauce', cap: 'Finish with the sauce.' },
  { n: 5, label: 'Packages', cap: 'Pick how many meals your week needs.' },
  { n: 6, label: 'Pickup', cap: 'Grab it at the storefront.' },
  { n: 7, label: 'Done', cap: 'Your week is handled.' },
] as const

/** One-time packages: prices and protein caps come from src/shared/catalog.ts (also used by the server). */
export const PACKAGES = ONE_TIME_PACKAGES.map((p) => ({ meals: p.meals, price: p.priceCents / 100, proteins: `Up to ${p.maxProteins} proteins` }))

/**
 * Subscriptions are MONTHLY (confirmed): 8 = $400, 10 = $500, 12 = $575, 16 = $768 per month.
 * Delivery is $15 each time it is needed, billed separately (also for subscribers).
 */
export const SUBSCRIPTIONS = [
  { meals: 8, price: 400, confirm: false },
  { meals: 10, price: 500, confirm: false },
  { meals: 12, price: 575, confirm: false },
  { meals: 16, price: 768, confirm: false },
] as const

/** Marsaun's jingle (42s). Two sources so it plays everywhere; never autoplays. Source file: client-assets/marsaun-jingle.m4a */
export const JINGLE = {
  sources: [
    { src: `${import.meta.env.BASE_URL}audio/cooks-corner-jingle.mp3`, type: 'audio/mpeg' },
    { src: `${import.meta.env.BASE_URL}audio/cooks-corner-jingle.m4a`, type: 'audio/mp4' },
  ],
  label: "Cook's Corner jingle",
}

/**
 * "Meet the chef" (The Chef's Pass). Story is the approved text from Andrew (apostrophes typeset as \u2019); do not paraphrase.
 * Marsaun approved publishing his background and this exact wording (Andrew: "move forward with it"). No confirm tags.
 * Years cooking and signature dish are answered in CHEF_FACTS; never invent other facts.
 */
export const CHEF_STORY =
  'Marsaun built Cook\u2019s Corner on three things: care, consistency and good food. His path to meal prep grew from his love of food and the culinary foundation he built at Johnson & Wales University, where he earned degrees in Culinary Arts and Food Service Management. After years serving his community in law enforcement, he brought that same commitment and work ethic into the kitchen. Today he makes flavorful, thoughtfully prepared meals that make the week easier for busy people.'

/** Ticket copy (approved by Andrew). Ticket 02 items come only from the known client menu. */
export const CHEF_TICKET_01 = { name: 'Marsaun Cook', role: 'Founder, Cook\u2019s Corner LLC', line: 'A Charlotte meal-prep business built on his passion for cooking.' }
export const CHEF_TICKET_03 = { head: ['Care.', 'Consistency.', 'Good food.'], why: 'It started with a love of food, and a goal to make the week easier for busy people.' }
/** Fact strip answers from Andrew (he said "going on 20 years"; shown as "Almost 20 years"). */
export const CHEF_FACTS = { years: 'Almost 20 years', signature: 'Honey Nut Salmon' }
export const CHEF_MENU_ITEMS = ['Ribeye', 'Chicken', 'Turkey', 'Shrimp', 'Salmon', 'Scallops', 'Grilled asparagus', 'Sweet potato'] as const

export const MENU = MENU_ITEMS

export const ORDER_NOTE = 'List allergies prior to ordering*'
export const TURNAROUND = 'Pickup or delivery happens 48 hours after your order is placed.'
export const ORDER_CUTOFF = 'Order cutoff: Sunday at 9:00 AM'
export const NO_SAME_DAY = 'No same-day orders or pickup.'
export const DELIVERY_FEE = '$15'
export const SUBSCRIPTION_DELIVERY = 'Delivery is $15 each time, billed separately.'

/** Policy text is verbatim from Andrew. Do not edit wording without his approval. */
export const POLICIES = {
  refunds: {
    id: 'order-changes-and-refunds',
    title: 'ORDER CHANGES AND REFUNDS',
    paragraphs: [
      'Order cutoff: Sunday at 9:00 AM. No same-day orders or pickup. Pickup or delivery happens 48 hours after your order is placed.',
      'Please request cancellations or changes at least 48 hours before meal preparation begins. Orders canceled by that deadline are eligible for a full refund.',
      "Once preparation has started, orders generally can't be canceled or refunded because ingredients and labor have already been committed.",
      "If an order is incorrect, missing an item, or has a quality issue, contact Cook's Corner within 24 hours of pickup or delivery and include a photo when possible. We'll review the issue and offer a replacement, store credit, or refund for the affected item.",
      "If Cook's Corner can't fulfill an order or delivery, the affected amount\u2014including any related delivery fee\u2014will be refunded.",
      'Refunds are returned to the original payment method. Processing time depends on the payment provider.',
    ],
  },
  allergy: {
    id: 'food-allergy-notice',
    title: 'FOOD ALLERGY NOTICE',
    paragraphs: [
      "Please tell us about any food allergies before placing your order. We'll review the ingredients used in your meals and can tell you which allergens are included.",
      "Our kitchen handles milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soy, and sesame. Because ingredients and equipment may be shared, cross-contact can occur, and we can't guarantee that any meal is completely free of an allergen.",
      "If you have a severe or life-threatening allergy, contact us before ordering. If we can't confidently prepare your order with the precautions you need, we may be unable to accept it. Please check the ingredient and allergen information on each order, since recipes and supplier ingredients can change.",
    ],
  },
  reheating: {
    id: 'reheating-and-storage',
    title: 'REHEATING & STORAGE',
    paragraphs: [
      "Keep refrigerated: Refrigerate your meals as soon as possible and keep them at 40\u00b0F or below. For best quality, enjoy refrigerated meals within 3\u20134 days. Freeze meals you won't eat within that time.",
      "Reheat safely: Remove the seal or lid and transfer the meal to a microwave-safe dish if the container isn't labeled microwave-safe. Cover loosely, heat until steaming hot throughout, and stir or rotate partway through. Check the center with a food thermometer: leftovers should reach 165\u00b0F. Heating time varies by microwave and portion size.",
      "Handle with care: Don't leave meals at room temperature for more than 2 hours (or 1 hour when it's above 90\u00b0F). Reheat only the portion you plan to eat.",
    ],
  },
} as const

/**
 * "What customers say". Quotes are verbatim from Andrew's Google review + text-message screenshots (only spacing before
 * punctuation fixed, apostrophes typeset as \u2019). The screenshots themselves are client assets and are NOT deployed.
 * Text-message quotes stay anonymous. Ashley B.'s Google review is truncated in the screenshot, so it is left out.
 * PREVIEW ONLY: the confirm tag stays until Marsaun OKs publishing customer quotes.
 */
export const REVIEW_SUMMARY = { score: '5.0', count: 19, line: '5.0 \u2605 \u00b7 19 Google reviews' }
export const REVIEWS = [
  {
    who: 'Jai T.',
    via: 'via Google',
    stars: true,
    text: 'Cook\u2019s has completely elevated my weekly routine with their meal prep options. If you\u2019re busy during the week but refuse to compromise on fresh, home-cooked flavor and quality nutrition, this is hands-down the best spot in town.',
  },
  {
    who: 'Nahjee A.',
    via: 'via Google',
    stars: true,
    text: 'Some of the best tasting meals by far. Whatever your style of prep you need they cater too. Thanks again!!!',
  },
  { who: 'Henry B.', via: 'via Google', stars: true, text: 'Fresh food, good portions and I love the options I have to choose from' },
  {
    who: 'Jajuan',
    via: 'via Google',
    stars: true,
    text: 'One of the best meal preps I\u2019ve had thus far! Well presented and the taste was on point!!!',
  },
  { who: 'A customer', via: 'via text message', stars: false, text: 'Hey, really good, ima order again for next week!' },
  { who: 'A customer', via: 'via text message', stars: false, text: 'They\u2019re great, thanks for asking. I plan to place another order this Friday.' },
] as const
