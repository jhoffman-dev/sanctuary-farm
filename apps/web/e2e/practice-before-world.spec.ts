import { expect, test } from '@playwright/test'

// docs/performance-budget.md rule 1, "practice first": the number pad has to be
// usable before the Three.js chunk lands, so a child on school Wi-Fi starts
// answering while the scenery is still downloading. Holding the world chunk on
// the wire is the only way to prove the order rather than assume it.

const WORLD_CHUNK = /\/assets\/FarmScene-.*\.js$/

test('the number pad works before the 3D world arrives', async ({ page }) => {
  let deliverWorld = () => {}
  const worldHeld = new Promise<void>((resolve) => {
    deliverWorld = resolve
  })
  await page.route(WORLD_CHUNK, async (route) => {
    await worldHeld
    await route.continue()
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByTestId('scene-loading')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)

  await page.getByTestId('start-paddock').click()
  await expect(page.getByTestId('question')).toBeVisible()
  await page.getByTestId('numberpad-4').click()
  await page.getByTestId('numberpad-2').click()
  await expect(page.getByTestId('entry')).toHaveText('42')
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('feedback')).toBeVisible()

  // Everything above happened with the world still on the wire.
  await expect(page.locator('canvas')).toHaveCount(0)

  deliverWorld()

  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByTestId('scene-loading')).toHaveCount(0)
})
