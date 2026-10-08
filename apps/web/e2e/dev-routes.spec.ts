import { expect, test } from '@playwright/test'

// The catalogue viewer is a developer tool; the child's build must not carry
// it. Against the production bundle, `?assets=1` is just the game.

test('the production build ignores ?assets=1 and never fetches the catalogue', async ({ page }) => {
  const catalogueChunks: string[] = []
  page.on('request', (request) => {
    if (/AssetCatalogue/.test(request.url())) catalogueChunks.push(request.url())
  })

  await page.goto('/?assets=1')

  await expect(page.getByTestId('start-paddock')).toBeVisible()
  await expect(page.getByTestId('scene')).toBeVisible()
  await expect(page.getByTestId('asset-catalogue')).toHaveCount(0)
  expect(catalogueChunks).toEqual([])
})
