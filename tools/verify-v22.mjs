// Preview verify v22 (hide review tags etc). No orders, no checkout click.
import { chromium } from '/workspace/cooks-corner/build/node_modules/playwright-core/index.mjs'
const U = process.env.URL || 'https://testflag--cooks-corner-preview-6caf24.netlify.app'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
await p.goto(U, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
const txt = await p.evaluate(()=>document.body.innerText)
for (const s of ['NEED FROM','CONFIRM WITH','PROPOSED WORDING','MARSAUN TO CONFIRM','TO CONFIRM','TODO','How customers give','subscription menu includes','travel distance']) console.log('text has', s, new RegExp(s,'i').test(txt))
console.log('roll over text:', (txt.match(/Orders placed after Sunday[^\n]*/g)||[]).slice(0,3))
console.log('need elems:', await p.locator('.need,.need-list').count())
// builder
const bar = () => p.evaluate(()=>{const e=document.querySelector('.tb-bar');const r=e.getBoundingClientRect();return {show:e.classList.contains('show'),vis:getComputedStyle(e).visibility,top:Math.round(r.top)}})
console.log('bar at top', JSON.stringify(await bar()))
await p.evaluate(()=>document.getElementById('build').scrollIntoView({behavior:'instant'})); await p.waitForTimeout(600)
console.log('bar in builder', JSON.stringify(await bar()))
await p.screenshot({ path: 'shots/v22/m-build-bar.png' })
await p.evaluate(()=>{const e=document.getElementById('build');window.scrollTo(0,e.getBoundingClientRect().bottom+scrollY+400)}); await p.waitForTimeout(600)
console.log('bar after builder', JSON.stringify(await bar()))
await p.screenshot({ path: 'shots/v22/m-after-builder.png' })
// sheet
await p.evaluate(()=>document.getElementById('build').scrollIntoView({behavior:'instant'})); await p.waitForTimeout(500)
await p.locator('label.tb-chip:visible:has-text("Grilled Ribeye")').first().click()
await p.locator('.tb-bar .vt').click(); await p.waitForTimeout(500)
console.log('sheet imgs', await p.locator('.tb-sheet img').count(), 'bar imgs', await p.locator('.tb-bar img').count())
await p.screenshot({ path: 'shots/v22/m-sheet-top.png' })
await p.evaluate(()=>{const s=document.querySelector('.tb-sheet');s.scrollTop=s.scrollHeight}); await p.waitForTimeout(300)
await p.screenshot({ path: 'shots/v22/m-sheet-bottom.png' })
const link = p.locator('.tb-sheet .tb-accept a')
await link.scrollIntoViewIfNeeded(); await link.tap(); await p.waitForTimeout(1500)
console.log('after policy tap: sheet open=', await p.evaluate(()=>document.querySelector('.tb-sheet').open), 'hash=', await p.evaluate(()=>location.hash), 'policies top=', await p.evaluate(()=>Math.round(document.getElementById('policies').getBoundingClientRect().top)))
await p.screenshot({ path: 'shots/v22/m-policy-after-tap.png' })
// header over cream ticket
const y = await p.evaluate(()=>{const t=document.querySelector('.ticket');return t? Math.round(t.getBoundingClientRect().top+scrollY):null})
console.log('ticket y', y)
if (y!=null) for (const off of [-40, 40, 120]) { await p.evaluate(v=>window.scrollTo(0,v), y+off); await p.waitForTimeout(500); console.log('header theme @',off, await p.evaluate(()=>document.querySelector('.site-header').dataset.theme)); await p.screenshot({path:`shots/v22/m-header-ticket-${off<0?'m':'p'}${Math.abs(off)}.png`}) }
// copy sections
await p.evaluate(()=>document.getElementById('policies').scrollIntoView({behavior:'instant'}))
// tap sizes
console.log('tap sizes', JSON.stringify(await p.evaluate(()=>{const f=s=>[...document.querySelectorAll(s)].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]});return {rv:f('.rv-dots button').slice(0,2),hero:f('.dots button').slice(0,2),phone:f('.foot-contact a').slice(0,3)}})))
await p.evaluate(()=>document.querySelector('.rv-dots').scrollIntoView({block:'center',behavior:'instant'})); await p.waitForTimeout(400); await p.screenshot({path:'shots/v22/m-reviews.png'})
await p.evaluate(()=>document.getElementById('contact').scrollIntoView({behavior:'instant'})); await p.waitForTimeout(400); await p.screenshot({path:'shots/v22/m-footer.png'})
await p.evaluate(()=>document.getElementById('delivery').scrollIntoView({behavior:'instant'})); await p.waitForTimeout(400); await p.screenshot({path:'shots/v22/m-delivery-copy.png'})
console.log('hscroll', await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth), 'errors', errs)
await b.close()
