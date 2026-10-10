import { readFile, writeFile } from 'node:fs/promises'
import { type Page, expect, test } from '@playwright/test'
import type { TileCoord, TileWorld } from '@sf/world'
import { saveDocImage } from './doc-image'

/**
 * The world editor (#105), end to end against the dev server: paint, place,
 * rotate, erase, move a hotspot, undo and redo, add land, save — then the
 * files on disk must hold exactly those edits. The files are restored after,
 * so the run leaves the repo clean.
 */

const LAYOUTS = '../../packages/world/layouts'
const OVERRIDES_FILE = `${LAYOUTS}/overrides.json`
const WORLD_FILE = `${LAYOUTS}/world.json`
/** Below the editor's toolbar, which floats over the top of the view. */
const CLEAR_OF_TOOLBAR_PX = 110

test.describe.configure({ mode: 'serial' })
test.use({ viewport: { width: 1280, height: 800 } })

const originals = { overrides: '', world: '' }
/** What the editing test saved, for the reload test to find again. */
let saved: { readonly painted: TileCoord; readonly chunks: number } | undefined

test.beforeAll(async () => {
  originals.overrides = await readFile(OVERRIDES_FILE, 'utf8')
  originals.world = await readFile(WORLD_FILE, 'utf8')
})

test.afterAll(async () => {
  await writeFile(OVERRIDES_FILE, originals.overrides)
  await writeFile(WORLD_FILE, originals.world)
})

async function screenOf(page: Page, tile: TileCoord): Promise<{ x: number; y: number }> {
  return page.evaluate((at) => window.sfWorldEditor!.screenOf(at), tile)
}

async function clickTile(page: Page, tile: TileCoord): Promise<void> {
  const { x, y } = await screenOf(page, tile)
  await page.mouse.click(x, y)
}

async function dragTile(page: Page, from: TileCoord, to: TileCoord): Promise<void> {
  const start = await screenOf(page, from)
  const end = await screenOf(page, to)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 10 })
  await page.mouse.up()
}

/** Lets React commit and three.js draw what the last input changed — frames, not a timer. */
async function nextFrames(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))),
  )
}

async function world(page: Page): Promise<TileWorld> {
  return page.evaluate(() => window.sfWorldEditor!.world())
}

/** Bare grass away from every hotspot, in the view below the toolbar, spaced apart, nearest the middle of the view first. */
async function bareGrassTiles(page: Page, count: number): Promise<TileCoord[]> {
  return page.evaluate(
    ({ wanted, clearance }) => {
      const probe = window.sfWorldEditor!
      const current = probe.world()
      const view = document.querySelector('[data-testid=editor-scene]')!.getBoundingClientRect()
      const inView = (at: TileCoord) => {
        const { x, y } = probe.screenOf(at)
        return x > view.left + 20 && x < view.right - 20 && y > view.top + clearance && y < view.bottom - 20
      }
      const nearHotspot = (at: TileCoord) =>
        current.hotspots.some(
          ({ footprint: f }) => at.x >= f.x - 2 && at.x < f.x + f.width + 2 && at.z >= f.z - 2 && at.z < f.z + f.depth + 2,
        )
      const middle = { x: (view.left + view.right) / 2, y: (view.top + view.bottom) / 2 }
      const fromMiddle = (at: TileCoord) => {
        const { x, y } = probe.screenOf(at)
        return Math.hypot(x - middle.x, y - middle.y)
      }
      const candidates = current.chunks.flatMap((chunk) =>
        chunk.tiles.flatMap((tile, index) => {
          const at = { x: chunk.coord.cx * 16 + (index % 16), z: chunk.coord.cz * 16 + Math.floor(index / 16) }
          const bare = tile.ground.kind === 'grass' && !tile.structure && !tile.decor
          return bare && !nearHotspot(at) && inView(at) ? [at] : []
        }),
      )
      const found: TileCoord[] = []
      for (const at of candidates.sort((one, other) => fromMiddle(one) - fromMiddle(other))) {
        if (found.every((other) => Math.abs(other.x - at.x) + Math.abs(other.z - at.z) > 3)) found.push(at)
      }
      return found.slice(0, wanted)
    },
    { wanted: count, clearance: CLEAR_OF_TOOLBAR_PX },
  )
}

async function inspect(page: Page, tile: TileCoord): Promise<void> {
  await page.keyboard.press('v')
  await clickTile(page, tile)
  await expect(page.getByTestId('inspector-tile')).toHaveText(`x ${tile.x}, z ${tile.z}`)
}

function unsaved(page: Page) {
  return page.getByTestId('unsaved-count')
}

