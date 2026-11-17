// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { countFrame } from '../src/motion/count'
import CountUp from '../src/motion/CountUp'
import HeroTitle from '../src/motion/HeroTitle'
import { bootMotion } from '../src/motion/boot'
import { INTRO_MS, INTRO_POINTER_EVENTS, allowsPageMotion, introBlocksClicks, readAllowsMotion } from '../src/motion/policy'

const CSS = readFileSync(join(__dirname, '../src/motion.css'), 'utf8')
const SECTIONS = readFileSync(join(__dirname, '../src/components/Sections.tsx'), 'utf8')

function mq(matches: boolean): MediaQueryList {
  return {
    matches,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false },
  } as MediaQueryList
}

function setMotion(reduced: boolean) {
  window.matchMedia = (query: string) => mq(query.includes('prefers-reduced-motion') ? reduced : false)
}

const FIXTURE = `
  <header class="site-header"><a class="btn p" href="#build">Order now</a></header>
  <section class="story"><div class="story-scrub"><i></i></div>
    <h1>We cook when you can't.</h1>
    <p class="sub">Curated meal prep, freshly prepared and ready for pickup at 3500 Latrobe Dr, Charlotte, NC.</p>
  </section>
  <section class="sec">
    <h2 class="reveal">Pick how many meals your week needs.</h2>
    <div class="price">$116</div>
    <button type="button" class="btn p tb-checkout">Checkout</button>
  </section>
`

let stop: (() => void) | undefined

afterEach(() => {
  stop?.()
  stop = undefined
  document.documentElement.className = ''
  delete document.documentElement.dataset.motionBoot
  document.body.innerHTML = ''
})

describe('motion policy', () => {
  it('allows motion only when the visitor did not ask to reduce it', () => {
    expect(allowsPageMotion(false)).toBe(true)
    expect(allowsPageMotion(true)).toBe(false)
    expect(readAllowsMotion(undefined)).toBe(false)
    expect(readAllowsMotion({ matchMedia: () => { throw new Error('nope') } })).toBe(false)
    expect(INTRO_MS).toBeLessThan(1200)
    expect(INTRO_POINTER_EVENTS).toBe('none')
    expect(introBlocksClicks('none')).toBe(false)
    expect(introBlocksClicks('auto')).toBe(true)
  })

  it('count-up ends on the exact original string and never adds digits', () => {
    for (const s of ['$116', '$768', '8 meals', '16 meals', '5.0 ★ · 19 Google reviews', 'Almost 20 years', '3500 Latrobe Dr']) {
      expect(countFrame(s, 1)).toBe(s)
      expect(countFrame(s, 2)).toBe(s)
      expect(countFrame(s, 0).replace(/\d/g, '')).toBe(s.replace(/\d/g, ''))
    }
    expect(countFrame('$116', 0)).toBe('$0')
    expect(countFrame('No digits', 0)).toBe('No digits')
  })

  it('keeps the footer credit exactly', () => {
    expect(SECTIONS).toContain(
      'Designed and Developed by Andrew Lowery, <a href="https://thesoftwaredoctor.com" target="_blank" rel="noopener">The Software Doctor',
    )
  })
})

describe('reduced motion shows all content', () => {
  it('does not arm motion, split the hero, or hide sections', () => {
    setMotion(true)
    const plain = renderToStaticMarkup(createElement(HeroTitle))
    const price = renderToStaticMarkup(createElement(CountUp, { text: '$116' }))
    expect(plain).not.toContain('hero-ch')
    expect(plain.replace(/&#x27;|&apos;|&#39;/g, "'")).toContain("you can't.")
    expect(plain).toContain('<em>')
    expect(price).toBe('$116')

    document.body.innerHTML = FIXTURE
    stop = bootMotion(document, window)
    expect(document.documentElement.classList.contains('motion')).toBe(false)
    expect(document.documentElement.classList.contains('motion-io')).toBe(false)
    expect(document.documentElement.classList.contains('motion-off')).toBe(true)
    expect(document.querySelector('.brand-intro')).toBeNull()
    expect(document.querySelector('.scroll-progress')).toBeNull()
    expect(document.querySelector('h1')!.textContent).toContain("you can't.")
    expect(document.body.textContent).toContain('3500 Latrobe Dr, Charlotte, NC')
    expect(document.body.textContent).toContain('$116')
    const reveal = document.querySelector('.reveal') as HTMLElement
    expect(reveal.style.opacity).not.toBe('0')
    expect(reveal.style.visibility).not.toBe('hidden')
  })

  it('css puts every animated piece back to a visible final state', () => {
    const reduceAt = CSS.lastIndexOf('@media (prefers-reduced-motion:reduce)')
    expect(reduceAt).toBeGreaterThan(0)
    const before = CSS.slice(0, reduceAt)
    const reduce = CSS.slice(reduceAt)
    expect(before).toContain('html.motion-io .reveal:not(.in){opacity:0')
    expect(before).toContain('@media (prefers-reduced-motion:no-preference)')
    expect(reduce).toContain('opacity:1!important')
    expect(reduce).toContain('animation:none!important')
    expect(reduce).toContain('transform:none!important')
    expect(reduce).toContain('.reveal')
    expect(reduce).toContain('.hero-ch')
    expect(reduce).toContain('.brand-intro')
    expect(reduce).toContain('display:none!important')
    expect(reduce).toContain('.count-hold{color:inherit!important}')
    expect(CSS).toMatch(/\.brand-intro\{[^}]*pointer-events:none/)
    expect(CSS).not.toMatch(/\.brand-intro\{[^}]*inset:\s*0/)
    expect(CSS).toMatch(/\.tb \.reveal:not\(\.in\)\{opacity:1/)
  })
})

describe('checkout CTA is clickable immediately', () => {
  it('fires on the first click while the intro is up and does not cover the button', () => {
    setMotion(false)
    const hero = renderToStaticMarkup(createElement(HeroTitle))
    setMotion(true)
    const reducedHero = renderToStaticMarkup(createElement(HeroTitle))
    const words = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&#x27;|&apos;|&#39;/g, "'").replace(/\s+/g, ' ').trim()
    expect(hero).toContain('hero-ch')
    expect(words(hero)).toBe(words(reducedHero))
    expect(words(reducedHero)).toContain('We cook')
    expect(words(reducedHero)).toContain('when')
    expect(words(reducedHero)).toContain("you can't.")

    setMotion(false)
    const counted = renderToStaticMarkup(createElement(CountUp, { text: '$190' }))
    expect(counted).toContain('$190')
    expect(counted).not.toContain('$0')

    document.body.innerHTML = FIXTURE
    let clicks = 0
    const checkout = document.querySelector('.tb-checkout') as HTMLButtonElement
    checkout.addEventListener('click', () => { clicks += 1 })
    stop = bootMotion(document, window)

    const intro = document.querySelector('.brand-intro') as HTMLElement
    const veil = document.querySelector('.brand-intro-veil') as HTMLElement
    expect(intro).toBeTruthy()
    expect(intro.style.pointerEvents).toBe('none')
    expect(veil.style.pointerEvents).toBe('none')
    expect(introBlocksClicks(intro.style.pointerEvents)).toBe(false)
    expect(document.querySelector('.scroll-progress')!.getAttribute('style')).toContain('pointer-events: none')
    expect(checkout.disabled).toBe(false)
    expect(checkout.style.pointerEvents).not.toBe('none')
    expect(intro.contains(checkout)).toBe(false)

    checkout.click()
    expect(clicks).toBe(1)
  })
})
