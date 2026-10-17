import { chromium } from '/workspace/cooks-corner/build/node_modules/playwright-core/index.mjs'
const U='https://cooks-corner-preview-6caf24.netlify.app'
const ful = process.argv[2]||'pickup'
const meals = +(process.argv[3]||10)
const pay = process.argv[4]==='pay'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] })
const ctx = await b.newContext({viewport:{width:1280,height:1000}}); const p = await ctx.newPage()
p.on('response', async r=>{ if(r.url().includes('/api/create-checkout')) console.log('API', r.status(), '(status only)') })
await p.goto(U+'/#build',{waitUntil:'networkidle'}); await p.waitForTimeout(1500)
await p.evaluate((m)=>window.dispatchEvent(new CustomEvent('tray:select',{detail:{meals:m}})), meals)
await p.locator(`input[type=radio][value=${ful}]:visible`).first().check({force:true})
await p.locator('label.tb-chip:visible:has-text("Grilled Chicken Breast")').first().click()
await p.locator('label.tb-chip:visible:has-text("Grilled Asparagus")').first().click()
await p.locator('label.tb-chip:visible:has-text("Rice Pilaf")').first().click()
await p.locator('.tb-accept:visible input').first().check({force:true})
await p.screenshot({path:`shots/v16/${ful}-${meals}-1-tray.png`})
console.log('btn disabled', await p.locator('.tb-checkout:visible').first().isDisabled())
await p.locator('.tb-checkout:visible').first().click()
await p.waitForURL(/checkout\.stripe\.com/,{timeout:30000}).catch(()=>console.log('no stripe redirect', p.url()))
console.log(p.url().replace(/#.*/,'').slice(0,70))
await p.waitForTimeout(6000)
await p.screenshot({path:`shots/v16/${ful}-${meals}-2-stripe.png`, fullPage:true})
console.log((await p.locator('body').innerText()).replace(/[A-Za-z .,’innerText()).slice(0,1200)\-ç ô Å]+ \(\+\d+\)\n?/g,"").slice(0,1200))
if (pay) {
  const fill = async (sel,v)=>{ const l=p.locator(sel).first(); if(await l.count()) await l.fill(v) }
  await fill('#email','test@example.com')
  await fill('#cardNumber','4242424242424242'); await fill('#cardExpiry','12 / 34'); await fill('#cardCvc','123')
  await fill('#billingName','Test Person'); await fill('#phoneNumber','5551234567')
  await fill('#billingPostalCode','28202')
  await p.screenshot({path:`shots/v16/${ful}-${meals}-3-filled.png`, fullPage:true})
  await p.locator('.SubmitButton, button[type=submit]').first().click()
  await p.waitForTimeout(8000)
  console.log('after pay url', p.url().replace(/#.*/,'').slice(0,80))
  await p.screenshot({path:`shots/v16/${ful}-${meals}-4-afterpay.png`, fullPage:true})
  console.log((await p.locator('body').innerText()).slice(0,1500))
}
await b.close()
