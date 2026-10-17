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

export const SUBSCRIPTIONS = [
  { meals: 8, price: 400 },
  { meals: 10, price: 500 },
  { meals: 12, price: 575 },
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
