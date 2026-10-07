import { expect, test, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  filledRatio,
  intersectionOverUnion,
  maskFromString,
  type Mask,
} from '../src/spike/silhouette-tile'

/**
 * The ADR-0003 correction: Kenney's Cube Pets + Mini Characters in the SF-63
 * spike. Two questions — do they pass art-direction §3's 64-px silhouette
 * rule, measured against the Quaternius cow/horse pair ADR-0004 failed; and
 * what do they cost in the §2 scene — plus the same tap-to-walk check the
 * Quaternius keeper passed.
 */

const SCENE_URL = '/?spike=3d&pack=kenney'
const IMAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'docs', 'adr', 'img')

const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '360x640', width: 360, height: 640 },
] as const

const FPS_WINDOW_MS = 5_000
/** Large enough that the 64-px tile is a true downscale, not the raw render. */
const SILHOUETTE_RENDER_PX = 512

const SUBJECTS = {
  kenney: ['cow', 'hog', 'pig', 'chick', 'keeper'],
  quaternius: ['cow', 'horse', 'chicken', 'keeper'],
} as const
type Pack = keyof typeof SUBJECTS

/** The pairs the verdict turns on: Kenney's four farm animals, and ADR-0004's failing reference. */
const KENNEY_FARM_ANIMALS = ['cow', 'hog', 'pig', 'chick'] as const
const REFERENCE_PAIR = ['cow', 'horse'] as const

const TURNS = ['three-quarter', 'profile', 'headon'] as const
type Turn = (typeof TURNS)[number]
/** The canonical tile set saved one file per model; the other turns go on the contact sheet. */
const SAVED_TURN: Turn = 'three-quarter'

type Tile = { pack: Pack; turn: Turn; name: string; png: Buffer; dataUrl: string; mask: Mask }

type Readout = Record<string, string>

async function readout(page: Page): Promise<Readout> {
  return page.getByTestId('spike-readout').evaluate((node) => ({ ...(node as HTMLElement).dataset }) as Readout)
}

async function waitForScene(page: Page): Promise<void> {
  await expect(page.getByTestId('spike-canvas')).toBeVisible()
  await expect
    .poll(async () => {
      const measured = await readout(page)
      return ['Keeper', 'Cow', 'Hog', 'Pig', 'Chick'].every((name) => Number(measured[`silhouette${name}`]) > 0)
    }, { timeout: 30_000 })
    .toBe(true)
}

/** Fails the test on any uncaught page error — a missing clip throws inside the render loop. */
function failOnPageError(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

async function captureTile(page: Page, { pack, turn, name }: { pack: Pack; turn: Turn; name: string }): Promise<Tile> {
  await page.goto(`/?spike=3d&pack=${pack}&silhouette=${name}&turn=${turn}`)
  const tile = page.getByTestId('silhouette-tile')
  await expect(tile).toBeVisible({ timeout: 30_000 })
  const dataUrl = (await tile.getAttribute('src')) ?? ''
  const mask = maskFromString((await tile.getAttribute('data-mask')) ?? '')
  return { pack, turn, name, dataUrl, png: Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'), mask }
}

function pairwise(tiles: readonly Tile[], names: readonly string[]): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const [index, first] of names.entries()) {
    for (const second of names.slice(index + 1)) {
      const a = tiles.find((tile) => tile.name === first)
      const b = tiles.find((tile) => tile.name === second)
      if (!a || !b) throw new Error(`missing tile for ${first}/${second}`)
      scores[`${first}/${second}`] = Number(intersectionOverUnion(a.mask, b.mask).toFixed(3))
    }
  }
  return scores
}

function contactSheetHtml(tiles: readonly Tile[], scores: Record<Turn, Record<string, number>>): string {
  const cell = (tile: Tile) =>
    `<figure><img src="${tile.dataUrl}" width="64" height="64">` +
    `<img class="big" src="${tile.dataUrl}" width="128" height="128">` +
    `<figcaption>${tile.name} · fill ${filledRatio(tile.mask).toFixed(2)}</figcaption></figure>`
  const row = (pack: Pack, turn: Turn) =>
    `<div class="row"><div class="label">${pack}<br>${turn}</div>` +
    `${tiles.filter((tile) => tile.pack === pack && tile.turn === turn).map(cell).join('')}</div>`
  const iou = (turn: Turn) =>
    `<div class="iou"><b>${turn} IoU:</b> ` +
    Object.entries(scores[turn])
      .map(([pair, score]) => `<span>${pair} <b>${score.toFixed(2)}</b></span>`)
      .join('') +
    '</div>'
  const block = (turn: Turn) => `${row('kenney', turn)}${row('quaternius', turn)}${iou(turn)}`
  return `<!doctype html><html><head><style>
    body { margin: 12px; font: 12px system-ui, sans-serif; background: #fff; color: #222; width: 1010px }
    .row { display: flex; gap: 10px; margin-top: 8px }
    .label { width: 90px; font-weight: 600; align-self: center }
    figure { margin: 0; display: grid; gap: 4px; justify-items: center; border: 1px solid #ddd; padding: 6px }
    img.big { image-rendering: pixelated; border-top: 1px dashed #ccc }
    .iou { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 6px 0 14px; padding-bottom: 8px; border-bottom: 1px solid #ccc }
  </style></head><body>
    <h1 style="font-size:14px;margin:0">64-px silhouettes down the art-direction §2 camera's line of sight. Each cell: the tile at actual size, then the same 64 px enlarged 2×. IoU of the binarised tiles: 1 = identical shape.</h1>
    ${TURNS.map(block).join('')}
  </body></html>`
}

