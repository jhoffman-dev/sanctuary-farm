// Manual e2e walkthrough with screenshots — drives the real game in a browser
// and dumps screens to "Debugging Images/". Not part of `npm test`.
//
// One-time:  npx playwright install chromium
// Run:       npm run dev   (in another shell)  ;  npm run smoke
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
  (await page.locator('#root').innerText().catch(() => '')).replace(/\s*\n\s*/g, ' | ').slice(0, 240)

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
  const b = page.getByRole('button', { name: /← farmyard|← barn|back to the farm/i }).first()
  if (await b.count()) { await b.click(); await page.waitForTimeout(700) }
}
async function answer(n) {
  const pad = page.getByTestId('number-pad')
  for (let q = 0; q < n; q++) {
    await page.waitForTimeout(500)
    const p = await page.getByTestId('prompt').innerText().catch(() => '')
    const m = p.match(/(\d+)\s*[×x*]\s*(\d+)/)
    if (!m) return q
    for (const d of String(Number(m[1]) * Number(m[2]))) await pad.getByRole('button', { name: d }).click()
    await pad.getByRole('button', { name: /confirm/i }).click()
    await page.waitForTimeout(1100)
  }
  return n
}

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
console.log('boot       :', await txt())
await shot('r0-boot')

// feed shed
await walkToTile(9, 8)
await page.waitForTimeout(3000)
console.log('-> feedshed:', await txt())
await shot('r1-feedshed')
const buy = page.getByRole('button', { name: /buy for/i })
if ((await buy.count()) && !(await buy.isDisabled())) {
  await buy.click(); await page.waitForTimeout(400)
  console.log('   bought  :', await txt())
} else {
  console.log('   (buy disabled — no coins yet, as expected)')
}
await back()

// barn -> stall -> all four care tasks
await walkToTile(4, 8)
await page.waitForTimeout(3500)
console.log('-> barn    :', await txt())
await shot('r2-barn')
for (const task of ['Water', 'Clean', 'Play', 'Feed']) {
  const tenner = page.getByRole('button', { name: 'Tenner' })
  if (!(await tenner.count())) { console.log('   (no more stalls to open — chores done?)'); break }
  await tenner.click()
  await page.waitForTimeout(500)
  if (task === 'Water') await shot('r3-stall')
  const btn = page.getByRole('button', { name: task, exact: true })
  if (!(await btn.count()) || (await btn.isDisabled())) { console.log(`   ${task}: n/a`); await back(); continue }
  await btn.click()
  const got = await answer(6)
  console.log(`   ${task}: answered ${got} · ${(await txt()).slice(0, 90)}`)
  await page.waitForTimeout(700)
}
console.log('after care :', await txt())
await shot('r4-after-care')

console.log('\n--- console ---')
console.log(logs.filter((l) => !/DevTools|\[vite\]/.test(l)).join('\n') || '(clean)')
await browser.close()
