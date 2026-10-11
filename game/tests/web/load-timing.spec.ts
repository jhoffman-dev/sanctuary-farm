import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type CDPSession, type Page, chromium, expect, test } from '@playwright/test'

// SF-100: time to the first question on the budget's network and CPU
// (performance-budget.md: 10 Mbps, 150 ms RTT, 4x CPU), cold and warm cache,
// then the frame rate of the scene. This is a laptop running headless
// Chromium with software GL — a regression guard, not the reference device.
// The browser gets a profile on disk: Playwright's default context keeps its
// HTTP cache in memory and does not keep a multi-megabyte engine, which a
// real browser's disk cache does, so "warm" would measure a second cold load.
const NETWORK = { offline: false, latency: 150, downloadThroughput: 10_000_000 / 8, uploadThroughput: 10_000_000 / 8 }
const CPU_SLOWDOWN = 4
const FPS_SAMPLE_MS = 5_000
const REPORT = new URL('../../build/load-timing.json', import.meta.url).pathname

const throttle = async (cdp: CDPSession): Promise<void> => {
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', NETWORK)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN })
}

const secondsToFirstQuestion = async (page: Page, load: () => Promise<unknown>): Promise<number> => {
  const started = Date.now()
  await load()
  await expect(page.locator('body')).toHaveAttribute('data-sf-question', /^\d+x\d+$/, { timeout: 170_000 })
  return (Date.now() - started) / 1000
}

const transferredBytes = (page: Page): Promise<number> =>
  page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .concat(performance.getEntriesByType('navigation'))
      .reduce((sum, entry) => sum + (entry as PerformanceResourceTiming).transferSize, 0),
  )

const framesPerSecond = (page: Page): Promise<number> =>
  page.evaluate(
    (sampleMs) =>
      new Promise<number>((resolve) => {
        let frames = 0
        const started = performance.now()
        const tick = (now: number): void => {
          frames += 1
          if (now - started < sampleMs) requestAnimationFrame(tick)
          else resolve((frames * 1000) / (now - started))
        }
        requestAnimationFrame(tick)
      }),
    FPS_SAMPLE_MS,
  )

test('first question on school Wi-Fi and a 4x slower CPU, cold then warm', async ({ baseURL }) => {
  const profile = mkdtempSync(join(tmpdir(), 'sf-load-timing-'))
  const context = await chromium.launchPersistentContext(profile, { baseURL, viewport: { width: 1366, height: 768 } })
  const page = context.pages()[0] ?? (await context.newPage())
  const cdp = await context.newCDPSession(page)
  await throttle(cdp)
  await cdp.send('Network.clearBrowserCache')

  const coldSeconds = await secondsToFirstQuestion(page, () => page.goto('/'))
  const coldBytes = await transferredBytes(page)
  const fps = await framesPerSecond(page)
  const warmSeconds = await secondsToFirstQuestion(page, () => page.reload())
  const warmBytes = await transferredBytes(page)

  const report = { coldSeconds, coldBytes, warmSeconds, warmBytes, fps: Math.round(fps * 10) / 10 }
  console.log(`load timing: ${JSON.stringify(report)}`)
  writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`)
  test.info().annotations.push({ type: 'load-timing', description: JSON.stringify(report) })
  await context.close()
  rmSync(profile, { recursive: true, force: true })
  expect(warmBytes).toBeLessThan(coldBytes)
})
