// node tools/shots-v15.mjs <prefix> [baseUrl] -> shots/v15/<prefix>-{desktop,mobile}-{unticked,ticked}.png
import { chromium } from 'playwright-core'
const prefix = process.argv[2] || 'after'
const base = process.argv[3] || 'http://localhost:4173'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
const out = (n) => `shots/v15/${prefix}-${n}.png`
async function setup(vp, dsf) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, reducedMotion: 'reduce' })
  const p = await ctx.newPage()
  await p.goto(`${base}/?s=0&nosteam`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.evaluate(() => document.getElementById('build').scrollIntoView({ behavior: 'instant' }))
  await p.waitForTimeout(600)
  return { ctx, p }
}
// desktop
{
  const { ctx, p } = await setup({ width: 1440, height: 1300 }, 1)
  const t = p.locator('.tb-right .tb-ticket')
  await t.scrollIntoViewIfNeeded()
  await p.waitForTimeout(300)
  await p.screenshot({ path: out('desktop-empty-unticked') })
  await p.locator('.tb-chip').first().click({ force: true })
  await p.waitForTimeout(300)
  await p.screenshot({ path: out('desktop-unticked') })
  await p.locator('.tb-right .tb-accept input').click()
  await p.waitForTimeout(200)
  await p.screenshot({ path: out('desktop-ticked') })
  await p.locator('.tb-right .tb-accept input').focus()
  await p.locator('.tb-right .tb-accept input').evaluate((e) => e.blur())
  await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab')
  await p.waitForTimeout(100)
  await p.screenshot({ path: out('desktop-focus') })
  await p.screenshot({ path: out('desktop-page') })
  await ctx.close()
}
// mobile
{
  const { ctx, p } = await setup({ width: 390, height: 844 }, 2)
  await p.locator('.tb-chip').first().click({ force: true })
  await p.waitForTimeout(300)
  await p.locator('.tb-bar .vt').click()
  await p.waitForTimeout(500)
  const sheet = p.locator('dialog.tb-sheet')
  const scroll = async () => p.evaluate(() => { const d = document.querySelector('dialog.tb-sheet'); d.scrollTop = d.scrollHeight })
  await scroll(); await p.waitForTimeout(300)
  await p.screenshot({ path: out('mobile-unticked') })
  await sheet.locator('.tb-accept input').click()
  await p.waitForTimeout(200)
  await scroll(); await p.waitForTimeout(200)
  await p.screenshot({ path: out('mobile-ticked') })
  const bb = await sheet.locator('.tb-accept input').boundingBox()
  const lb = await sheet.locator('.tb-accept').boundingBox()
  console.log('mobile input box', bb, 'label box', lb)
  await ctx.close()
}
await b.close()
