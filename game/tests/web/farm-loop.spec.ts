import { expect, test } from '@playwright/test'

// The canvas has no DOM text, so the game mirrors the question and the coin
// count onto <body data-sf-question / data-sf-coins> (adapters/web_page.gd).
const SCREENSHOT = 'docs/img/godot-skeleton-1280x800.png'

test('the Godot farm asks a question and a right answer earns coins', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.goto('/')

  const body = page.locator('body')
  await expect(page.locator('canvas')).toBeVisible()
  await expect(body).toHaveAttribute('data-sf-question', /^\d+x\d+$/, { timeout: 90_000 })
  const coinsBefore = Number(await body.getAttribute('data-sf-coins'))
  const question = (await body.getAttribute('data-sf-question')) ?? ''
  const [a, b] = question.split('x').map(Number)

  // Click the world, not the pad, so the canvas has keyboard focus.
  await page.mouse.click(300, 400)
  await page.keyboard.type(String(a * b))
  await page.keyboard.press('Enter')

  await expect.poll(async () => Number(await body.getAttribute('data-sf-coins')), { timeout: 30_000 }).toBeGreaterThan(
    coinsBefore,
  )
  await expect(body).not.toHaveAttribute('data-sf-question', question)
  expect(consoleErrors).toEqual([])

  if (process.env.UPDATE_DOC_IMAGES === '1') {
    await page.screenshot({ path: new URL(`../../../${SCREENSHOT}`, import.meta.url).pathname })
  }
})
