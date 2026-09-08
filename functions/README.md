# functions/

Firebase Cloud Functions (Node 22, TypeScript, ESM). Today: one `health`
HTTPS function so the emulator and the deploy pipeline can be verified. Phase 4
adds custom auth — save codes and username + PIN — per ADR-0002.

```bash
pnpm --filter @sf/functions build      # tsc → lib/
firebase emulators:start --project demo-sanctuary-farm   # from the repo root
curl http://127.0.0.1:5001/demo-sanctuary-farm/us-central1/health
```

`demo-*` project ids run the emulators without a real Firebase project or a
login. The real project id goes in `.firebaserc` once SF-29 creates it.

Secrets never live here — see `docs/secrets.md`. Runtime secrets are declared
with `defineSecret` and set with `firebase functions:secrets:set`.
