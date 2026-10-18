import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'

const html = readFileSync('index.html', 'utf8')
const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'))

describe('link preview and head metadata', () => {
  it('has no street address in the head (the business address will change)', () => {
    expect(head).not.toMatch(/statesville|\bRd\.?\b|\bSuite\b|\bStreet\b|streetAddress/i)
    expect(head).not.toMatch(/\d{3,5}\s+[A-Z][a-z]+/) // no "8432 Old ..." style street numbers
  })
  it('sets og/twitter title, description and image, with no prices', () => {
    for (const k of ['og:title', 'og:description', 'og:image', 'og:image:alt']) expect(head).toContain(`property="${k}"`)
    for (const k of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) expect(head).toContain(`name="${k}"`)
    expect(head).not.toMatch(/\$\d/)
  })
  it('og image file exists', () => {
    expect(existsSync('public/brand/og-image.jpg')).toBe(true)
  })
})
