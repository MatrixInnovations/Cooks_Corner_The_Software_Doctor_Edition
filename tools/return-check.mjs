import { chromium } from '/workspace/cooks-corner/build/node_modules/playwright-core/index.mjs'
const U=process.argv[2], tag=process.argv[3]
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] })
for (const [name,vp,dsf] of [['desktop',{width:1440,height:900},1],['mobile',{width:390,height:844},2]]) {
 for (const kind of ['success','cancelled']) {
  const ctx = await b.newContext({viewport:vp,deviceScaleFactor:dsf}); const p = await ctx.newPage()
  const q = kind==='success' ? '?checkout=success&session_id=cs_test_x#build' : '?checkout=cancelled#build'
  await p.goto(U+'/'+q, { waitUntil: 'networkidle' }); await p.waitForTimeout(2000)
  console.log(name, kind, 'panel', await p.locator('.order-return').count(), '| url', p.url().replace(U,''), '| text:', (await p.locator('.or-t').innerText()))
  await p.screenshot({path:`shots/v15/${tag}-return-${kind}-${name}.png`})
  await p.mouse.wheel(0,1500); await p.waitForTimeout(500)
  console.log('  persists after scroll', await p.locator('.order-return').isVisible())
  await p.locator('.or-x').click(); console.log('  closed', await p.locator('.order-return').count()===0)
  await ctx.close()
 }
}
await b.close()
