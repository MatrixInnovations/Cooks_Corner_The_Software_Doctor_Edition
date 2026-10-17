// node tools/shots.mjs [baseUrl]  -> shots/*.png (desktop 1440x900 + mobile 390x844), uses ?s=<step position> to pin the story
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
const run = async (name, vp, qs, extra = async () => {}, opts = {}) => {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: opts.dsf || 1, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' })
  const p = await ctx.newPage()
  await p.goto(`${base}/${qs}`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(opts.wait ?? 1200)
  await extra(p)
  await p.screenshot({ path: `${process.env.SHOTS_DIR || 'shots'}/${name}.png`, fullPage: !!opts.full })
  await ctx.close()
}
const D = { width: 1440, height: 900 }, M = { width: 390, height: 844 }
const only = process.argv[3]
const jobs = {
  'desktop-hero': () => run('desktop-hero', D, '?s=0&nosteam'),
  'desktop-hero-steam': () => run('desktop-hero-steam', D, '?s=0'),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [`desktop-step${n}`, () => run(`desktop-step${n}`, D, `?s=${n === 7 ? 6.95 : n - 0.45}`)])),
  'mobile-hero': () => run('mobile-hero', M, '?s=0', async () => {}, { dsf: 2 }),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [`mobile-step${n}`, () => run(`mobile-step${n}`, M, `?s=${n === 7 ? 6.95 : n - 0.45}`, async () => {}, { dsf: 2 })])),
  'desktop-packages': () => run('desktop-packages', D, '', async (p) => { await p.evaluate(() => document.getElementById('packages').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(500) }),
  'mobile-packages': () => run('mobile-packages', M, '', async (p) => { await p.evaluate(() => document.getElementById('packages').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(500) }, { dsf: 2 }),
  'desktop-full': () => run('desktop-full', D, '?s=0', async () => {}, { full: true }),
  'mobile-full': () => run('mobile-full', M, '?s=0', async () => {}, { full: true }),
}
for (const [k, f] of Object.entries(jobs)) if (!only || k.includes(only)) { await f(); console.log('shot', k) }
await b.close()
