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
  instagram: '@_cooks_corner_',
}

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

export const PACKAGES = [
  { meals: 8, price: 116, proteins: 'Up to 3 proteins' },
  { meals: 10, price: 150, proteins: 'Up to 3 proteins' },
  { meals: 12, price: 155, proteins: 'Up to 4 proteins' },
  { meals: 16, price: 190, proteins: null }, // 16-meal protein max: NEED FROM MARSAUN
] as const

/** Subscriptions are weekly (confirmed by Andrew): price is per week. 16-meal plan: NEED FROM MARSAUN. */
export const SUBSCRIPTIONS = [
  { meals: 8, price: 400 },
  { meals: 10, price: 500 },
  { meals: 12, price: 575 },
  { meals: 16, price: null },
] as const

/** Optional jingle. Set `src` to an audio file in /public/audio once Marsaun has one. No autoplay, ever. */
export const JINGLE = {
  src: null as string | null,
  label: "Cook's Corner jingle",
}

/**
 * Story for "Meet the chef". Text is verbatim from Andrew (apostrophes typeset as \u2019).
 * PREVIEW ONLY: the "confirm with Marsaun" tag stays until he OKs publishing his background.
 */
export const CHEF_STOPS = [
  {
    n: '01',
    label: 'The founder',
    ticket: 'Founder, Cook\u2019s Corner LLC',
    text: 'I\u2019m Marsaun Cook, founder of Cook\u2019s Corner LLC.',
    marks: [] as string[],
  },
  {
    n: '02',
    label: 'The foundation',
    ticket: 'Johnson & Wales University: Culinary Arts and Food Service Management',
    text: 'My path to meal prep grew from my love of food and the culinary foundation I built at Johnson & Wales University, where I earned degrees in Culinary Arts and Food Service Management.',
    marks: ['Johnson & Wales University', 'Culinary Arts and Food Service Management'],
  },
  {
    n: '03',
    label: 'The service',
    ticket: 'Years serving the community in law enforcement, then the kitchen',
    text: 'After years of serving my community in law enforcement, I brought that same commitment and work ethic into the kitchen, creating flavorful, thoughtfully prepared meals that make the week easier for busy people.',
    marks: ['law enforcement', 'kitchen'],
  },
  {
    n: '04',
    label: 'The kitchen today',
    ticket: 'Charlotte meal prep: care, consistency, good food',
    text: 'What began with my passion for cooking has grown into a Charlotte meal-prep business built on care, consistency, and good food.',
    marks: ['Charlotte meal-prep'],
  },
] as const

export const MENU = {
  Protein: ['Grilled Ribeye', 'Grilled Chicken Breast', 'Grilled Chicken Thigh', 'Ground Turkey', 'Turkey Meatballs'],
  Seafood: ['Grilled Salmon', 'Grilled Shrimp', 'Grilled Scallops', 'Grilled Cod'],
  Vegetables: ['Grilled Asparagus', 'Grilled Zucchini/Squash', 'Steamed Broccoli', 'Steamed Green Beans', 'Grilled Peppers', 'Roasted Carrots'],
  Starch: ['Sweet Potato', 'Roasted Corn', 'Black Beans', 'Garlic Parmesan Mash', 'Rice Pilaf', 'Brown Rice/Quinoa'],
} as const

export const ORDER_NOTE = 'List allergies prior to ordering*'
export const TURNAROUND = 'Pickup or delivery happens 48 hours after your order is placed.'
export const DELIVERY_FEE = '$15'

/** Policy text is verbatim from Andrew. Do not edit wording without his approval. */
export const POLICIES = {
  refunds: {
    id: 'order-changes-and-refunds',
    title: 'ORDER CHANGES AND REFUNDS',
    paragraphs: [
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
