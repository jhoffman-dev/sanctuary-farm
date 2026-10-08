import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page, PageScreenshotOptions, TestInfo } from '@playwright/test'

/** `docs/img/`, relative to `apps/web`, where Playwright runs. */
const DOC_IMAGES = path.resolve('../../docs/img')

/**
 * Screenshots into the test's own output folder (under the ignored
 * `test-results/`), so a normal `pnpm e2e` never dirties the tree. The tracked
 * copy in `docs/img/` is refreshed only on request: `UPDATE_DOC_IMAGES=1 pnpm e2e`.
 */
export async function saveDocImage(
  page: Page,
  testInfo: TestInfo,
  { name, ...options }: { name: string } & Omit<PageScreenshotOptions, 'path'>,
): Promise<void> {
  const output = testInfo.outputPath(name)
  await page.screenshot({ ...options, path: output })
  if (process.env.UPDATE_DOC_IMAGES !== '1') return
  await mkdir(DOC_IMAGES, { recursive: true })
  await copyFile(output, path.join(DOC_IMAGES, name))
}
