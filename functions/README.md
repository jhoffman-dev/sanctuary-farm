# functions/

Firebase Cloud Functions (Node 22, TypeScript, ESM). Today: one `health`
HTTPS function so the emulator and the deploy pipeline can be verified. Phase 4
adds custom auth — save codes and username + PIN — per ADR-0002.

```bash
pnpm --filter @sf/functions build      # tsc → lib/
pnpm emulators                         # from the repo root; pinned to --project demo-sanctuary-farm
curl http://127.0.0.1:5001/demo-sanctuary-farm/us-central1/health
curl -I http://127.0.0.1:5000/         # game hosting target
curl -I http://127.0.0.1:5005/         # landing hosting target (each site gets its own port)
```

`.firebaserc` now defaults to the **real, shared** project
`student-games-be188` — Sanctuary Farm is one tenant in it (`docs/deploy.md`).
Emulators therefore have to name the emulator-only id explicitly:
`--project demo-sanctuary-farm` (the `emulator` alias), which `pnpm emulators`
and `pnpm test:rules` already do. A `demo-*` id needs no login and cannot reach
real Google APIs.

These functions deploy as the codebase **`sanctuary-farm`**, never `default`:
`default` is the homepage repo's codebase, and deploying a codebase deletes
every function missing from its source. Deploy with `pnpm deploy:functions`
(`firebase deploy --only functions:sanctuary-farm`) — never a bare
`firebase deploy`.

Dependencies are pinned to exact versions because `firebase deploy` uploads
only this directory and runs its own `npm install` — the root `pnpm-lock.yaml`
does not travel with it. Dependabot bumps the pins.

The emulator runs the function on the host's Node (26 here) while the runtime is
`nodejs22`; the skew is accepted for a health endpoint and must be revisited
before Phase 4 code uses Node APIs.

Secrets never live here — see `docs/secrets.md`. Runtime secrets are declared
with `defineSecret` and set with `firebase functions:secrets:set`.
