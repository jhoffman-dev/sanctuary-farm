// Gives the Functions emulator a pepper so `pnpm test:auth` runs on a bare
// checkout. The emulator reads secrets from `functions/.secret.local`
// (gitignored by `*.local`); a `demo-*` project cannot reach Secret Manager.
// The value is a fixed, public test string — it protects nothing and must
// never be used outside the emulator. Real peppers: docs/sign-in.md.
import { existsSync, writeFileSync } from 'node:fs'

const file = new URL('../.secret.local', import.meta.url)
if (!existsSync(file)) {
  writeFileSync(file, 'SANCTUARY_FARM_AUTH_PEPPER=emulator-only-pepper-not-a-secret-0123456789\n')
}
