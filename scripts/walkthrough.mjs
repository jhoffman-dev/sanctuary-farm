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
async function answer(n, { shotName } = {}) {
  const pad = page.getByTestId('number-pad')
  for (let q = 0; q < n; q++) {
    await page.waitForTimeout(500)
    const p = await page.getByTestId('prompt').innerText().catch(() => '')
    const m = p.match(/(\d+)\s*[×x*]\s*(\d+)/)
    if (!m) return q
    for (const d of String(Number(m[1]) * Number(m[2]))) await pad.getByRole('button', { name: d }).click()
    await pad.getByRole('button', { name: /confirm/i }).click()
    await page.waitForTimeout(600)
    if (shotName && q === 1) await shot(shotName) // mid-round, 2 answers in
    await page.waitForTimeout(600)
  }
  return n
}

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
console.log('boot       :', await txt())
await shot('r0-boot')

// barn -> stall -> care mini-scenes
await walkToTile(4, 8)
await page.waitForTimeout(3800)
await shot('r1-barn')
await page.getByRole('button', { name: 'Tenner' }).click()
await page.waitForTimeout(600)
await shot('r2-stall')
for (const [task, sceneShot] of [['Water', 'r3-water-scene'], ['Clean', 'r4-clean-scene'], ['Play', 'r5-play-scene'], ['Feed', null]]) {
  const t = page.getByRole('button', { name: 'Tenner' })
  if (await t.count()) { await t.click(); await page.waitForTimeout(500) }
  const btn = page.getByRole('button', { name: task, exact: true })
  if (!(await btn.count()) || (await btn.isDisabled())) { console.log(`   ${task}: n/a`); await back(); continue }
  await btn.click()
  await page.waitForTimeout(1400)
  const got = await answer(6, { shotName: sceneShot ?? undefined })
  console.log(`   ${task}: answered ${got} · ${(await txt()).slice(0, 90)}`)
  await page.waitForTimeout(700)
}
console.log('after care :', await txt())
await shot('r6-goodnight')

console.log('\n--- console ---')
console.log(logs.filter((l) => !/DevTools|\[vite\]/.test(l)).join('\n') || '(clean)')
await browser.close()
