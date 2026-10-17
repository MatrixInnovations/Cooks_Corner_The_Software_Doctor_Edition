// node tools/shots-v17.mjs [baseUrl] -> shots/v17/{desktop,mobile}-cutoff.png (tray ticket with order cutoff)
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
for (const [n, vp, dsf] of [['desktop', { width: 1440, height: 1300 }, 1], ['mobile', { width: 390, height: 844 }, 2]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, reducedMotion: 'reduce' })
  const p = await ctx.newPage()
  await p.goto(`${base}/?s=0&nosteam`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.evaluate(() => document.getElementById('build').scrollIntoView({ behavior: 'instant' }))
  await p.waitForTimeout(600)
  await p.locator('.tb-chip').first().click({ force: true })
  if (n === 'mobile') { await p.waitForTimeout(300); await p.locator('.tb-bar .vt').click(); await p.waitForTimeout(500) }
  const t = n === 'desktop' ? p.locator('.tb-ticket:visible').first() : p.locator('dialog.tb-sheet .tb-ticket')
  if (n === 'desktop') await t.scrollIntoViewIfNeeded()
  await p.waitForTimeout(300)
  console.log(n, JSON.stringify(await p.locator('.tb-ob').allInnerTexts()), await p.locator('text=Need from Marsaun').count() > 0 ? '(other Need tags remain)' : '')
  await p.screenshot({ path: `shots/v17/${n}-cutoff.png` })
  await t.screenshot({ path: `shots/v17/${n}-ticket.png` })
  if (n === 'mobile') await p.evaluate(() => document.querySelector('dialog.tb-sheet')?.close())
  for (const id of ['subscriptions', 'delivery', 'policies']) {
    await p.evaluate((i) => document.getElementById(i).scrollIntoView({ behavior: 'instant' }), id)
    await p.waitForTimeout(400)
    await p.screenshot({ path: `shots/v17/${n}-${id}.png` })
  }
  await ctx.close()
}
await b.close()
