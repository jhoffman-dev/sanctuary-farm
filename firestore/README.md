# firestore/

Security-rules tests for the root `firestore.rules`, run with
`@firebase/rules-unit-testing` against the Firestore emulator.

```bash
pnpm test:rules
```

That wraps `vitest` in `firebase emulators:exec --only firestore --project
demo-sanctuary-farm`, so the emulator is started and torn down for you.

**Not part of `pnpm gate`.** The Firestore emulator needs a JDK, which the gate
does not otherwise require; keeping it out means `pnpm gate` stays runnable on a
bare checkout. CI should run it as its own step, after `pnpm gate`:

```yaml
- uses: actions/setup-java@v4
  with: { distribution: temurin, java-version: '21' }
- run: pnpm test:rules
```

The tests are a deny-all contract: no client — signed in or not — may read or
write anything until Phase 4 (ADR-0002) adds per-save ownership rules. When
those rules land, the allowed cases get `assertSucceeds` tests here alongside
the denials.
