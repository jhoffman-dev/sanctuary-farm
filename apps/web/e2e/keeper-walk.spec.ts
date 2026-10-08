import { copyFile } from 'node:fs/promises'
import { expect, type Page, test, type TestInfo } from '@playwright/test'

// SF-77: the keeper walks the tile world, and arriving at the paddock opens
// practice. `?perf=1` makes the scene publish the keeper's position, tile,
// clip history and destination, plus the camera's view-projection matrix, on
// `[data-testid=keeper-probe]` — so a test can turn a tile into a point to tap
// and read where the keeper went without sniffing pixels.

type Tile = { x: number; z: number }
type HotspotTiles = {
  id: string
  entrance: Tile
  arrival: Tile
  footprint: { x: number; z: number; width: number; depth: number }
}
type KeeperState = {
  x: number
  z: number
  tile: string
  clip: string
  clipsSeen: string
  destination: string
  viewProjection: number[]
  hotspots: HotspotTiles[]
}

/** Loading the world's models in a cold headless browser takes a while; the walks themselves take ~5 s. */
const WORLD_READY_MS = 30_000
const WALK_MS = 15_000
/** The farm is ~30 tiles across, crossed in ≤ 8 s (art-direction §2): no walk in these tests is longer. */
const LONG_TEST_MS = 90_000

/** Relative to `apps/web`, where Playwright runs — the same path the farm-world spec uses. */
const DOC_IMAGES = '../../docs/img'

const tileKey = ({ x, z }: Tile) => `${x},${z}`

async function readKeeper(page: Page): Promise<KeeperState> {
  return page.getByTestId('keeper-probe').evaluate((element: HTMLElement) => ({
    x: Number(element.dataset.x),
    z: Number(element.dataset.z),
    tile: element.dataset.tile ?? '',
    clip: element.dataset.clip ?? '',
    clipsSeen: element.dataset.clipsSeen ?? '',
    destination: element.dataset.destination ?? '',
    viewProjection: JSON.parse(element.dataset.viewProjection ?? '[]') as number[],
    hotspots: JSON.parse(element.dataset.hotspotTiles ?? '[]') as HotspotTiles[],
  }))
}

async function openFarm(page: Page): Promise<KeeperState> {
  await page.goto('/?perf=1')
  await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-tile', /-?\d+,-?\d+/, { timeout: WORLD_READY_MS })
  await expect(page.getByTestId('start-paddock')).toBeVisible()
  return readKeeper(page)
}

/** Where a tile's centre lands on screen: the camera's matrix (column-major) applied to (x + ½, 0, z + ½). */
function screenPointOf(tile: Tile, matrix: readonly number[], page: Page): { x: number; z: number } {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  const at = (index: number) => matrix[index] ?? Number.NaN
  const [x, z] = [tile.x + 0.5, tile.z + 0.5]
  const clipX = at(0) * x + at(8) * z + at(12)
  const clipY = at(1) * x + at(9) * z + at(13)
  const clipW = at(3) * x + at(11) * z + at(15)
  return { x: ((clipX / clipW + 1) / 2) * viewport.width, z: ((1 - clipY / clipW) / 2) * viewport.height }
}

async function tapTile(page: Page, tile: Tile): Promise<void> {
  const { viewProjection } = await readKeeper(page)
  const point = screenPointOf(tile, viewProjection, page)
  await page.mouse.click(point.x, point.z)
}

function hotspotNamed(state: KeeperState, id: string): HotspotTiles {
  const found = state.hotspots.find((hotspot) => hotspot.id === id)
  if (!found) throw new Error(`no ${id} on the probe`)
  return found
}

async function waitUntilStoppedOn(page: Page, tile: string): Promise<void> {
  const probe = page.getByTestId('keeper-probe')
  await expect(probe).toHaveAttribute('data-tile', tile, { timeout: WALK_MS })
  await expect(probe).toHaveAttribute('data-clip', 'idle', { timeout: WALK_MS })
  await expect(probe).toHaveAttribute('data-destination', '', { timeout: WALK_MS })
}

/**
 * Screenshots land in this run's own output folder; they are copied over the
 * committed ones in `docs/img/` only on purpose (`UPDATE_DOC_IMAGES=1`), so a
 * normal e2e run leaves the tree clean.
 */
async function screenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = testInfo.outputPath(name)
  await page.screenshot({ path })
  if (process.env.UPDATE_DOC_IMAGES === '1') await copyFile(path, `${DOC_IMAGES}/${name}`)
}

