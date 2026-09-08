import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// The Hosting site the absolute social/canonical URLs must point at (.firebaserc
// target `landing`). A relative og:image silently breaks every share preview.
const SITE = 'https://sanctuary-farm-landing.web.app'

const landingFile = (name: string) => fileURLToPath(new URL(`../${name}`, import.meta.url))
const webPublicFile = (name: string) => fileURLToPath(new URL(`../../web/public/${name}`, import.meta.url))

/** Width and height from a PNG's IHDR chunk, which always starts at byte 16. */
const pngSize = (bytes: Buffer) => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) })

const attribute = (page: import('@playwright/test').Page, selector: string, name = 'content') =>
  page.locator(selector).getAttribute(name)

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('social and canonical URLs are absolute on the landing Hosting site', async ({ page }) => {
  const urls = {
    'og:image': await attribute(page, 'meta[property="og:image"]'),
    'og:url': await attribute(page, 'meta[property="og:url"]'),
    'twitter:image': await attribute(page, 'meta[name="twitter:image"]'),
    canonical: await attribute(page, 'link[rel="canonical"]', 'href'),
  }

  for (const [name, url] of Object.entries(urls)) {
    expect(url, `${name} must be an absolute URL on ${SITE}`).toMatch(
      new RegExp(`^${SITE.replace(/[.]/g, '\\.')}/`),
    )
  }
})

test('every local link and asset resolves', async ({ page, request }) => {
  const references = await page.evaluate(() =>
    [...document.querySelectorAll('[href], [src]')]
      .map((element) => element.getAttribute('href') ?? element.getAttribute('src') ?? '')
      .filter((value) => value !== '' && !value.startsWith('#') && !/^([a-z]+:)?\/\//i.test(value)),
  )

  expect(references.length).toBeGreaterThan(0)
  // og.png is only ever referenced by absolute URL, so check it explicitly.
  for (const reference of [...new Set([...references, '/og.png'])]) {
    const response = await request.get(new URL(reference, page.url()).toString())
    expect(response.status(), `${reference} must resolve`).toBe(200)
  }
})

test('og:image declares the share image the repo actually ships', async ({ page }) => {
  const { width, height } = pngSize(await readFile(landingFile('og.png')))

  expect(await attribute(page, 'meta[property="og:image:width"]')).toBe(String(width))
  expect(await attribute(page, 'meta[property="og:image:height"]')).toBe(String(height))
  expect(await attribute(page, 'meta[property="og:image:type"]')).toBe('image/png')
})

test('one icon mark: the SVG favicon is the app icon and is declared last', async ({ page }) => {
  const iconLinks = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel~="icon"]')].map((element) => ({
      type: element.getAttribute('type') ?? '',
      href: element.getAttribute('href') ?? '',
    })),
  )

  const svgIcons = iconLinks.filter((icon) => icon.type === 'image/svg+xml')
  expect(svgIcons, 'exactly one SVG rel="icon"').toHaveLength(1)
  // Chrome prefers the last declared icon, Firefox and Safari the SVG one:
  // declaring the SVG last is what makes every browser show the same mark.
  expect(iconLinks.at(-1)).toEqual(svgIcons[0])
})

test('the icon copies still match their source of truth in apps/web/public', async () => {
  // apps/landing deploys as a separate Hosting site, so it carries copies.
  // These pairs are what keeps the landing page and the game showing one mark.
  const copies = [
    ['favicon.svg', 'icon.svg'],
    ['icon-192.png', 'icon-192.png'],
    ['icon-180.png', 'icon-180.png'],
  ] as const

  for (const [copy, source] of copies) {
    const [copied, original] = await Promise.all([readFile(landingFile(copy)), readFile(webPublicFile(source))])
    expect(copied.equals(original), `apps/landing/${copy} must match apps/web/public/${source}`).toBe(true)
  }
})

test('the page ships no script', async ({ page }) => {
  // No ads, no tracking, no PII: a static page with zero JS makes that checkable.
  await expect(page.locator('script')).toHaveCount(0)
})

test('Tab reaches the first call to action and shows a focus ring', async ({ page }) => {
  await page.keyboard.press('Tab')

  const focused = page.locator(':focus')
  await expect(focused).toHaveText("Where it's at")

  const ring = await focused.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      boxShadow: style.boxShadow,
    }
  })

  const hasOutline = ring.outlineStyle !== 'none' && ring.outlineWidth > 0
  const hasShadow = ring.boxShadow !== 'none' && ring.boxShadow !== ''
  expect(hasOutline || hasShadow, `focus ring missing: ${JSON.stringify(ring)}`).toBe(true)
})
