// Manual e2e walkthrough with screenshots — drives the real game in a browser
// and dumps screens to "Debugging Images/". Not part of `npm test`.
//
// One-time:  npx playwright install chromium
// Run:       npm run dev   (in another shell)
//            npm run smoke
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const PW_EXE = process.env.PW_EXE || (() => {
  try { return chromium.executablePath() } catch { return undefined }
})()

const OUT = process.env.OUT || '/Users/jhoffman/Projects/Debugging Images'
mkdirSync(OUT, { recursive: true })
const URL = process.env.URL || 'http://localhost:5173/'
const TILE = 48
const MAP_W = 25 * TILE
const MAP_H = 18 * TILE

const browser = await chromium.launch({ executablePath: PW_EXE })
const page = await browser.newPage({ viewport: { width: 820, height: 1180 } })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` })
const txt = async () =>
  (await page.locator('#root').innerText().catch(() => '')).replace(/\s*\n\s*/g, ' | ').slice(0, 200)

async function walkToTile(tx, ty) {
  const r = await page.locator('svg[aria-hidden="true"]').first().evaluate((el) => {
    const b = el.getBoundingClientRect()
    return { left: b.left, top: b.top, w: b.width, h: b.height }
  })
  await page.mouse.click(
    r.left + ((tx * TILE + TILE / 2) / MAP_W) * r.w,
    r.top + ((ty * TILE + TILE / 2) / MAP_H) * r.h,
  )
}
async function back() {
  const b = page.getByRole('button', { name: /← farmyard|back to the farm/i }).first()
  if (await b.count()) { await b.click(); await page.waitForTimeout(800) }
}

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
console.log('boot        :', await txt())
await shot('t0-boot')

await walkToTile(18, 4) // nest
await page.waitForTimeout(3500)
console.log('-> nest     :', await txt())
await shot('t1-nest')
await back()
await page.waitForTimeout(400)
console.log('back (@nest):', await txt())
await shot('t2-back-at-nest')

await walkToTile(18, 13) // paddock
await page.waitForTimeout(4000)
console.log('-> paddock  :', await txt())
await shot('t3-paddock')
await back()

await walkToTile(4, 8) // barn
await page.waitForTimeout(5000)
console.log('-> barn     :', await txt())
await shot('t4-barn')

// feed the gift creature
const tenner = page.getByRole('button', { name: 'Tenner' })
if (await tenner.count()) {
  await tenner.click(); await page.waitForTimeout(600)
  await page.getByRole('button', { name: /^feed$/i }).click(); await page.waitForTimeout(700)
  for (let q = 0; q < 6; q++) {
    await page.waitForTimeout(500)
    const p = await page.getByTestId('prompt').innerText().catch(() => '')
    const m = p.match(/(\d+)\s*[×x*]\s*(\d+)/)
    if (!m) break
    for (const d of String(Number(m[1]) * Number(m[2]))) await page.getByRole('button', { name: d, exact: true }).click()
    await page.getByRole('button', { name: /confirm/i }).click()
    await page.waitForTimeout(1100)
  }
  await page.waitForTimeout(700)
  console.log('-> fed      :', await txt())
  await shot('t5-goodnight')
  await back()
  await page.waitForTimeout(500)
  console.log('back (@barn):', await txt())
  await shot('t6-back-at-barn')
}

console.log('\n--- console ---')
console.log(logs.filter((l) => !/DevTools|\[vite\]/.test(l)).join('\n') || '(clean)')
await browser.close()
