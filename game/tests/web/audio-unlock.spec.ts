import { expect, test } from '@playwright/test'

// Browsers hold audio until a user gesture (docs/sound-design.md §5), and the
// game must ask again on the first input. Under the Playwright runner a page
// already counts as user-activated, so the real policy never bites; this init
// script re-imposes it: every AudioContext starts suspended and resume() waits
// for a trusted pointer or key event, as Chrome's autoplay rule does. The
// engine's context is private to Godot's runtime, so states are logged to the
// console. The game mirrors the last sound it played onto <body data-sf-sound>
// (adapters/godot_audio_bus.gd).
const STATE_LOG = 'sf-audio-state:'

function imposeAutoplayPolicy(prefix: string): void {
  let unlock: () => void = () => undefined
  const gesture = new Promise<void>((resolve) => {
    unlock = resolve
  })
  for (const type of ['pointerdown', 'keydown', 'touchend']) {
    window.addEventListener(type, (event) => event.isTrusted && unlock(), { capture: true })
  }
  let gestured = false
  void gesture.then(() => {
    gestured = true
  })

  const Native = window.AudioContext
  window.AudioContext = class extends Native {
    constructor(options?: AudioContextOptions) {
      super(options)
      this.addEventListener('statechange', () => console.info(prefix + this.state))
      if (!gestured) void super.suspend()
    }

    override resume(): Promise<void> {
      return gestured ? super.resume() : gesture.then(() => super.resume())
    }
  }
}

test('nothing sounds before the first input, and the first input unlocks audio', async ({ page }) => {
  const consoleErrors: string[] = []
  const audioStates: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
    if (message.text().startsWith(STATE_LOG)) audioStates.push(message.text().slice(STATE_LOG.length))
  })
  await page.addInitScript(imposeAutoplayPolicy, STATE_LOG)
  await page.goto('/')

  const body = page.locator('body')
  await expect(body).toHaveAttribute('data-sf-question', /^\d+x\d+$/, { timeout: 90_000 })
  expect(audioStates.at(-1)).toBe('suspended')
  expect(consoleErrors).toEqual([])

  const [a, b] = ((await body.getAttribute('data-sf-question')) ?? '').split('x').map(Number)
  // Click the world, not the pad, so the canvas has keyboard focus.
  await page.mouse.click(300, 400)
  await expect.poll(() => audioStates.at(-1)).toBe('running')
  await page.keyboard.type(String(a * b))
  await page.keyboard.press('Enter')

  await expect(body).toHaveAttribute('data-sf-sound', /^(correct|fluent)$/, { timeout: 30_000 })
  expect(audioStates.at(-1)).toBe('running')
  expect(consoleErrors).toEqual([])
})
