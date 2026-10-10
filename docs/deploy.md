# Deploying into the shared Student Games project

Sanctuary Farm does **not** have its own Firebase project. It is one tenant in
**`student-games-be188`** ("Student Games"), alongside two other repos on James's
machine: `student-games` (the homepage — Hosting site `student-games-be188`,
target `home`; Cloud Functions codebase `default`) and `math-invaders` (Hosting
site `math-invaders-be188`). Firebase deploys are *destructive by resource*: a
Hosting deploy replaces a site, a functions-codebase deploy **deletes** any
function missing from that codebase's source, and a Firestore rules deploy
replaces the rules on the database it lands on. Everything below exists so that
one repo's deploy can never touch another's.

## Tenancy rules

1. **Own Hosting sites.** `sanctuary-farm` (target `game`) and
   `sanctuary-farm-landing` (target `landing`). Never deploy to
   `student-games-be188` or `math-invaders-be188`. The target → site mapping is
   committed in `.firebaserc`, so a fresh clone needs no setup; `firebase target:apply`
   (below) is only for creating or repointing a mapping. Target *names* are local
   to a repo's `.firebaserc` — `math-invaders` also calls its target `game`, and
   that is fine, because it resolves against its own file.
2. **Own functions codebase.** `sanctuary-farm`, never `default` — `default`
   belongs to the homepage repo, and deploying it from here would delete the
   homepage's `feedback` function.
3. **Own named Firestore database.** `sanctuary-farm`, never `(default)`. Our
   `firestore.rules` is deny-all (Phase 4 opens it per ADR-0002); on `(default)`
   that would be another game's rules too.
4. **Never a bare `firebase deploy`.** It deploys every product in
   `firebase.json` at once. Use the `deploy:*` scripts, which are all
   `--only`-scoped.
5. **Emulators run on `demo-sanctuary-farm`**, not on the real project — pass
   `--project demo-sanctuary-farm` (the `emulator` alias in `.firebaserc`) or use
   `pnpm emulators`. A `demo-*` id needs no login and cannot reach real Google
   APIs.

## Which id is used where

| Id | What it is | Where |
| --- | --- | --- |
| `student-games-be188` | The real, shared Firebase project | `.firebaserc` `projects.default` |
| `sanctuary-farm` | Hosting site for the game | `.firebaserc` target `game` |
| `sanctuary-farm-landing` | Hosting site for the landing page | `.firebaserc` target `landing`; the absolute social/canonical URLs in `apps/landing/index.html` are `https://sanctuary-farm-landing.web.app/` |
| `sanctuary-farm` | Firestore **database** id (not the site — same word, different resource) | `firebase.json` `firestore[0].database` |
| `sanctuary-farm` | Cloud Functions codebase | `firebase.json` `functions[0].codebase` |
| `demo-sanctuary-farm` | Emulator-only project id, no login, no real APIs | `.firebaserc` alias `emulator`; `pnpm emulators`, `pnpm test:rules` |
| `demo-sanctuary-farm-game` / `-landing` | Emulator-only Hosting site ids | `.firebaserc` targets under `demo-sanctuary-farm` |

## One-time setup (James, once — needs the console and a login)

Agents cannot do any of this: it needs `firebase login` and owner rights on the
project (`docs/secrets.md` rule 3).

```sh
firebase login

# 1. Two Hosting sites in the shared project.
firebase hosting:sites:create sanctuary-farm         --project student-games-be188
firebase hosting:sites:create sanctuary-farm-landing --project student-games-be188

# 2. The named Firestore database. `nam5` matches the multi-region the other
#    Student Games resources use; pick the location once — it is permanent.
gcloud firestore databases create --database=sanctuary-farm --location=nam5 \
  --type=firestore-native --project=student-games-be188

# 3. Target mappings — already committed in .firebaserc; run these only to
#    recreate or repoint them.
firebase target:apply hosting game    sanctuary-farm         --project student-games-be188
firebase target:apply hosting landing sanctuary-farm-landing --project student-games-be188

# 4. First deploy, one resource at a time. Check the homepage and Math Invaders
#    still work after the first one.
pnpm build
pnpm deploy:rules
pnpm deploy:functions
pnpm deploy:landing
pnpm deploy:game
```

**Billing.** Step 2 needs the project on the pay-as-you-go **Blaze** plan:
"If your project is on the pay-as-you-go Blaze pricing plan, then you can
optionally create multiple databases in your project, each with its own location
setting" ([Firestore locations](https://firebase.google.com/docs/firestore/locations)),
and the no-cost tier covers only one database — "Cloud Firestore allows exactly
one free database per project" ([Firestore quotas](https://firebase.google.com/docs/firestore/quotas)).
`student-games-be188` already runs Cloud Functions, so it is on Blaze already;
the named database's own usage is billed rather than free-tier, which for one
small document per farm is cents (`docs/firestore-backup.md` §5).

## Day-to-day deploys

| Script | Command | Touches |
| --- | --- | --- |
| `pnpm deploy:game` | `firebase deploy --only hosting:game` | the `sanctuary-farm` site |
| `pnpm deploy:landing` | `firebase deploy --only hosting:landing` | the `sanctuary-farm-landing` site |
| `pnpm deploy:functions` | `firebase deploy --only functions:sanctuary-farm` | our codebase only |
| `pnpm deploy:rules` | `firebase deploy --only firestore:sanctuary-farm` | rules + indexes on the named database only |

`--only firestore:<databaseId>` is Firebase's documented way to address one
database: *"Deploy rules for the specified database configured in your
firebase.json — `firebase deploy --only firestore:<databaseId>`"*
([Manage and deploy Security Rules](https://firebase.google.com/docs/rules/manage-deploy)).

Deploys run from `main`, after `pnpm gate` and `pnpm e2e` are green. CI deploys
(SF-42) inherit these scopes — the workflow must use the same `--only` flags and
must never call bare `firebase deploy`.
