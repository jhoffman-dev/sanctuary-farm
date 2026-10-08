import { expect, test, type Page } from '@playwright/test'

// SF-80: the performance budget's guards. The scene container carries
// `data-quality` (the tier) and `data-frameloop` (r3f's loop); `?perf=1` adds
// renderer.info and the frame rate on `[data-testid=perf-probe]`. Headless
// Chromium on a laptop is not the reference Chromebook: these numbers are
// draw calls (device-independent) and a rough frame rate, not a device run.

/** docs/performance-budget.md, scene table: draw calls, target 100, ceiling 150. */
const DRAW_CALL_TARGET = 100
const DRAW_CALL_CEILING = 150
const WORLD_READY_MS = 30_000
const WALK_MS = 15_000

type Reading = { drawCalls: number; fps: number }

async function readProbe(page: Page): Promise<Reading> {
  return page.getByTestId('perf-probe').evaluate((element: HTMLElement) => ({
    drawCalls: Number(element.dataset.drawCalls),
    fps: Number(element.dataset.fps),
  }))
}

/** Waits for the probe's next window. A resting low tier repeats its numbers, so the count is what changes. */
async function nextPublish(page: Page): Promise<void> {
  const probe = page.getByTestId('perf-probe')
  const before = Number(await probe.getAttribute('data-publishes'))
  await expect.poll(async () => Number(await probe.getAttribute('data-publishes')), { timeout: 5_000 }).toBeGreaterThan(before)
}

/** Waits for the world to draw, then for two more probe windows, past model upload and shader compile. */
async function settledReading(page: Page): Promise<Reading> {
  const probe = page.getByTestId('perf-probe')
  await expect(probe).toHaveAttribute('data-draw-calls', /\d+/, { timeout: WORLD_READY_MS })
  await nextPublish(page)
  await nextPublish(page)
  return readProbe(page)
}

/** Holds an arrow key until the keeper has walked a few tiles, reading the probe mid-walk. */
async function readingWhileWalking(page: Page): Promise<Reading> {
  const scene = page.getByTestId('scene')
  await page.keyboard.down('ArrowRight')
  await expect(scene).toHaveAttribute('data-frameloop', 'always', { timeout: WALK_MS })
  // The window that was open when the walk began also timed resting frames; wait for one all walking.
  await nextPublish(page)
  await nextPublish(page)
  const reading = await readProbe(page)
  await page.keyboard.up('ArrowRight')
  return reading
}

test.describe('quality tiers at 1280 × 800', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('the high tier draws the full look inside the draw-call ceiling, animating at rest', async ({ page }) => {
    await page.goto('/?perf=1&quality=high')
    const scene = page.getByTestId('scene')
    await expect(scene).toHaveAttribute('data-quality', 'high')
    const reading = await settledReading(page)

    expect(reading.drawCalls).toBeGreaterThan(0)
    expect(reading.drawCalls).toBeLessThanOrEqual(DRAW_CALL_CEILING)
    await expect(scene).toHaveAttribute('data-frameloop', 'always')
    test.info().annotations.push({ type: 'high tier', description: `${reading.drawCalls} draw calls, ${reading.fps} fps at rest` })
  })

  test('the low tier draws under the draw-call target, and fewer than the high tier', async ({ page }) => {
    await page.goto('/?perf=1&quality=high')
    const high = await settledReading(page)
    await page.goto('/?perf=1&quality=low')
    await expect(page.getByTestId('scene')).toHaveAttribute('data-quality', 'low')
    const low = await settledReading(page)
    const walking = await readingWhileWalking(page)

    expect(low.drawCalls).toBeGreaterThan(0)
    expect(low.drawCalls).toBeLessThanOrEqual(DRAW_CALL_TARGET)
    expect(low.drawCalls).toBeLessThan(high.drawCalls)
    test.info().annotations.push({
      type: 'low tier',
      description: `${low.drawCalls} draw calls at rest (high: ${high.drawCalls}); ${walking.drawCalls} draw calls, ${walking.fps} fps walking`,
    })
  })

  test('the low tier rests on demand, draws every frame while the keeper walks, and rests again', async ({ page }) => {
    await page.goto('/?perf=1&quality=low')
    const scene = page.getByTestId('scene')
    await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-tile', /-?\d+,-?\d+/, { timeout: WORLD_READY_MS })
    await expect(scene).toHaveAttribute('data-frameloop', 'demand', { timeout: WALK_MS })

    await page.keyboard.down('ArrowRight')
    await expect(scene).toHaveAttribute('data-frameloop', 'always', { timeout: WALK_MS })
    await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-clip', 'walk', { timeout: WALK_MS })
    await page.keyboard.up('ArrowRight')

    await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-clip', 'idle', { timeout: WALK_MS })
    await expect(scene).toHaveAttribute('data-frameloop', 'demand', { timeout: WALK_MS })
  })
})

test('a first visit probes the device, and the next visit remembers the tier', async ({ page }) => {
  await page.goto('/?perf=1')
  const scene = page.getByTestId('scene')
  await expect(scene).toHaveAttribute('data-quality', /^(low|high)$/, { timeout: WORLD_READY_MS })
  const tier = await scene.getAttribute('data-quality')
  test.info().annotations.push({ type: 'probe verdict', description: `${tier}: ${await scene.getAttribute('data-quality-reason')}` })

  await page.reload()
  await expect(scene).toHaveAttribute('data-quality', tier ?? '')
  await expect(scene).toHaveAttribute('data-quality-reason', 'remembered')
})
