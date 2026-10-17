/** Copy + facts. Source: copy/homepage-captions.md and the client's own flyers. No claims beyond these. */
export const BIZ = {
  name: "Cook's Corner",
  sub: 'Meal Prep',
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
