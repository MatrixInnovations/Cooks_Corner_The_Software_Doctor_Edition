// Compare layout (page height + key element tops) between the live site and the local build at 390 and 1280.
import { chromium } from '/workspace/cooks-corner/build/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] })
for (const [w,h] of [[390,844],[1280,900]]) {
  const res = {}
  for (const [k,U] of [['live','https://cookscornerllc.com/'],['new','http://localhost:4173/']]) {
    const p = await (await b.newContext({ viewport:{width:w,height:h}, isMobile: w<500, hasTouch: w<500 })).newPage()
    await p.goto(U,{waitUntil:'networkidle'}); await p.waitForTimeout(1200)
    res[k] = await p.evaluate(() => {
      const top = s => { const e=document.querySelector(s); return e? Math.round(e.getBoundingClientRect().top+scrollY):null }
      const hh = s => { const e=document.querySelector(s); return e? Math.round(e.getBoundingClientRect().height):null }
      return { H: document.documentElement.scrollHeight, build: top('#build'), menu: top('#menu'), reviews: top('#reviews'), catering: top('#catering'), foot: top('.foot'), ticketH: hh('.ticket'), orderNote: top('.order-note'), credit: top('.foot .credit'), tbnote: top('.tb-note'), buildH: hh('#build'), sw: document.documentElement.scrollWidth }
    })
    await p.close()
  }
  console.log(w, 'live', JSON.stringify(res.live)); console.log(w, 'new ', JSON.stringify(res.new))
}
await b.close()
