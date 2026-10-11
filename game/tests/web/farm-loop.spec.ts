import { expect, test, type Page } from '@playwright/test'
import { tapHotspot } from './hotspots'

// The canvas has no DOM text, so the game mirrors its state onto <body data-*>
// (adapters/web_page.gd): the question, the coins, the pad, where the keeper
// stands and where each hotspot sits on screen. Every wait below polls those;
// none waits on the clock.
const SKELETON_SCREENSHOT = 'docs/img/godot-skeleton-1280x800.png'
const KEEPER_SCREENSHOT = 'docs/img/godot-keeper-walk-1280x800.png'

const saveDocImage = async (page: Page, path: string) => {
  if (process.env.UPDATE_DOC_IMAGES === '1') {
    await page.screenshot({ path: new URL(`../../../${path}`, import.meta.url).pathname })
  }
}

// Taps a hotspot where the game says it is on screen (fractions of the view).
test('tapping the paddock walks the keeper there, the pad opens and a right answer earns coins', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.goto('/')

  const body = page.locator('body')
  await expect(page.locator('canvas')).toBeVisible()
  await expect(body).toHaveAttribute('data-sf-coins', /^\d+$/, { timeout: 90_000 })
  await expect(body).toHaveAttribute('data-sf-pad', 'closed')
  await expect(body).toHaveAttribute('data-sf-keeper', 'standing')

  await tapHotspot(page, 'paddock')
  await expect(body).toHaveAttribute('data-sf-keeper', 'walking', { timeout: 10_000 })
  await expect(body).toHaveAttribute('data-sf-keeper', 'standing', { timeout: 30_000 })
  await expect(body).toHaveAttribute('data-sf-keeper-at', 'paddock')
  await expect(body).toHaveAttribute('data-sf-pad', 'open', { timeout: 30_000 })
  await expect(body).toHaveAttribute('data-sf-question', /^\d+x\d+$/)
  await saveDocImage(page, KEEPER_SCREENSHOT)

  const coinsBefore = Number(await body.getAttribute('data-sf-coins'))
  const question = (await body.getAttribute('data-sf-question')) ?? ''
  const [a, b] = question.split('x').map(Number)
  // The tap above gave the canvas keyboard focus.
  await page.keyboard.type(String(a * b))
  await page.keyboard.press('Enter')

  await expect.poll(async () => Number(await body.getAttribute('data-sf-coins')), { timeout: 30_000 }).toBeGreaterThan(
    coinsBefore,
  )
  await expect(body).not.toHaveAttribute('data-sf-question', question)
  expect(consoleErrors).toEqual([])
  await saveDocImage(page, SKELETON_SCREENSHOT)
})
