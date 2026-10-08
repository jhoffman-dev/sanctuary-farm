import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { saveDocImage } from './doc-image'

// SF-77: the keeper walks the tile world, and arriving at the paddock opens
// practice. SF-89: a tap she cannot reach gets a gentle cue, she turns to face
// the camera on arrival, and a phone-sized screen keeps her in view.
// `?perf=1` makes the scene publish the keeper's position, facing, tile, clip
// history, destination and cue, plus the camera's ground position and
// view-projection matrix, on `[data-testid=keeper-probe]` — so a test can turn
// a tile into a point to tap and read where the keeper went without sniffing
// pixels.

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
  yaw: number
  camera: { x: number; z: number }
  cue: string
  cuesShown: number
  viewProjection: number[]
  hotspots: HotspotTiles[]
}
type ScreenPoint = { x: number; y: number }

/** Loading the world's models in a cold headless browser takes a while; the walks themselves take ~5 s. */
const WORLD_READY_MS = 30_000
const WALK_MS = 15_000
/** The farm is ~30 tiles across, crossed in ≤ 8 s (art-direction §2): no walk in these tests is longer. */
const LONG_TEST_MS = 90_000

const tileKey = ({ x, z }: Tile) => `${x},${z}`

/** `@sf/world`'s CHUNK_SIZE and NEAREST_WALKABLE_RADIUS; its entry point needs Vite to load, so they are restated here. */
const CHUNK_SIZE = 16
const NEAREST_WALKABLE_RADIUS = 8
/** A three-quarter view is 30° off the camera's line to the keeper; the probe rounds, and the camera sways a little. */
const FACING_CAMERA_RADIANS = (35 * Math.PI) / 180

type LandBounds = { minX: number; maxX: number; minZ: number; maxZ: number }

/** The land's tile bounds (max exclusive), from the shipped world file — the e2e runs from `apps/web`. */
function landBounds(): LandBounds {
  const file = path.resolve('../../packages/world/layouts/world.json')
  const { chunks } = JSON.parse(readFileSync(file, 'utf8')) as { chunks: { cx: number; cz: number }[] }
  const xs = chunks.map(({ cx }) => cx * CHUNK_SIZE)
  const zs = chunks.map(({ cz }) => cz * CHUNK_SIZE)
  return { minX: Math.min(...xs), maxX: Math.max(...xs) + CHUNK_SIZE, minZ: Math.min(...zs), maxZ: Math.max(...zs) + CHUNK_SIZE }
}

/** Tiles from the land, counted the way `nearestWalkable` searches (a square). */
function tilesOffLand({ x, z }: Tile, land: LandBounds): number {
  const dx = Math.max(land.minX - x, x - (land.maxX - 1), 0)
  const dz = Math.max(land.minZ - z, z - (land.maxZ - 1), 0)
  return Math.max(dx, dz)
}

/**
 * A tile the keeper can never reach — so far off the land that nothing walkable
 * is near it — that shows on screen where a tap reaches the canvas: the lowest
 * on screen, so it is as near and as large as such a tile gets.
 */
function unreachableTileOnScreen(state: KeeperState, page: Page): Tile {
  const land = landBounds()
  const reach = NEAREST_WALKABLE_RADIUS + 2
  let best: { tile: Tile; y: number } | null = null
  for (let z = land.minZ - 40; z < land.maxZ + 40; z++) {
    for (let x = land.minX - 40; x < land.maxX + 40; x++) {
      if (tilesOffLand({ x, z }, land) <= reach) continue
      const point = screenPointOfGround({ x: x + 0.5, z: z + 0.5 }, state.viewProjection, page)
      if (point && inTappableArea(point, page) && (!best || point.y > best.y)) best = { tile: { x, z }, y: point.y }
    }
  }
  if (!best) throw new Error('no unreachable tile shows where a tap reaches the canvas')
  return best.tile
}

