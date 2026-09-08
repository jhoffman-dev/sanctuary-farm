import { expect, test, type Page } from '@playwright/test'

/** How many questions the game chose for this round, read off "Question 1 of N". */
async function readRoundLength(page: Page): Promise<number> {
  const text = await page.getByTestId('progress').innerText()
  const match = /Question 1 of (\d+)/.exec(text)
  if (!match) throw new Error(`Unrecognised progress text: ${text}`)
  return Number(match[1])
}

async function readProduct(page: Page): Promise<number> {
  const text = await page.getByTestId('question').innerText()
  const match = /(\d+)\s*×\s*(\d+)/.exec(text)
  if (!match) throw new Error(`Unrecognised question text: ${text}`)
  return Number(match[1]) * Number(match[2])
}

async function typeOnPad(page: Page, value: number) {
  for (const digit of String(value)) await page.getByTestId(`numberpad-${digit}`).click()
  await page.getByTestId('submit').click()
}

test('day-one loop: practise in the paddock, earn coins, coins survive a reload', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('coins')).toHaveText('0')
  await expect(page.getByTestId('feed')).toBeVisible()

  await page.getByTestId('start-paddock').click()
  await expect(page.getByTestId('question')).toBeVisible()
  const roundLength = await readRoundLength(page)
  expect(roundLength).toBeGreaterThan(0)

  for (let i = 0; i < roundLength; i++) {
    await expect(page.getByTestId('progress')).toHaveText(`Question ${i + 1} of ${roundLength}`)
    const product = await readProduct(page)
    await typeOnPad(page, product)
    if (i < roundLength - 1) {
      await expect(page.getByTestId('feedback')).toBeVisible()
      await expect(page.getByTestId('feedback')).toContainText(/Fluent|Correct/)
    }
  }

  await expect(page.getByTestId('round-summary')).toBeVisible()
  const coinsAfterRound = Number(await page.getByTestId('coins').innerText())
  expect(coinsAfterRound).toBeGreaterThan(0)

  await page.reload()
  await expect(page.getByTestId('coins')).toHaveText(String(coinsAfterRound))
})

test('the answer pad is a number pad, never a set of choices', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('start-paddock').click()
  await expect(page.getByRole('button', { name: /^Digit \d$/ })).toHaveCount(10)
})
