# firestore/

Security-rules tests for the root `firestore.rules`, run with
`@firebase/rules-unit-testing` against the Firestore emulator.

```bash
pnpm test:rules
```

That wraps `vitest` in `firebase emulators:exec --only firestore --project
demo-sanctuary-farm`, so the emulator is started and torn down for you.

## Shared project

These rules deploy to the **named database `sanctuary-farm`**, not to
`(default)`. Sanctuary Farm has no Firebase project of its own: it is one tenant
in the shared `student-games-be188` project, which also hosts the Student Games
homepage and Math Invaders. Rules are replaced per database, so deny-all rules on
`(default)` would be *their* rules too — the named database keeps our data and
our rules ours, and gives us our own PITR and backup settings
(`docs/firestore-backup.md`). `firebase.json` binds them together
(`firestore: [{ database: "sanctuary-farm", … }]`) and `pnpm deploy:rules` is
`firebase deploy --only firestore:sanctuary-farm`. Never a bare
`firebase deploy`; never `--only firestore:rules`, which would deploy every
database configured. Full tenancy rules and the one-time setup James runs:
`docs/deploy.md`.

The tests below run against the emulator's **default** database, because
`@firebase/rules-unit-testing` 5.0.2 has no database-id option (its
`TestEnvironmentConfig.firestore` takes only `rules`/`host`/`port`, and
`RulesTestContext.firestore()` takes compat `Settings`, which carries no database
id). The rules *source* under test is the file that gets deployed, so the
contract asserted is the deployed one; only the database it attaches to differs.
If a future release adds a database id, point these tests at `sanctuary-farm`.

**Not part of `pnpm gate`.** The Firestore emulator needs a JDK, which the gate
does not otherwise require; keeping it out means `pnpm gate` stays runnable on a
bare checkout. CI runs it as its own `rules` job in `.github/workflows/ci.yml`
(Temurin 21 + a pinned `firebase-tools`), in parallel with the gate.

The tests are the cloud-save contract (`docs/cloud-save.md`): a player signed
in through our custom-auth function may get, create and update only
`saves/{their uid}`, and only with a valid save document; everything else —
other farms, listing, deleting, the server-only credential collections, any
unmentioned path — is denied. Each allowed case has an `assertSucceeds` test and
each rule has a denial test that fails if the rule is loosened.