async function readKeeper(page: Page): Promise<KeeperState> {
  return page.getByTestId('keeper-probe').evaluate((element: HTMLElement) => ({
    x: Number(element.dataset.x),
    z: Number(element.dataset.z),
    tile: element.dataset.tile ?? '',
    clip: element.dataset.clip ?? '',
    clipsSeen: element.dataset.clipsSeen ?? '',
    destination: element.dataset.destination ?? '',
    yaw: Number(element.dataset.yaw),
    camera: (([x, z]) => ({ x: Number(x), z: Number(z) }))((element.dataset.camera ?? '').split(',')),
    cue: element.dataset.cue ?? '',
    cuesShown: Number(element.dataset.cuesShown ?? 0),
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

function viewportOf(page: Page): { width: number; height: number } {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  return viewport
}

/**
 * Where a ground point lands on screen: the camera's matrix (column-major)
 * applied to (x, 0, z). Null when the point is behind the camera.
 */
function screenPointOfGround(ground: { x: number; z: number }, matrix: readonly number[], page: Page): ScreenPoint | null {
  const viewport = viewportOf(page)
  const at = (index: number) => matrix[index] ?? Number.NaN
  const clipX = at(0) * ground.x + at(8) * ground.z + at(12)
  const clipY = at(1) * ground.x + at(9) * ground.z + at(13)
  const clipW = at(3) * ground.x + at(11) * ground.z + at(15)
  if (clipW <= 0) return null
  return { x: ((clipX / clipW + 1) / 2) * viewport.width, y: ((1 - clipY / clipW) / 2) * viewport.height }
}

function screenPointOf(tile: Tile, matrix: readonly number[], page: Page): ScreenPoint {
  const point = screenPointOfGround({ x: tile.x + 0.5, z: tile.z + 0.5 }, matrix, page)
  if (!point) throw new Error(`tile ${tileKey(tile)} is behind the camera`)
  return point
}

async function tapTile(page: Page, tile: Tile): Promise<void> {
  const { viewProjection } = await readKeeper(page)
  const point = screenPointOf(tile, viewProjection, page)
  await page.mouse.click(point.x, point.y)
}

/** Clear of the HUD along the top and the practice panel along the bottom, so a tap reaches the canvas. */
function inTappableArea({ x, y }: ScreenPoint, page: Page): boolean {
  const { width, height } = viewportOf(page)
  return x >= 40 && x <= width - 40 && y >= 110 && y <= height - 160
}

/** The angle between the keeper's front (−Z at yaw 0) and the line from her to the camera. */
function radiansOffCamera({ x, z, yaw, camera }: KeeperState): number {
  const toCamera = Math.atan2(-(camera.x - x), -(camera.z - z))
  const turn = Math.abs(toCamera - yaw) % (Math.PI * 2)
  return turn > Math.PI ? Math.PI * 2 - turn : turn
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
    await saveDocImage(page, testInfo, { name: 'keeper-walking-1280x800.png' })

    await waitUntilStoppedOn(page, tileKey(gate))
    // She walked up with her back to the camera; she turns to look out at the player.
    await expect
      .poll(async () => radiansOffCamera(await readKeeper(page)), { timeout: WALK_MS })
      .toBeLessThanOrEqual(FACING_CAMERA_RADIANS)
    const question = page.getByTestId('question')
    await expect(question).toBeVisible()
    await saveDocImage(page, testInfo, { name: 'keeper-arrived-facing-1280x800.png' })
    const [a, b] = ((await question.textContent()) ?? '').match(/\d+/g)?.map(Number) ?? []
    for (const digit of String((a ?? 0) * (b ?? 0))) await page.getByTestId(`numberpad-${digit}`).click()
    await saveDocImage(page, testInfo, { name: 'keeper-at-paddock-1280x800.png' })
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
    // Captured by the same read that sees it: on a loaded machine a short walk can end between two reads.
    let destination = ''
    await expect
      .poll(async () => (destination = (await readKeeper(page)).destination), { timeout: WALK_MS })
      .not.toBe('')
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

/** Taps a tile the keeper cannot reach, and checks she stays put while the cue comes and goes. */
async function tapUnreachableAndExpectCue(page: Page, start: KeeperState): Promise<Tile> {
  const nowhere = unreachableTileOnScreen(start, page)
  await tapTile(page, nowhere)
  const probe = page.getByTestId('keeper-probe')
  await expect(probe).toHaveAttribute('data-cues-shown', '1', { timeout: WALK_MS })
  const during = await readKeeper(page)
  expect([during.tile, during.clip, during.destination]).toEqual([start.tile, 'idle', ''])
  // On the tapped tile — or already faded, if this read came more than ~400 ms after the tap.
  expect([tileKey(nowhere), '']).toContain(during.cue)
  return nowhere
}

test.describe('a tap the keeper cannot reach, 1280 × 800', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('shows a brief cue on the tapped tile and keeps the keeper where she is', async ({ page }, testInfo) => {
    test.setTimeout(LONG_TEST_MS)
    const start = await openFarm(page)

    // The cue lasts ~400 ms, less than a screenshot or a poll can be relied on to
    // take; hold the page's clock (and so its frames) 100 ms after the tap.
    const installedAt = Date.now()
    await page.clock.install({ time: installedAt })
    await page.clock.pauseAt(installedAt + 1000)
    const nowhere = unreachableTileOnScreen(start, page)
    await tapTile(page, nowhere)
    await page.clock.runFor(100)
    const probe = page.getByTestId('keeper-probe')
    await expect(probe).toHaveAttribute('data-cue', tileKey(nowhere))
    await expect(probe).toHaveAttribute('data-cues-shown', '1')
    await saveDocImage(page, testInfo, { name: 'keeper-unreachable-cue-1280x800.png' })
    await page.clock.resume()

    // ~400 ms, then it is gone; she never moved and nothing else changed.
    await expect(probe).toHaveAttribute('data-cue', '', { timeout: WALK_MS })
    const after = await readKeeper(page)
    expect([after.tile, after.clipsSeen, after.destination]).toEqual([start.tile, 'idle', ''])
    await expect(page.getByTestId('coming-soon')).toHaveCount(0)
  })
})

test.describe('a tap the keeper cannot reach, with reduced motion', () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })

  test('the cue still shows and fades away on the on-demand frameloop', async ({ page }) => {
    test.setTimeout(LONG_TEST_MS)
    const start = await openFarm(page)

    await tapUnreachableAndExpectCue(page, start)
    await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-cue', '', { timeout: WALK_MS })
    expect((await readKeeper(page)).tile).toBe(start.tile)
  })
})

/** FarmScene's idle sway, which moves the camera along x only, by up to this either way. */
const CAMERA_SWAY = 0.35

/** How far the camera has slid to follow the keeper since `before`, not counting what the sway could explain. */
function followSlide(before: KeeperState, after: KeeperState): number {
  const x = Math.max(Math.abs(after.camera.x - before.camera.x) - 2 * CAMERA_SWAY, 0)
  return Math.hypot(x, after.camera.z - before.camera.z)
}

/** The keeper's feet on screen, from the same probe reading. */
function keeperOnScreen(state: KeeperState, page: Page): ScreenPoint {
  const point = screenPointOfGround({ x: state.x, z: state.z }, state.viewProjection, page)
  if (!point) throw new Error('the keeper is behind the camera')
  return point
}

/** The hotspot doorstep furthest from the keeper that a tap can reach on this screen. */
function furthestTappableArrival(state: KeeperState, page: Page): Tile {
  const candidates = state.hotspots
    .map(({ arrival }) => arrival)
    .filter((tile) => inTappableArea(screenPointOf(tile, state.viewProjection, page), page))
    .sort((one, other) => Math.hypot(other.x - state.x, other.z - state.z) - Math.hypot(one.x - state.x, one.z - state.z))
  const [furthest] = candidates
  if (!furthest) throw new Error('no hotspot doorstep shows where a tap reaches the canvas')
  return furthest
}

test.describe('the keeper on a phone, 360 × 640', () => {
  test.use({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true })

  test('a tap walks her there, and the camera glides to keep her on screen all the way', async ({ page }, testInfo) => {
    // World load (≤ 30 s cold) plus a walk sampled the whole way.
    test.setTimeout(LONG_TEST_MS)
    const start = await openFarm(page)
    const target = furthestTappableArrival(start, page)
    const { width, height } = viewportOf(page)

    const { viewProjection } = start
    const point = screenPointOf(target, viewProjection, page)
    await page.touchscreen.tap(point.x, point.y)
    await expect(page.getByTestId('keeper-probe')).toHaveAttribute('data-destination', tileKey(target), { timeout: WALK_MS })

    // Sample the walk: wherever she is, she is on screen.
    let seen: KeeperState = start
    await expect
      .poll(
        async () => {
          seen = await readKeeper(page)
          const feet = keeperOnScreen(seen, page)
          expect(feet.x, `keeper at ${seen.tile}`).toBeGreaterThanOrEqual(0)
          expect(feet.x, `keeper at ${seen.tile}`).toBeLessThanOrEqual(width)
          expect(feet.y, `keeper at ${seen.tile}`).toBeGreaterThanOrEqual(0)
          expect(feet.y, `keeper at ${seen.tile}`).toBeLessThanOrEqual(height)
          return seen.destination
        },
        { timeout: WALK_MS, intervals: [100] },
      )
      .toBe('')
    expect(seen.tile).toBe(tileKey(target))

    // The camera slid after her: a glide, so it settles a moment after she stops.
    await expect.poll(async () => followSlide(start, await readKeeper(page)), { timeout: WALK_MS }).toBeGreaterThan(0.5)
    await saveDocImage(page, testInfo, { name: 'keeper-phone-360x640.png' })
  })
})
