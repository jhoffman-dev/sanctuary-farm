import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const publicFile = (name: string) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))

test('the SVG favicon is the app icon and is declared last', async ({ page }) => {
  await page.goto('/')

  const iconLinks = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel~="icon"]')].map((element) => ({
      type: element.getAttribute('type') ?? '',
      href: element.getAttribute('href') ?? '',
    })),
  )

  const svgIcons = iconLinks.filter((icon) => icon.type === 'image/svg+xml')
  expect(svgIcons, 'exactly one SVG rel="icon"').toHaveLength(1)
  expect(
    iconLinks.filter((icon) => icon.type === 'image/png'),
    'a PNG rel="icon" for browsers that will not render an SVG',
  ).not.toHaveLength(0)
  // Chrome prefers the last declared icon, Firefox and Safari the SVG one:
  // declaring the SVG last is what makes every browser show the same mark.
  expect(iconLinks.at(-1)).toEqual(svgIcons[0])
})

test('favicon.svg is generated from icon.svg, so tab and home screen share one mark', async () => {
  // icon.svg is the source of truth: the PWA icon, the source of the PNGs, and
  // the copy apps/landing ships. A favicon that drifts from it is the bug this
  // guards (the tab once showed a wheat emoji while the app icon was the barn).
  const [favicon, icon] = await Promise.all([readFile(publicFile('favicon.svg')), readFile(publicFile('icon.svg'))])

  expect(favicon.equals(icon), 'apps/web/public/favicon.svg must match apps/web/public/icon.svg').toBe(true)
})

test('the browser can fetch and parse the tab icon', async ({ page, request }) => {
  await page.goto('/')
  const response = await request.get('/favicon.svg')
  expect(response.status()).toBe(200)

  const markup = await response.text()
  const parsed = await page.evaluate((source) => {
    const document_ = new DOMParser().parseFromString(source, 'image/svg+xml')
    return {
      error: document_.querySelector('parsererror')?.textContent ?? null,
      rootTag: document_.documentElement.tagName,
      viewBox: document_.documentElement.getAttribute('viewBox'),
      externalRefs: [...document_.querySelectorAll('[href], [src], image')].length,
    }
  }, markup)

  expect(parsed.error, 'favicon.svg must parse as SVG').toBeNull()
  expect(parsed.rootTag).toBe('svg')
  expect(parsed.viewBox, 'a viewBox is what lets the mark scale to any tab size').toBeTruthy()
  expect(parsed.externalRefs, 'a favicon that fetches anything else renders blank in some browsers').toBe(0)
})
