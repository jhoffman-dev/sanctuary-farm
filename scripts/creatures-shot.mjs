import { chromium } from 'playwright-core'
const PW_EXE = process.env.PW_EXE || (() => { try { return chromium.executablePath() } catch { return undefined } })()
const OUT = '/Users/jhoffman/Projects/Debugging Images'
const b = await chromium.launch({ executablePath: PW_EXE })
const p = await b.newPage({ viewport: { width: 900, height: 1000 } })
await p.goto('http://localhost:5173/?dev=1#/dev/creatures', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
await p.screenshot({ path: `${OUT}/c-grid-idle.png` })
for (const m of ['happy', 'eating', 'puzzled', 'sleeping']) {
  const btn = p.getByRole('button', { name: m, exact: true })
  if (await btn.count()) { await btn.click(); await p.waitForTimeout(500) }
}
await p.screenshot({ path: `${OUT}/c-grid-sleeping.png` })
await b.close()
console.log('done')
