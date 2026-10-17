import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs tool
import { launchHeaders, launchHtml, launchRobots, run } from '../tools/launch-switch.mjs'
import { checkoutConfig } from '../netlify/lib/config'
import { ENV } from './helpers'

const HTML = readFileSync(join(__dirname, '../index.html'), 'utf8')
const HEADERS = readFileSync(join(__dirname, '../public/_headers'), 'utf8')

function fakeDist() {
  const d = mkdtempSync(join(tmpdir(), 'launch-'))
  writeFileSync(join(d, 'index.html'), HTML)
  writeFileSync(join(d, '_headers'), HEADERS)
  writeFileSync(join(d, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
  return d
}

describe('launch switch (build)', () => {
  it('is a no-op unless SITE_LAUNCH is exactly "true"', () => {
    for (const v of [undefined, '', 'false', '1', 'TRUE']) {
      const d = fakeDist()
      expect(run(d, { SITE_LAUNCH: v })).toBe(false)
      expect(readFileSync(join(d, 'index.html'), 'utf8')).toBe(HTML)
      expect(readFileSync(join(d, '_headers'), 'utf8')).toBe(HEADERS)
      expect(readFileSync(join(d, 'robots.txt'), 'utf8')).toContain('Disallow: /')
      expect(existsSync(join(d, 'sitemap.xml'))).toBe(false)
    }
  })
  it('removes every noindex signal when on, keeps the canonical and the other headers', () => {
    const d = fakeDist()
    expect(run(d, { SITE_LAUNCH: 'true' })).toBe(true)
    const html = readFileSync(join(d, 'index.html'), 'utf8')
    expect(html).not.toMatch(/noindex|googlebot|PREVIEW ONLY/i)
    expect(html).toContain('<link rel="canonical" href="https://cookscornerllc.com/" />')
    expect(html).toContain('og:url')
    const h = readFileSync(join(d, '_headers'), 'utf8')
    expect(h).not.toMatch(/x-robots-tag|noindex/i)
    expect(h).toContain('Referrer-Policy')
    const robots = readFileSync(join(d, 'robots.txt'), 'utf8')
    expect(robots).toContain('Allow: /')
    expect(robots).not.toContain('Disallow')
    expect(robots).toContain('Sitemap: https://cookscornerllc.com/sitemap.xml')
    expect(readFileSync(join(d, 'sitemap.xml'), 'utf8')).toContain('<loc>https://cookscornerllc.com/</loc>')
  })
  it('pure helpers', () => {
    expect(launchHtml(HTML)).not.toMatch(/noindex/)
    expect(launchHeaders(HEADERS)).not.toMatch(/noindex/)
    expect(launchRobots()).toContain('Allow: /')
  })
})

describe('launch switch (server SITE_URL)', () => {
  it('uses SITE_URL when off and pins the real domain when SITE_LAUNCH=true', () => {
    const off = checkoutConfig({ ...ENV, SITE_URL: 'https://preview.example.netlify.app' })
    expect(off.ok && off.siteUrl).toBe('https://preview.example.netlify.app')
    const on = checkoutConfig({ ...ENV, SITE_URL: 'https://preview.example.netlify.app', SITE_LAUNCH: 'true' })
    expect(on.ok && on.siteUrl).toBe('https://cookscornerllc.com')
    const unset = checkoutConfig({ ...ENV, SITE_URL: undefined, SITE_LAUNCH: 'true' })
    expect(unset.ok && unset.siteUrl).toBe('https://cookscornerllc.com')
  })
})
