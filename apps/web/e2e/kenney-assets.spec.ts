import { expect, test } from '@playwright/test'

/** Kits the catalogue draws from; each one's atlas must arrive exactly once. */
const KITS = ['cube-pets', 'mini-characters', 'fantasy-town-kit', 'survival-kit', 'mini-forest', 'food-kit']
/** Every Kenney atlas is 512 × 512; nothing else in the scene allocates a texture that size. */
const ATLAS_SIDE = 512
const SCREENSHOT = '../../docs/img/kenney-catalogue.png'

test.use({ viewport: { width: 1280, height: 800 } })

test('every catalogue GLB loads, and each kit atlas is fetched once and uploaded once', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  const atlasFetches: string[] = []
  const failedModels: string[] = []
  page.on('response', (response) => {
    const url = new URL(response.url()).pathname
    if (url.endsWith('/Textures/colormap.png')) atlasFetches.push(url)
    if (url.startsWith('/models/') && !response.ok()) failedModels.push(`${response.status()} ${url}`)
  })
  // Count GPU texture allocations by size, below three.js, so the check does
  // not depend on how three tallies its own textures.
  await page.addInitScript(() => {
    const allocations: string[] = []
    Object.assign(window, { textureAllocations: allocations })
    const original = WebGL2RenderingContext.prototype.texStorage2D
    WebGL2RenderingContext.prototype.texStorage2D = function (target, levels, format, width, height) {
      allocations.push(`${width}x${height}`)
      original.call(this, target, levels, format, width, height)
    }
  })

  await page.goto('/?assets=1')
  const catalogue = page.getByTestId('asset-catalogue')
  await expect(catalogue).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })

  expect(failedModels).toEqual([])
  expect(consoleErrors).toEqual([])
  expect(atlasFetches.toSorted()).toEqual(KITS.map((kit) => `/models/kenney/${kit}/Textures/colormap.png`).toSorted())
  // One colour-map texture per kit, shared by all of that kit's models…
  await expect(catalogue).toHaveAttribute('data-colour-maps', String(KITS.length))
  // …and so one atlas upload per kit, not one per model.
  const allocations = await page.evaluate(() => (window as unknown as { textureAllocations: string[] }).textureAllocations)
  expect(allocations.filter((size) => size === `${ATLAS_SIDE}x${ATLAS_SIDE}`)).toHaveLength(KITS.length)

  test.info().annotations.push({
    type: 'placed sizes (x, y, z world units)',
    description: (await catalogue.getAttribute('data-sizes')) ?? '',
  })
  await page.screenshot({ path: SCREENSHOT })
})
