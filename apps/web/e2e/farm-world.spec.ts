import { expect, test, type Page } from '@playwright/test'
import { saveDocImage } from './doc-image'

// SF-75: the farm scene draws the procedural tile world. `?perf=1` makes the
// scene publish renderer.info, its frame rate and every hotspot's screen
// position onto `data-*` attributes (the ADR-0004 spike's technique), which
// is how a browser test reads a WebGL canvas. `?quality=high` pins the full
// look (shadows on): headless Chromium renders in software, which the tier
// probe would otherwise put on the low tier (SF-80, `quality-tiers.spec.ts`).

/** docs/performance-budget.md: draw calls, target 100, ceiling 150. */
const DRAW_CALL_CEILING = 150
const HOTSPOT_COUNT = 7

type HotspotOnScreen = { id: string; left: number; top: number }
type Probe = { drawCalls: number; triangles: number; fps: number; hotspots: HotspotOnScreen[] }

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/models/') && !response.ok()) errors.push(`${response.status()} ${response.url()}`)
  })
  return errors
}

/** Waits for the world's models to render, lets a few probe windows pass, then reads the probe. */
async function readSettledProbe(page: Page): Promise<Probe> {
  const probe = page.getByTestId('perf-probe')
  await expect(probe).toHaveAttribute('data-draw-calls', /\d+/, { timeout: 30_000 })
  // Two more publishes: the first window can include model upload and shader compile.
  for (let publish = 0; publish < 2; publish++) {
    const before = await probe.getAttribute('data-fps')
    await expect(probe).not.toHaveAttribute('data-fps', before ?? '', { timeout: 5_000 })
  }
  return probe.evaluate((element: HTMLElement) => ({
    drawCalls: Number(element.dataset.drawCalls),
    triangles: Number(element.dataset.triangles),
    fps: Number(element.dataset.fps),
    hotspots: JSON.parse(element.dataset.hotspots ?? '[]') as HotspotOnScreen[],
  }))
}

test.describe('the farm world at the §2 camera, 1280 × 800', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('renders the tile world with no errors, every hotspot in frame, inside the draw-call budget', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    await page.goto('/?perf=1&quality=high')
    await expect(page.locator('canvas')).toBeVisible()

    const probe = await readSettledProbe(page)

    expect(errors).toEqual([])
    expect(probe.hotspots).toHaveLength(HOTSPOT_COUNT)
    for (const hotspot of probe.hotspots) {
      expect(hotspot.left, `${hotspot.id} across`).toBeGreaterThanOrEqual(0)
      expect(hotspot.left, `${hotspot.id} across`).toBeLessThanOrEqual(1280)
      expect(hotspot.top, `${hotspot.id} down`).toBeGreaterThanOrEqual(0)
      expect(hotspot.top, `${hotspot.id} down`).toBeLessThanOrEqual(800)
    }
    expect(probe.drawCalls).toBeGreaterThan(0)
    expect(probe.drawCalls).toBeLessThanOrEqual(DRAW_CALL_CEILING)
    test.info().annotations.push({
      type: 'renderer at 1280x800',
      description: `${probe.drawCalls} draw calls, ${probe.triangles} triangles, ${probe.fps} fps`,
    })
    await saveDocImage(page, testInfo, { name: 'farm-world-1280x800.png' })
  })
})

test.describe('the farm world on a phone, 360 × 640', () => {
  test.use({ viewport: { width: 360, height: 640 } })

  test('renders the tile world with no errors', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    await page.goto('/?perf=1&quality=high')
    const probe = await readSettledProbe(page)

    expect(errors).toEqual([])
    expect(probe.drawCalls).toBeLessThanOrEqual(DRAW_CALL_CEILING)
    test.info().annotations.push({
      type: 'renderer at 360x640',
      description: `${probe.drawCalls} draw calls, ${probe.triangles} triangles, ${probe.fps} fps`,
    })
    await saveDocImage(page, testInfo, { name: 'farm-world-360x640.png' })
  })
})
