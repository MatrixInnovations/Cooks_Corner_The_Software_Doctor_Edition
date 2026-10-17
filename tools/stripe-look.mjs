import { chromium } from '/workspace/cooks-corner/build/node_modules/playwright-core/index.mjs'
const U='https://cooks-corner-preview-6caf24.netlify.app'
const [ful='pickup', meals='10'] = process.argv.slice(2)
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] })
const p = await (await b.newContext({viewport:{width:1280,height:1100}})).newPage()
await p.goto(U+'/#build',{waitUntil:'networkidle'}); await p.waitForTimeout(1500)
await p.evaluate((m)=>window.dispatchEvent(new CustomEvent('tray:select',{detail:{meals:m}})), +meals)
await p.locator(`input[type=radio][value=${ful}]:visible`).first().check({force:true})
await p.locator('label.tb-chip:visible:has-text("Grilled Chicken Breast")').first().click()
await p.locator('.tb-accept:visible input').first().check({force:true})
await p.locator('.tb-checkout:visible').first().click()
await p.waitForURL(/checkout\.stripe\.com/,{timeout:30000})
await p.waitForTimeout(6000)
await p.screenshot({path:`shots/v16/look-${ful}-${meals}.png`, fullPage:true})
if (process.argv[4]==='emptypay'){
 await p.locator('.SubmitButton').first().click(); await p.waitForTimeout(2500)
 await p.screenshot({path:`shots/v16/look-${ful}-${meals}-emptypay.png`, fullPage:true})
 await p.locator('#email').fill('test@example.com'); await p.locator('.SubmitButton').first().click(); await p.waitForTimeout(2500)
 await p.screenshot({path:`shots/v16/look-${ful}-${meals}-emailonly.png`, fullPage:true})
}
await b.close()
