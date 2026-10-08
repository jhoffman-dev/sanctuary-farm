import { expect, test } from '@playwright/test'

// Game rule 8: the farm respects reduced-motion. `data-frameloop` on the scene
// container is the render loop r3f was given — the only part of a WebGL canvas
// a browser test can read.

test.describe('a player who has asked for reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('gets a still farm: the scene renders on demand, not every frame', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('scene')).toHaveAttribute('data-frameloop', 'demand')
  })

  test('can still play the whole loop', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('start-paddock').click()
    await expect(page.getByTestId('question')).toBeVisible()
  })
})

test('on the high tier the farm animates', async ({ page }) => {
  await page.goto('/?quality=high')
  await expect(page.getByTestId('scene')).toHaveAttribute('data-frameloop', 'always')
})
