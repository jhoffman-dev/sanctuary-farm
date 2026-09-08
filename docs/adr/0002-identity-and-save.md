# ADR-0002: Identity & save — no PII, internal-operations only

- **Status:** accepted (pending a pre-launch privacy-lawyer sanity check)
- **Date:** 2026-08-31
- **Deciders:** James

## Context

Players are children (largely under 13, US-centric, likely used in classrooms).
We want cross-device saved progress but we will **not store personal
information** — no name, age, email, phone, location, photos. The game shows no
ads and does no behavioural tracking or profiling.

COPPA permits a persistent identifier used **solely to support internal
operations** (which includes maintaining user-driven state) without verifiable
parental consent, provided it is not used for ads, cross-site tracking, or
profile-building. "Give the kid back their farm" is squarely that. FERPA binds
schools, not us; "we store no PII / create no education records" is the answer if
a district adopts the game.

## Decision

- **Primary model: a save code.** No login screen. Progress saves locally.
  A "Save to the cloud" action mints a random opaque code (e.g. `farm-7K2P-9QXM`);
  "Load" takes a code. The code *is* the credential. Shown prominently; a parent
  can copy it.
- **Optional convenience: username + 4-digit PIN**, via Firebase **custom auth**
  (a Cloud Function checks username+PIN against Firestore and mints a token).
  Usernames are **auto-generated** ("BraveOtter42"); kids never free-type a name.
- **No email, no age gate, no third-party analytics/ad SDKs.**
- **IP logs** (unavoidable at the host/CDN) are internal-operations only: short
  retention, never fed into analytics or profiling.
- **A plain-language privacy notice** ships with the game: *"We save your farm. We
  never ask your name, email, or age. No ads. No tracking."*
- **No free-text that other players see.** Any social surface (visiting farms,
  farm signs) uses pick-from-phrases, not typed text — a safety requirement
  independent of PII.

## Alternatives considered

- **Email/password (Firebase Auth default).** Requires an email = PII. Rejected.
- **Anonymous auth only.** Device-bound, no cross-device. Kept as a fallback /
  first-run default that can be *upgraded* to a save code.
- **No cloud save at all.** Simplest and safest, but kids lose progress when a
  browser clears storage — poor experience for the target user.

## Consequences

- **Positive:** the compliance story is a paragraph; the backend is tiny; the
  privacy posture is a feature teachers and parents will trust.
- **Cost:** custom auth is a bit more code than Firebase's built-in email/password;
  a lost save code = lost cloud progress (mitigated by local save + prominent
  display + parent copy).
- **Follow-ups:** Firestore save schema + security rules; the custom-auth Cloud
  Function; the privacy notice page; a brief privacy-lawyer review before wide
  distribution.
