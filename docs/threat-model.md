# Kid-safety threat model

What could harm a child playing Sanctuary Farm, or leak their data, and what we
do about each. Companion to ADR-0002 (identity, no PII) and `privacy.md`.
The bar is not "no risk" — it is that every row below has an owner, a
mitigation, and a phase by which it is done.

## 1. Assets, actors, and what we don't have

**What we protect**

| Asset | Why it matters |
| --- | --- |
| A child's attention and safety | No stranger contact, no manipulation, no upsetting content. The whole point. |
| Progress data | A save is a farm and a mastery record. Losing or exposing it breaks trust. |
| The no-PII promise | ADR-0002. One slip (an email field, a tracker) voids the compliance story. |
| The hosting account | Firebase project, GitHub repo, deploy secrets. Compromise = we serve whatever the attacker wants to kids. |

**Actors**

| Actor | Motive | Capability |
| --- | --- | --- |
| Curious classmate | Peek at / mess with a friend's farm | Knows a username; may see a save code over a shoulder |
| Bored kid | Break things, type rude words | Any UI surface; some patience |
| Opportunistic scraper | Harvest whatever is public | Scripts against Firestore / Functions endpoints |
| Malicious adult | Reach or profile a child | Anything a browser can do; social engineering |
| Us, making a mistake | — | Full access. The most likely actor. |

**What we deliberately don't have** — and so don't have to defend: accounts with
an email, chat or messaging, uploads of any kind, ads, and analytics (unless the
SF-31 "decide analytics stance" ticket lands on aggregate, identifier-free counts).

## 2. Threat table

Likelihood is judged for a public link used in classrooms. Status: **Done** ·
**Phase N** (planned, gated on that phase) · **Open** (no owner yet).

