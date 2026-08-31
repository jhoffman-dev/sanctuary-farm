# apps/landing

The public homepage: what Sanctuary Farm is, where it's at, what might come.

Plain static HTML/CSS — no build, no framework. Open `index.html` directly, or
serve the folder:

```
npx serve apps/landing
```

Deployed to its own Firebase Hosting site (see `firebase.json`, target
`landing`). The game deploys separately (target `game`).

Keep it honest: update the **Where it's at** checklist as phases land, and add
the real feedback-form and alpha links when they exist.
