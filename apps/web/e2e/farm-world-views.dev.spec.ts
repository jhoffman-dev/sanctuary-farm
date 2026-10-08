import { expect, test } from '@playwright/test'

// Dev-only cameras (`?view=`), for looking at the whole tile world and at a
// fence join up close. The screenshots are the deliverable; the assertions
// only make sure the world actually rendered before each one is taken.

const SCREENSHOTS = '../../docs/img'

/** The close-up is mostly textured wood; a smaller frame keeps its PNG under ~400 kB. */
for (const { view, file, viewport } of [
  { view: 'overview', file: 'farm-world-overview.png', viewport: { width: 1280, height: 800 } },
  { view: 'paddock-corner', file: 'farm-world-paddock-corner.png', viewport: { width: 960, height: 600 } },
]) {
  test(`the ${view} camera shows the rendered world`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/?view=${view}&perf=1`)
    await expect(page.getByTestId('perf-probe')).toHaveAttribute('data-draw-calls', /\d+/, { timeout: 30_000 })

    expect(errors).toEqual([])
    await page.screenshot({ path: `${SCREENSHOTS}/${file}` })
  })
}