test('edit the farm in the browser and save exactly those edits to the repo', async ({ page }, testInfo) => {
  // A cold dev-server load plus a dozen edits that each redraw a WebGL scene:
  // ~14 s alone here, but CI draws it in software at 0.5–3 s an action and
  // reached the final save at 59 s (run 38072679725). 120 s is twice that.
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/?edit=1')
  await expect(page.getByTestId('world-editor')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
  // Chosen in the game camera's view, so the closing screenshot can show them; top-down shows all the land.
  const [painted, planted, fenced] = (await bareGrassTiles(page, 3)) as [TileCoord, TileCoord, TileCoord]
  expect(fenced, 'three bare grass tiles on screen').toBeDefined()
  await page.keyboard.press('t')
  await expect(page.getByTestId('top-down')).toHaveAttribute('aria-pressed', 'true')

  // Paint a grass tile to dirt; the inspector says it is overridden.
  await page.getByTestId('palette-dirt').click()
  await clickTile(page, painted)
  await inspect(page, painted)
  await expect(page.getByTestId('inspector-ground')).toContainText('dirt')
  await expect(page.getByTestId('inspector-ground-source')).toHaveText('overridden')

  // Place a tree.
  await page.getByTestId('palette-tree').click()
  await clickTile(page, planted)
  await expect(unsaved(page)).toHaveAttribute('data-count', '2')

  // Rotate and place a fence, then erase it: erasing a placed piece leaves no override behind.
  await page.getByTestId('palette-fence').click()
  await page.keyboard.press('r')
  await expect(page.getByTestId('rotate')).toContainText('90°')
  await clickTile(page, fenced)
  await expect(unsaved(page)).toHaveAttribute('data-count', '3')
  await inspect(page, fenced)
  await expect(page.getByTestId('inspector-structure')).toContainText('fence')
  await page.keyboard.press('e')
  await clickTile(page, fenced)
  await expect(unsaved(page)).toHaveAttribute('data-count', '2')

  // Drag the farmhouse one tile south; the path follows it to the new arrival.
  const farmhouse = (await world(page)).hotspots.find((hotspot) => hotspot.id === 'farmhouse')!
  const grip = { x: farmhouse.footprint.x + 1, z: farmhouse.footprint.z + 1 }
  await page.keyboard.press('m')
  await dragTile(page, grip, { x: grip.x, z: grip.z + 1 })
  const movedArrival = { x: farmhouse.arrival.x, z: farmhouse.arrival.z + 1 }
  await expect.poll(async () => (await world(page)).hotspots.find((hotspot) => hotspot.id === 'farmhouse')?.arrival).toEqual(movedArrival)
  await inspect(page, movedArrival)
  await expect(page.getByTestId('inspector-ground')).toContainText('path')
  await expect(unsaved(page)).toHaveAttribute('data-count', '3')

  // Undo the move, then redo it.
  await page.keyboard.press('ControlOrMeta+z')
  await expect(unsaved(page)).toHaveAttribute('data-count', '2')
  expect((await world(page)).hotspots.find((hotspot) => hotspot.id === 'farmhouse')?.arrival).toEqual(farmhouse.arrival)
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(unsaved(page)).toHaveAttribute('data-count', '3')

  // Add land east of the farm.
  await page.keyboard.press('l')
  await clickTile(page, { x: 20, z: 8 })
  await expect.poll(async () => (await world(page)).chunks.length).toBe(5)
  await expect(unsaved(page)).toHaveAttribute('data-count', '4')
  await saveDocImage(page, testInfo, { name: 'world-editor-topdown.png' })

  // The deliverable screenshot: game camera, a tile selected, a tree ghost under the cursor.
  await page.keyboard.press('g')
  await inspect(page, painted)
  await page.getByTestId('palette-tree').click()
  const hover = await screenOf(page, { x: painted.x + 1, z: painted.z })
  await page.mouse.move(hover.x, hover.y)
  await nextFrames(page)
  await saveDocImage(page, testInfo, { name: 'world-editor-1280x800.png' })

  // Save, and the files on disk hold exactly what was done.
  await page.getByTestId('save').click()
  await expect(page.getByTestId('save-status')).toContainText('Saved')
  await expect(unsaved(page)).toHaveAttribute('data-count', '0')
  const before = JSON.parse(originals.overrides) as { edits: unknown[] }
  expect(JSON.parse(await readFile(OVERRIDES_FILE, 'utf8'))).toEqual({
    schemaVersion: 1,
    edits: [
      ...before.edits,
      { op: 'set-ground', at: painted, ground: 'dirt' },
      { op: 'place-decor', at: planted, kind: 'tree', rotation: 0 },
      { op: 'move-hotspot', hotspot: 'farmhouse', to: { x: farmhouse.footprint.x, z: farmhouse.footprint.z + 1 } },
    ],
  })
  const savedWorld = JSON.parse(await readFile(WORLD_FILE, 'utf8')) as { chunks: unknown[] }
  expect(savedWorld.chunks).toContainEqual({ cx: 1, cz: 0 })
  expect(savedWorld.chunks).toHaveLength((JSON.parse(originals.world) as { chunks: unknown[] }).chunks.length + 1)
  saved = { painted, chunks: savedWorld.chunks.length }

  expect(errors).toEqual([])
})

// Its own test, so a second cold load of the editor gets its own time budget
// rather than finishing an already long editing run past the timeout.
test('a fresh load reads the saved files back: nothing unsaved, the edits still there', async ({ page }) => {
  expect(saved, 'the editing test saved first').toBeDefined()
  const { painted, chunks } = saved!
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/?edit=1')
  await expect(page.getByTestId('world-editor')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
  await expect(unsaved(page)).toHaveAttribute('data-count', '0')
  expect((await world(page)).chunks).toHaveLength(chunks)
  // Picked in the game camera's view, which a fresh load opens on.
  await inspect(page, painted)
  await expect(page.getByTestId('inspector-ground')).toContainText('dirt')

  expect(errors).toEqual([])
})