test.describe('the keeper walks the farm, 1280 × 800', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('a tap walks the keeper there, idle → walk → idle, ending on the tapped tile', async ({ page }) => {
    test.setTimeout(LONG_TEST_MS)
    const start = await openFarm(page)
    const target = hotspotNamed(start, 'nest').arrival

    await tapTile(page, target)
    await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-destination', tileKey(target))
    await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-clip', 'walk', { timeout: WALK_MS })
    const midWalk = await readKeeper(page)
    expect(Math.hypot(midWalk.x - start.x, midWalk.z - start.z)).toBeGreaterThan(0)

    await waitUntilStoppedOn(page, tileKey(target))
    const end = await readKeeper(page)
    expect(end.x).toBeCloseTo(target.x + 0.5, 2)
    expect(end.z).toBeCloseTo(target.z + 0.5, 2)
    expect(end.clipsSeen).toBe('idle,walk,idle')
    // The nest has no activity yet: the game says so instead of doing nothing.
    await expect(page.getByTestId('coming-soon')).toHaveText('The nest is coming soon!')
  })

  test('tapping the paddock gate walks there and opens practice; the number pad takes an answer', async ({ page }, testInfo) => {
    test.setTimeout(LONG_TEST_MS)
    const start = await openFarm(page)
    const gate = hotspotNamed(start, 'paddock').entrance
    await expect(page.getByTestId('question')).toHaveCount(0)

    await tapTile(page, gate)
    await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-clip', 'walk', { timeout: WALK_MS })
    // Mid-walk: far enough along to read as a walk, with the marker on the gate ahead.
    await expect
      .poll(async () => {
        const { x, z } = await readKeeper(page)
        return Math.hypot(x - start.x, z - start.z)
      }, { timeout: WALK_MS })
      .toBeGreaterThan(5)
    await screenshot(page, testInfo, 'keeper-walking-1280x800.png')

    await waitUntilStoppedOn(page, tileKey(gate))
    const question = page.getByTestId('question')
    await expect(question).toBeVisible()
    const [a, b] = ((await question.textContent()) ?? '').match(/\d+/g)?.map(Number) ?? []
    for (const digit of String((a ?? 0) * (b ?? 0))) await page.getByTestId(`numberpad-${digit}`).click()
    await screenshot(page, testInfo, 'keeper-at-paddock-1280x800.png')
    await page.getByTestId('submit').click()
    await expect(page.getByTestId('feedback')).toBeVisible()
    await expect(page.getByTestId('feedback')).not.toHaveAttribute('data-outcome', 'WRONG')
  })

  test('a tap inside the barn walks the keeper to the nearest tile it can stand on', async ({ page }) => {
    test.setTimeout(LONG_TEST_MS)
    const start = await openFarm(page)
    const { footprint } = hotspotNamed(start, 'barn')
    const inside = { x: footprint.x + Math.floor(footprint.width / 2), z: footprint.z + Math.floor(footprint.depth / 2) }

    await tapTile(page, inside)
    const probe = page.getByTestId('keeper-probe')
    await expect(probe).not.toHaveAttribute('data-destination', '', { timeout: WALK_MS })
    const destination = (await readKeeper(page)).destination
    const [x, z] = destination.split(',').map(Number) as [number, number]
    const inBarn = x >= footprint.x && x < footprint.x + footprint.width && z >= footprint.z && z < footprint.z + footprint.depth
    expect(inBarn, `walking to ${destination}`).toBe(false)
    expect(Math.max(Math.abs(x - inside.x), Math.abs(z - inside.z))).toBeLessThanOrEqual(3)

    await waitUntilStoppedOn(page, destination)
  })

  test('the arrow keys walk the keeper tile by tile, and it stops when they are let go', async ({ page }) => {
    test.setTimeout(LONG_TEST_MS)
    const start = await openFarm(page)

    await page.keyboard.down('ArrowRight')
    await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-clip', 'walk', { timeout: WALK_MS })
    await expect.poll(async () => (await readKeeper(page)).tile, { timeout: WALK_MS }).not.toBe(start.tile)
    await page.keyboard.up('ArrowRight')

    await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-clip', 'idle', { timeout: WALK_MS })
    const end = await readKeeper(page)
    // It stops on a tile centre, not wherever the key was let go.
    expect(end.x - Math.floor(end.x)).toBeCloseTo(0.5, 2)
    expect(end.z - Math.floor(end.z)).toBeCloseTo(0.5, 2)
    expect(end.tile).not.toBe(start.tile)
  })
})

test.describe('with reduced motion', () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })

  test('the keeper still walks to a tap, holding its idle pose instead of bobbing', async ({ page }) => {
    test.setTimeout(LONG_TEST_MS)
    const start = await openFarm(page)
    const target = hotspotNamed(start, 'nest').arrival

    await tapTile(page, target)
    await waitUntilStoppedOn(page, tileKey(target))
    expect((await readKeeper(page)).clipsSeen).toBe('idle')
  })
})
