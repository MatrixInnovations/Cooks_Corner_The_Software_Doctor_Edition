// Tap-target audit at 390px: measures bounding boxes of the elements Sundae flagged. node tools/tap-v22.mjs [url]
import { chromium } from '/workspace/cooks-corner/build/node_modules/playwright-core/index.mjs'
const U = process.argv[2] || 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()))
await p.goto(U, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
const rows = []
async function measure(label, sel, { all = true } = {}) {
  const loc = p.locator(sel)
  const n = await loc.count()
  for (let i = 0; i < n; i++) {
    const bb = await loc.nth(i).boundingBox()
    if (!bb) continue
    rows.push({ label, i, w: Math.round(bb.width * 10) / 10, h: Math.round(bb.height * 10) / 10, ok: bb.width >= 44 && bb.height >= 44 })
  }
}
const sw = () => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }))
const scrollTo = (sel) => p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ behavior: 'instant', block: 'center' }), sel)
// hero dots
await measure('hero dots', '.dots button')
const hs = await sw()
// builder
await scrollTo('#build'); await p.waitForTimeout(400)
await measure('allergy label (h2)', '.tb-allergy:visible label.h2')
await measure('Food allergy notice', '.tb-note a:visible')
await measure('order-note link (builder fine)', '.tb .fine a:visible')
await scrollTo('.order-note'); await p.waitForTimeout(300)
await measure('order-note link', '.order-note a')
// ticket cta link in hero
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300)
await measure('hero ticket t-note', '.ticket .t-note')
// reviews
await scrollTo('#reviews'); await p.waitForTimeout(400)
await measure('review dots', '.rv-dots button')
await measure('review arrows', '.rv-arrow')
// catering / need-row
await scrollTo('#catering'); await p.waitForTimeout(400)
await measure('need-row links', '.need-row.center a')
// footer
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(400)
await measure('footer links', '.foot a')
await measure('footer credit', '.foot .credit a')
// ticket sheet
await scrollTo('#build'); await p.waitForTimeout(300)
await p.evaluate(() => window.dispatchEvent(new CustomEvent('tray:select', { detail: { meals: 8 } }))); await p.waitForTimeout(300)
const vt = p.locator('.tb-bar .vt'); 
await p.evaluate(() => document.querySelector('.tb-bar .vt')?.click()); await p.waitForTimeout(500)
await measure('sheet fine allergy link', '.tb-sheet .fine a')
await measure('sheet allergy notice link', '.tb-sheet .tb-note a')
await measure('sheet accept link', '.tb-sheet .tb-accept a')
await p.screenshot({ path: 'shots/v22/sheet.png' })
const f = await sw()
await p.evaluate(() => document.querySelector('.tb-sheet')?.close()); await p.waitForTimeout(300)
// sticky bar vs Menu start: walk the scroll range around the end of the builder
const bar = await p.evaluate(async () => {
  const build = document.getElementById('build'), menu = document.getElementById('menu'), vh = innerHeight
  const bottomY = build.getBoundingClientRect().bottom + scrollY   // page y of builder end == menu start
  const out = []
  for (let y = Math.round(bottomY - vh - 200); y <= bottomY + 100; y += 40) {
    scrollTo(0, y); await new Promise(r => setTimeout(r, 120))
    const bar = document.querySelector('.tb-bar'); const cs = getComputedStyle(bar)
    const visible = bar.classList.contains('show')
    const menuTop = menu.getBoundingClientRect().top
    out.push({ y, menuTopInViewport: Math.round(menuTop), barShown: visible, overlapsMenu: visible && menuTop < vh })
  }
  return { bottomY: Math.round(bottomY), out }
})
console.log('sticky bar walk, builder end/menu start at page y', bar.bottomY)
console.log(bar.out.map(o => `y=${o.y} menuTop=${o.menuTopInViewport} bar=${o.barShown ? 'shown' : 'hidden'}${o.overlapsMenu ? '  <-- OVERLAPS MENU' : ''}`).join('\n'))
console.log('any overlap:', bar.out.some(o => o.overlapsMenu), '| bar shown while builder fills screen:', bar.out.some(o => o.barShown))
await p.evaluate((y) => scrollTo(0, y), bar.bottomY - 844 + 10); await p.waitForTimeout(500)
await p.screenshot({ path: 'shots/v22/menu-start-bar-hidden.png' })
await p.evaluate((y) => scrollTo(0, y), bar.bottomY - 844 - 150); await p.waitForTimeout(500)
await p.screenshot({ path: 'shots/v22/builder-end-bar-shown.png' })
for (const r of rows) console.log((r.ok ? 'OK  ' : 'SMALL'), r.label.padEnd(34), r.i, r.w + ' x ' + r.h)
console.log('hscroll hero/after:', JSON.stringify(hs), JSON.stringify(f), 'errors:', JSON.stringify(errs))
await b.close()
