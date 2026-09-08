# apps/landing

The public homepage: what Sanctuary Farm is, where it's at, what might come.

Plain static HTML/CSS — no build, no framework. Open `index.html` directly, or
serve the folder:

```
npx serve apps/landing
```

Deployed to its own Firebase Hosting site (see `firebase.json`, target
`landing`). The game deploys separately (target `game`).

## Copied assets

A Hosting site can only serve its own folder, so the icons here are copies.
**`apps/web/public` is the source of truth** — change the icon there, then copy
it across:

| Here | Copied from |
| --- | --- |
| `favicon.svg` | `apps/web/public/icon.svg` |
| `icon-192.png` | `apps/web/public/icon-192.png` |
| `icon-180.png` | `apps/web/public/icon-180.png` |

`e2e/landing.spec.ts` asserts the bytes still match, so a copy that drifts
fails the gate. `og.png` is local to this app; render it from `og.svg` at
1200×630.

## Tests

`pnpm e2e:landing` from the repo root (part of `pnpm e2e`) serves this folder
and checks the meta tags, links, icons and keyboard focus. `e2e/` and
`playwright.config.ts` are excluded from the deploy in `firebase.json`.

Keep it honest: update the **Where it's at** checklist as phases land, and add
the real feedback-form and alpha links when they exist.