| # | Threat | Where | Impact | Likelihood | Mitigation | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Free text seen by other kids: animal names, farm names, signs | Farm UI, visiting (Phase 6) | Bullying, slurs, a kid's real name leaking | High | Pick-from-phrases everywhere a kid types something another kid may see (ADR-0002). If a free field is ever allowed, server-side allowlist + length cap, and never shown to another child unmoderated. | Phase 3 (UI), Phase 6 (visits) |
| 2 | Free text from adults: teacher feedback form | Form → Firestore (Phase 5) | Spam, injected content, accidental student PII | Medium | Adult-only surface, never rendered in the game. Length cap, no email required, write-only Firestore path via a Cloud Function, App Check + rate limit. Reviewed by James, not displayed anywhere. | Phase 5 |
| 3 | Username guessing | Login (username + PIN) | Enumerating real players | Medium | Usernames are generated (`BraveOtter42`), never chosen, so they carry no identity. The auth function returns the same "that didn't match" for unknown user and wrong PIN — no "does this user exist" oracle. | Phase 4 |
| 4 | PIN brute force | Custom-auth Cloud Function | Takeover of a friend's farm | High (4 digits = 10k guesses) | Rate limit per username and per IP in the function; lockout after N failures with a kind, non-blaming message and a cool-down; failures logged as counts only. PIN is a convenience on top of the save code, not the root credential. | Phase 4 |
| 5 | Save code shared, shoulder-surfed, or leaked | Anywhere the code is shown | Someone else loads (and overwrites) the farm | High | Codes are bearer tokens: ≥ 60 bits of entropy from a CSPRNG in the function, revocable, regenerable from the parent gate ("get a new code" invalidates the old). Visiting by code is read-only and goes through a separate, narrower path (row 6). Codes are shown on a deliberate "save to the cloud" screen, not in the HUD. | Phase 4 |
| 6 | Firestore rule gaps | `firestore.rules` | Any client reads/writes any save; the scraper's dream | High if wrong, Low if tested | Deny-by-default rules. Ownership via custom-auth claims: a client may read/write only the save doc whose id is in its token. No client writes to another child's doc, ever. Read-by-code for visiting is a Cloud Function that returns a read-model, not a rule. Rules are unit-tested in the emulator (allow + deny cases) and that test is in the CI gate. | Phase 4 |
| 7 | Third-party scripts and CDNs | Game origin | Script injection, a tracker we didn't choose | Medium | No third-party script on the game origin. Fonts and all assets self-hosted. CSP: `default-src 'self'`, no inline scripts, `connect-src` limited to our Firebase endpoints. If a CDN is ever unavoidable, pinned version + SRI. Headers set in `firebase.json`. | Phase 5 |
| 8 | Secrets in the deploy | Repo, CI, client bundle | Hosting account compromise; anyone can mint auth tokens | Medium | `.env*` gitignored (Done). Secrets live only in GitHub Actions secrets and `firebase functions:secrets`; never in client bundles (the Firebase web config is public by design, everything else is not). `docs/secrets.md` lists every secret, where it lives, and the key-shaped patterns `reviewer` checks on each PR. | gitignore Done; gate Phase 4 |
| 9 | Parent gate (math gate) bypass | Settings / reset | A kid resets their own farm or changes settings | High (it's a math game; they can do math) | The gate is friction, not security. Nothing sensitive is behind it: settings, reset, and regenerating the save code. No data of another child, no purchases (there are none). | Phase 3 |
| 10 | Dependency supply chain | `pnpm-lock.yaml`, CI | Malicious package runs in the build or the client | Medium | Pinned lockfile, `pnpm install --frozen-lockfile` in CI. Dependabot weekly, grouped. pnpm refuses postinstall scripts unless allow-listed in `pnpm-workspace.yaml` (`allowBuilds`). Minimal dependency surface in `functions/`. | Lockfile Done; Dependabot Done |
| 11 | XSS via rendered text | Any place a string is rendered | Script runs as the child; save-code theft | Low | React escaping everywhere; `dangerouslySetInnerHTML` banned by lint. Privacy notice and landing copy are static. If markdown is ever rendered, DOMPurify. CSP (row 7) as the backstop. | Phase 1 (lint) |
| 12 | Phishing look-alike of the login | Off-site | Kids type their save code into a fake page | Low | There is no login form to imitate and no password. The save screen tells kids in plain words: "your farm code only goes in the farm game". No email, so nothing to phish by mail. | Phase 4 (copy) |
| 13 | Data retention and deletion | Firestore | Old saves accumulate; no way to be forgotten | Medium | Saves inactive for 12 months are purged by a scheduled function (the period `privacy.md` states). "Delete my farm" flow needs the save code and confirms clearly. Backups: PITR plus scheduled backups, at most 56 days of retention — see `firestore-backup.md`. | Phase 4 |
| 14 | Abuse of "visit a friend's farm" | Phase 6 feature | Stranger contact, harassment | Medium | Read-only: a visitor can look, never write. No free text anywhere in the visit (row 1). Nothing is written, so no report/block system is needed; if that changes, this row reopens. Visiting needs a code shared out-of-band — no directory, no search. | Phase 6 |
| 15 | COPPA posture | Whole product | Legal exposure; loss of teacher trust | Low | ADR-0002: persistent identifier used solely for internal operations (giving the kid back their farm). No behavioural ads, no third-party trackers, no profiling. IP logs short-retention, never analysed. Plain-language privacy notice. Lawyer sanity check before the public link. | Phase 4–5 |
| 16 | Availability | Firebase Hosting / Firestore | A class of 30 hits the game and it's down | Low | Firebase quotas monitored with budget alerts; Firestore reads are one doc per session. Local save keeps the game playable offline. A static fallback page on Hosting if Functions or Firestore are unavailable ("the farm is resting, your progress is safe on this device"). | Phase 5 |
| 17 | We deploy a bad change | CI / prod | Any of the above, by accident | Medium | Branch protection, PR previews, the gate (typecheck · lint · boundaries · tests · rules tests) must be green. Prod deploys only from `main`. Rules and functions deploy separately from hosting so a UI change cannot loosen a rule. | Phase 5 |

## 3. What we will never build

- Chat, messaging, or any kid-to-kid free text.
- Free-text public profiles or farm descriptions.
- Photo, avatar, or file uploads.
- Geolocation.
- Ads, purchases, or anything that monetises.
- Third-party analytics or trackers that can identify a child.

If a feature idea needs one of these, the answer is to redesign the feature.

## 4. Review cadence

| When | What |
| --- | --- |
| Each phase gate | Re-run the table: every row for that phase is Done or explicitly deferred with a reason. |
| Phase 4 gate | Before cloud save ships: rows 3–6, 8, 13 Done; rules tests in CI. |
| Phase 5 gate | Before the public link: rows 2, 7, 15–17 Done; privacy-lawyer sanity check complete. |
| Any new surface where a kid types or another kid sees | Add a row before the ticket is Ready. |

Sign-off: **James** at each gate. Agents propose row changes via PR; the
`reviewer` agent checks new tickets against §3.

## 5. Open questions

- **Lockout numbers (row 4):** how many PIN failures before cool-down, and how
  long? Needs to be kind to a 7-year-old who mistypes and hostile to a script.
- **Retention (row 13):** 12 months is a proposal (`privacy.md` uses the same number). Is a school-year-plus-summer the
  right unit?
- **Analytics (SF-31):** if aggregate counts are approved, where is the line
  between "how many farms hatched a 7s egg this week" and profiling?
- **App Check:** worth the setup cost for the auth and feedback functions, or is
  rate limiting enough for our scale?
- **Save-code entropy vs. typeability:** `farm-7K2P-9QXM` is ~40 bits. Enough
  when paired with rate limiting, or do we go longer and let the parent copy it?
- **Visiting (row 14):** should a visit even reveal the friend's username, or
  only the farm?
