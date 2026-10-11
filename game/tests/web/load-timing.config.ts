import { defineConfig, devices } from '@playwright/test'
import { e2eServerPort } from '../../../scripts/e2e/server-port.ts'

// SF-100: the throttled load timer (load-timing.spec.ts) over the web export,
// served compressed and cached as Firebase Hosting would. Run
// `pnpm godot:export:web` first. GODOT_LOAD_ENCODING=gzip measures a browser
// or CDN that gets gzip instead of brotli.
const server = e2eServerPort({ envKey: 'E2E_GODOT_LOAD_PORT', fixedPort: 4191 })
const baseURL = `http://localhost:${server.port}`
const encoding = process.env.GODOT_LOAD_ENCODING ?? 'br'

export default defineConfig({
  testDir: '.',
  testMatch: 'load-timing.spec.ts',
  forbidOnly: !!process.env.CI,
  timeout: 400_000,
  reporter: 'list',
  outputDir: '../../build/test-results',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } }],
  webServer: {
    command: `node ./serve.mjs ${server.port} --encoding ${encoding}`,
    cwd: import.meta.dirname,
    url: baseURL,
    reuseExistingServer: server.reuseExistingServer,
    // Brotli 11 over the whole engine takes a while at start-up.
    timeout: 180_000,
  },
})
