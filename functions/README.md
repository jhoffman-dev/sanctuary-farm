# functions/

Firebase Cloud Functions (Node 22, TypeScript, ESM). Today: one `health`
HTTPS function so the emulator and the deploy pipeline can be verified. Phase 4
adds custom auth — save codes and username + PIN — per ADR-0002.

```bash
pnpm --filter @sf/functions build      # tsc → lib/
firebase emulators:start               # from the repo root; default project is demo-sanctuary-farm
curl http://127.0.0.1:5001/demo-sanctuary-farm/us-central1/health
curl -I http://127.0.0.1:5000/         # game hosting target
curl -I http://127.0.0.1:5005/         # landing hosting target (each site gets its own port)
```

`.firebaserc` defaults to the `demo-sanctuary-farm` project id: `demo-*` ids run
the emulators with no real project and no login, and a `firebase deploy` against
one fails safely. When SF-29 creates the real project, replace the id and the two
hosting site names in `.firebaserc` in one PR.

Dependencies are pinned to exact versions because `firebase deploy` uploads
only this directory and runs its own `npm install` — the root `pnpm-lock.yaml`
does not travel with it. Dependabot bumps the pins.

The emulator runs the function on the host's Node (26 here) while the runtime is
`nodejs22`; the skew is accepted for a health endpoint and must be revisited
before Phase 4 code uses Node APIs.

Secrets never live here — see `docs/secrets.md`. Runtime secrets are declared
with `defineSecret` and set with `firebase functions:secrets:set`.
