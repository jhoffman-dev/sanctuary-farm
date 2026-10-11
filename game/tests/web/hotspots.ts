import type { Page } from '@playwright/test'

/** Clicks a hotspot where the farm says it sits on screen (`data-sf-hotspots`). */
export const tapHotspot = async (page: Page, id: string): Promise<void> => {
  const hotspots = JSON.parse((await page.locator('body').getAttribute('data-sf-hotspots')) ?? '{}')
  const [fx, fy] = hotspots[id] as [number, number]
  const canvas = await page.locator('canvas').boundingBox()
  if (!canvas) throw new Error('the game canvas has no box')
  await page.mouse.click(canvas.x + fx * canvas.width, canvas.y + fy * canvas.height)
}