test.describe('ADR-0003 correction — Kenney Cube Pets + Mini Characters', () => {
  test('the scene renders the keeper and all four animals without a page error', async ({ page }) => {
    const errors = failOnPageError(page)
    await page.goto(SCENE_URL)
    await waitForScene(page)
    expect(Number((await readout(page)).drawCalls)).toBeGreaterThan(0)
    // Long enough for every animal to cross-fade idle → eat at least once.
    await page.waitForTimeout(8_000)
    expect(errors).toEqual([])
  })

  test('tapping the ground walks the Kenney keeper and crossfades idle → walk → idle', async ({ page }) => {
    await page.goto(SCENE_URL)
    await waitForScene(page)
    const before = await readout(page)
    expect(before.clip).toBe('Idle')

    const box = await page.getByTestId('spike-canvas').boundingBox()
    if (!box) throw new Error('the spike canvas has no layout box')
    await page.mouse.click(box.x + box.width * 0.68, box.y + box.height * 0.78)

    await expect.poll(async () => (await readout(page)).clip, { timeout: 5_000 }).toBe('Walk')
    await expect.poll(async () => (await readout(page)).clip, { timeout: 20_000 }).toBe('Idle')
    const after = await readout(page)
    expect(Math.hypot(Number(after.keeperX) - Number(before.keeperX), Number(after.keeperZ) - Number(before.keeperZ))).toBeGreaterThan(1)
  })

  for (const viewport of VIEWPORTS) {
    test(`measures and screenshots the Kenney scene at ${viewport.name}`, async ({ page }) => {
      await mkdir(IMAGE_DIR, { recursive: true })
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(SCENE_URL)
      await waitForScene(page)
      await page.getByTestId('spike-reset-stats').click()
      await page.waitForTimeout(FPS_WINDOW_MS)

      const measured = await readout(page)
      // eslint-disable-next-line no-console -- the spike's whole point is these numbers
      console.log(`[kenney ${viewport.name}] ${JSON.stringify(measured)}`)
      expect(Number(measured.frames)).toBeGreaterThan(30)
      await page.screenshot({ path: join(IMAGE_DIR, `kenney-spike-${viewport.name}.png`) })
    })
  }

  test('measures the 64-px silhouettes against the Quaternius reference', async ({ page }) => {
    test.setTimeout(120_000)
    await mkdir(IMAGE_DIR, { recursive: true })
    await page.setViewportSize({ width: SILHOUETTE_RENDER_PX, height: SILHOUETTE_RENDER_PX })

    const tiles: Tile[] = []
    for (const turn of TURNS) {
      for (const pack of Object.keys(SUBJECTS) as Pack[]) {
        for (const name of SUBJECTS[pack]) {
          const tile = await captureTile(page, { pack, turn, name })
          const fill = filledRatio(tile.mask)
          expect(fill, `${pack} ${name} ${turn} fill`).toBeGreaterThan(0.05)
          expect(fill, `${pack} ${name} ${turn} fill`).toBeLessThan(0.95)
          tiles.push(tile)
          if (turn === SAVED_TURN) await writeFile(join(IMAGE_DIR, `${pack}-silhouette-${name}-64.png`), tile.png)
        }
      }
    }

    const scores = Object.fromEntries(
      TURNS.map((turn) => {
        const ofTurn = (pack: Pack) => tiles.filter((tile) => tile.pack === pack && tile.turn === turn)
        return [turn, { ...pairwise(ofTurn('kenney'), KENNEY_FARM_ANIMALS), ...pairwise(ofTurn('quaternius'), REFERENCE_PAIR) }]
      }),
    ) as Record<Turn, Record<string, number>>
    const fills = Object.fromEntries(
      tiles.map((tile) => [`${tile.pack}/${tile.name}/${tile.turn}`, Number(filledRatio(tile.mask).toFixed(3))]),
    )
    // eslint-disable-next-line no-console -- the spike's whole point is these numbers
    console.log(`[silhouette iou] ${JSON.stringify(scores)}\n[silhouette fill] ${JSON.stringify(fills)}`)

    await page.setViewportSize({ width: 1040, height: 700 })
    await page.setContent(contactSheetHtml(tiles, scores))
    await page.screenshot({ path: join(IMAGE_DIR, 'kenney-silhouettes.png'), fullPage: true })
  })
})
