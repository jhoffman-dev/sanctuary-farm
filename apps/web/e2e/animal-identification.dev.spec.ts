import { expect, type Page, test } from '@playwright/test'
import { dominantColour, type Swatch } from '../src/world-assets/test/body-colour'
import { MACHADO_2009, perceivedDifference, type Rgb, rgbToHex, VISIONS } from '../src/world-assets/test/colour-science'
import { saveDocImage } from './doc-image'

/**
 * Art-direction §3, in the browser: each animal rendered alone, in colour, at
 * the game camera's angle and its §2 size, shrunk to 64 × 64 on a 360 × 640
 * screen. The unit test (`animal-identification.test.ts`) holds the rule on
 * the GLBs' albedo; this checks what actually reaches the screen — the tints
 * applied at load, under the game's light — and saves the contact sheets.
 */
const MIN_COLOUR_DIFFERENCE = 20
const MIN_HEIGHT_RATIO = 1.3
/** A tile pixel this far (max channel, 0–255) from the grass behind it belongs to the animal. */
const FOREGROUND = 24

test.use({ viewport: { width: 360, height: 640 } })

type Tile = { readonly species: string; readonly rgba: number[] }
type OnScreen = { readonly species: string; readonly heightPx: number; readonly rgb: Rgb }

function readTiles(page: Page): Promise<Tile[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLCanvasElement>('canvas[data-species]')].map((canvas) => ({
      species: canvas.dataset.species ?? '',
      rgba: [...canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data],
    })),
  )
}

/** Silhouette height in pixels and the dominant on-screen colour of one 64 × 64 tile. */
function measureTile({ species, rgba }: Tile): OnScreen {
  const side = Math.sqrt(rgba.length / 4)
  const background = rgba.slice(0, 3)
  const rows = new Set<number>()
  const swatches: Swatch[] = []
  for (let i = 0; i < rgba.length; i += 4) {
    const pixel = rgba.slice(i, i + 3)
    if (Math.max(...pixel.map((channel, k) => Math.abs(channel - background[k]!))) <= FOREGROUND) continue
    rows.add(Math.floor(i / 4 / side))
    swatches.push({ rgb: pixel.map((channel) => channel / 255) as unknown as Rgb, area: 1 })
  }
  const heightPx = rows.size === 0 ? 0 : Math.max(...rows) - Math.min(...rows) + 1
  return { species, heightPx, rgb: dominantColour(swatches).rgb }
}

/** An SVG feColorMatrix carrying Machado's deuteranopia matrix, applied in linear RGB as the paper intends. */
async function simulateDeuteranopia(page: Page): Promise<void> {
  const values = MACHADO_2009.deuteranopia.map((row) => `${row.join(' ')} 0 0`).join(' ') + ' 0 0 0 1 0'
  await page.evaluate((matrix) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.innerHTML = `<filter id="deuteranopia" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${matrix}"/></filter>`
    document.body.append(svg)
    document.querySelector<HTMLElement>('[data-testid="animal-lineup"]')!.style.filter = 'url(#deuteranopia)'
  }, values)
}

test('each animal is told apart by colour or size at 64 px, as rendered', async ({ page }, testInfo) => {
  await page.goto('/?animals=1')
  const lineup = page.getByTestId('animal-lineup')
  await expect(lineup).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })

  const onScreen = (await readTiles(page)).map(measureTile)
  const height = (species: string) => onScreen.find((tile) => tile.species === species)!.heightPx
  testInfo.annotations.push({
    type: 'on screen (64-px tile)',
    description: onScreen.map((tile) => `${tile.species} ${tile.heightPx}px ${rgbToHex(tile.rgb)}`).join(', '),
  })

  // §2 size order survives the camera: chick < bunny, dog < pig, hog < cow.
  for (const [smaller, larger] of [
    ['chick', 'bunny'],
    ['chick', 'dog'],
    ['bunny', 'pig'],
    ['dog', 'pig'],
    ['pig', 'cow'],
    ['hog', 'cow'],
  ] as const)
    expect(height(smaller), `${smaller} < ${larger}`).toBeLessThan(height(larger))
  // Pig and hog share a §2 height; the tilted camera also sees the hog's longer body.
  expect(Math.max(height('pig'), height('hog')) / Math.min(height('pig'), height('hog'))).toBeLessThan(1.15)

  // Pairs that size cannot part on screen must be parted by the colour actually drawn.
  for (const [i, a] of onScreen.entries())
    for (const b of onScreen.slice(i + 1)) {
      if (Math.max(a.heightPx, b.heightPx) / Math.min(a.heightPx, b.heightPx) >= MIN_HEIGHT_RATIO) continue
      for (const vision of VISIONS) {
        const difference = perceivedDifference(a.rgb, b.rgb, vision)
        expect(difference, `${a.species} / ${b.species} on screen under ${vision}`).toBeGreaterThanOrEqual(MIN_COLOUR_DIFFERENCE)
      }
    }

  const sheet = (await lineup.boundingBox())!
  await saveDocImage(page, testInfo, { name: 'animal-id-64px.png', clip: sheet })
  await simulateDeuteranopia(page)
  await saveDocImage(page, testInfo, { name: 'animal-id-64px-deuteranopia.png', clip: sheet })
})
