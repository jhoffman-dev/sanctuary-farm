import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * SF-63 spike verification. The scene has no game rules in it, so this checks
 * exactly three things — it renders, a tap walks the keeper, and the clip
 * crossfades idle → walk → idle — and then records the numbers ADR-0004 quotes.
 */

const SPIKE_URL = '/?spike=3d'
const IMAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'docs', 'adr', 'img')

const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '360x640', width: 360, height: 640 },
] as const

/** Long enough for a fair average, short enough not to slow the suite. */
const FPS_WINDOW_MS = 5_000

type Readout = Record<string, string>

async function readout(page: Page): Promise<Readout> {
  return page.getByTestId('spike-readout').evaluate((node) => ({ ...(node as HTMLElement).dataset }) as Readout)
}

/** Waits until the models have loaded and the measurement pump has published. */
async function waitForScene(page: Page): Promise<void> {
  await expect(page.getByTestId('spike-canvas')).toBeVisible()
  await expect
    .poll(async () => Number((await readout(page)).triangles ?? 0), { timeout: 30_000 })
    .toBeGreaterThan(5_000)
}

test.describe('SF-63 — 3D foundation spike', () => {
  test('the scene renders the keeper and both animals', async ({ page }) => {
    await page.goto(SPIKE_URL)
    await waitForScene(page)

    const measured = await readout(page)
    // keeper 5,476 + cow 2,450 + horse 2,182 tris, plus the ground plane.
    expect(Number(measured.triangles)).toBeGreaterThan(10_000)
    expect(Number(measured.drawCalls)).toBeGreaterThan(0)
    expect(Number(measured.silhouetteKeeper)).toBeGreaterThan(0)
    expect(Number(measured.silhouetteCow)).toBeGreaterThan(0)
    expect(Number(measured.silhouetteHorse)).toBeGreaterThan(0)
    expect(Number(measured.silhouetteChicken)).toBeGreaterThan(0)
  })

  test('tapping the ground walks the keeper there and crossfades idle → walk → idle', async ({ page }) => {
    await page.goto(SPIKE_URL)
    await waitForScene(page)

    const before = await readout(page)
    expect(before.clip).toBe('Idle')

    // Well clear of the keeper and of both animals, so the tap lands on grass.
    const canvas = page.getByTestId('spike-canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('the spike canvas has no layout box')
    await page.mouse.click(box.x + box.width * 0.68, box.y + box.height * 0.78)

    await expect.poll(async () => (await readout(page)).clip, { timeout: 5_000 }).toBe('Walk')
    await expect.poll(async () => (await readout(page)).clip, { timeout: 20_000 }).toBe('Idle')

    const after = await readout(page)
    const travelled = Math.hypot(
      Number(after.keeperX) - Number(before.keeperX),
      Number(after.keeperZ) - Number(before.keeperZ),
    )
    expect(travelled).toBeGreaterThan(1)
  })

  test('the keyboard fallback walks the keeper without a pointer', async ({ page }) => {
    await page.goto(SPIKE_URL)
    await waitForScene(page)
    const before = await readout(page)

    await page.keyboard.down('KeyW')
    await expect.poll(async () => (await readout(page)).clip, { timeout: 5_000 }).toBe('Walk')
    await page.keyboard.up('KeyW')
    await expect.poll(async () => (await readout(page)).clip, { timeout: 5_000 }).toBe('Idle')

    const after = await readout(page)
    const travelled = Math.hypot(
      Number(after.keeperX) - Number(before.keeperX),
      Number(after.keeperZ) - Number(before.keeperZ),
    )
    expect(travelled).toBeGreaterThan(0.2)
  })

  for (const viewport of VIEWPORTS) {
    test(`measures and screenshots the scene at ${viewport.name}`, async ({ page }) => {
      await mkdir(IMAGE_DIR, { recursive: true })
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(SPIKE_URL)
      await waitForScene(page)

      // Reset so the average covers a settled scene, not the load spike.
      await page.getByTestId('spike-reset-stats').click()
      await page.waitForTimeout(FPS_WINDOW_MS)

      const measured = await readout(page)
      // eslint-disable-next-line no-console -- the spike's whole point is these numbers
      console.log(`[spike ${viewport.name}] ${JSON.stringify(measured)}`)

      expect(Number(measured.frames)).toBeGreaterThan(30)
      expect(Number(measured.fps)).toBeGreaterThan(0)

      await page.screenshot({ path: join(IMAGE_DIR, `spike-3d-${viewport.name}.png`) })
    })
  }

  /**
   * Art-direction §3 wants every animal readable as a silhouette at 64 px. At
   * 360 × 640 the §2 camera actually renders them at 112–137 px, so this shrinks
   * the viewport until the cow lands on 64 px and captures that worst case.
   */
  test('captures the animals at the 64-px silhouette size', async ({ page }) => {
    await mkdir(IMAGE_DIR, { recursive: true })
    await page.setViewportSize({ width: 360, height: 360 })
    await page.goto(SPIKE_URL)
    await waitForScene(page)

    const measured = await readout(page)
    // eslint-disable-next-line no-console -- the spike's whole point is these numbers
    console.log(`[spike silhouette 360x360] ${JSON.stringify(measured)}`)
    expect(Number(measured.silhouetteCow)).toBeGreaterThan(55)
    expect(Number(measured.silhouetteCow)).toBeLessThan(80)

    await page.screenshot({ path: join(IMAGE_DIR, 'spike-3d-silhouette-64px.png') })
  })

  test('screenshots the keeper mid-walk, facing its target', async ({ page }) => {
    await mkdir(IMAGE_DIR, { recursive: true })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(SPIKE_URL)
    await waitForScene(page)

    const box = await page.getByTestId('spike-canvas').boundingBox()
    if (!box) throw new Error('the spike canvas has no layout box')
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.85)

    await expect.poll(async () => (await readout(page)).clip, { timeout: 5_000 }).toBe('Walk')
    await page.screenshot({ path: join(IMAGE_DIR, 'spike-3d-walking.png') })
    expect((await readout(page)).clip).toBe('Walk')
  })
})
