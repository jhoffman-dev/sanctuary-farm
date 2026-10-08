import { readFile, readdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

/** What `vite preview` serves: the webServer builds it before the run. */
const DIST_ASSETS = 'dist/assets'

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

// The animal lineup (SF-86) is a developer tool too: production ignores `?animals=1`.
test('the production build ignores ?animals=1 and never fetches the lineup', async ({ page }) => {
  const lineupChunks: string[] = []
  page.on('request', (request) => {
    if (/AnimalLineup/.test(request.url())) lineupChunks.push(request.url())
  })

  await page.goto('/?animals=1')

  await expect(page.getByTestId('start-paddock')).toBeVisible()
  await expect(page.getByTestId('animal-lineup')).toHaveCount(0)
  expect(lineupChunks).toEqual([])
})

// The world editor (#105) is a developer tool too: against the production
// bundle, `?edit=1` is just the game, and no shipped file carries the editor.
test('the production build ignores ?edit=1 and ships no world editor', async ({ page }) => {
  const editorRequests: string[] = []
  page.on('request', (request) => {
    if (/WorldEditor|world-editor|__editor/.test(request.url())) editorRequests.push(request.url())
  })

  await page.goto('/?edit=1')

  await expect(page.getByTestId('start-paddock')).toBeVisible()
  await expect(page.getByTestId('scene')).toBeVisible()
  await expect(page.getByTestId('world-editor')).toHaveCount(0)
  expect(editorRequests).toEqual([])

  // The bundle the preview serves: no chunk holds the editor's probe, title or save route.
  const assets = await readdir(DIST_ASSETS)
  const carriers: string[] = []
  for (const file of assets.filter((name) => name.endsWith('.js'))) {
    const text = await readFile(`${DIST_ASSETS}/${file}`, 'utf8')
    if (/sfWorldEditor|World editor|__editor\//.test(text)) carriers.push(file)
  }
  expect(carriers).toEqual([])
})
