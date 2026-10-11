# Cloud save — Firestore schema and rules

How a farm is stored in the cloud, and why a child can reach only their own.
Implements the schema half of ADR-0002 (SF-114, #162). The rules are
`firestore.rules`; their tests are `firestore/rules.test.ts` (`pnpm test:rules`).
Companions: `threat-model.md` rows 3–6 and 13, `privacy.md`,
`firestore-backup.md`, `deploy.md`.

Everything here lives in the **named database `sanctuary-farm`** of the shared
`student-games-be188` project — never `(default)` (`deploy.md`).

## 1. Collections

| Path | Who can touch it | Holds |
| --- | --- | --- |
| `saves/{uid}` | The owner, through the client SDK (get, create, update) | One farm |
| `saveCodes/{codeHash}` | The custom-auth function only (Admin SDK) | Hash of a save code → `uid` |
| `usernames/{username}` | The custom-auth function only | Generated username → `uid`, PIN hash, failure counter / lockout |
| `deletions/{eventId}` | The delete and purge functions only | `uid` + timestamp of each deletion, for backup replay |

Only `saves` is specified in full here. The three server-only collections are
named so the rules can deny them explicitly; their fields are #161's to define,
within the rule below that none of them holds anything about a child.

### `saves/{uid}`

`uid` is the Firebase Auth uid minted by the custom-auth function (#161): a
random, opaque id. It is not the save code, not the username, and not derived
from either, so knowing a document id grants nothing and reveals nothing.

| Field | Type | Rule |
| --- | --- | --- |
| `schemaVersion` | int | In the supported set — today `[4]`, the Godot save codec's `FarmSave.SCHEMA_VERSION` |
| `updatedAt` | timestamp | Must equal `request.time`: the client sends `serverTimestamp()`, never its own clock |
| `save` | string | The save codec's JSON (`FarmSaveCodec`), 1 … 524 288 characters |

Exactly those three fields — no more, no fewer. There is no field for a name,
age, email, school, location, photo or free text, and the rules refuse any
field that is not in the list, so one cannot be added by a client.

**Why the farm is one JSON string, not a Firestore map.**

- *A real size bound.* Rules cannot walk a nested map, so with a map only the
  top level could be checked and any nested string could still run to ~1 MiB.
  One `save.size() <= 524288` bounds the whole document.
- *One validator.* The save codec already rejects every malformed field and
  out-of-range number on load, and it must anyway: a client could write
  anything the rules allow. Repeating a partial copy of it in rules would drift
  as the game adds fields (v4 added `animals` and `play_session` while this was
  written).
- *No type drift.* Firestore would store `1834.0` and `1834` as different types;
  the codec has rules about whole numbers. A string round-trips exactly.
- *Godot-friendly.* There is no official Godot Firestore SDK; whether the client
  goes through the JS SDK or the REST API, one string field is trivial to send.

`schemaVersion` duplicates the `schema_version` inside the JSON so the rules can
refuse a version the game cannot load. The codec checks the two agree on load.

**Indexing.** `firestore.indexes.json` exempts `saves.save` from single-field
indexing — nothing ever queries it, and a 500 KB string should not cost index
writes. `updatedAt` stays indexed for the 12-month inactivity purge
(`threat-model.md` row 13), which queries `updatedAt < cutoff` from a function.
No composite index is needed.

**Size budget.** A v4 save with a full 12×12 table, 20 animals and no session
logs is ~31 KB; each session log adds ~3.4 KB (30 questions). The cap is half
Firestore's 1 MiB document limit, so ~145 sessions fit. The codec keeps
`sessions` unbounded today, so a child who plays daily would reach the cap in
about five months: the cloud sync (#163) must send a trimmed session log, or the
game must cap it. Until then a too-large write is refused and the local save is
untouched.

## 2. Where the credentials live

**Server-only, never in a document a client can read.** The save code, the
generated username and the PIN are verified by the custom-auth function, which
reads `saveCodes` / `usernames` with the Admin SDK and returns a custom token
for the farm's `uid`. The rules deny those collections to every client, signed
in or not. A client only ever holds a token, and the token opens only
`saves/{its uid}`.

Save codes and PINs are stored as hashes (`privacy.md`), so an Admin read or a
leaked backup does not hand out working save codes. (A 4-digit PIN hash is
guessable offline; the PIN is a convenience on top of the save code, not the
root credential — `threat-model.md` row 4.) Keeping them out of `saves`
means a child reading their own save never sees a credential either — so a
save can be shown or exported without leaking how to log in.

## 3. The rules

```
saves/{uid}
  get            owner only
  create, update owner only, and the document is a valid save (§1)
  list, delete   nobody
saveCodes, usernames, deletions   nobody (functions use the Admin SDK)
everything else                   nobody
```

**Owner** means: signed in, the token's `game` claim is `sanctuary-farm`, and
`request.auth.uid == uid`. The claim matters because Firebase Auth is
project-wide and the project is shared with other games: without it, anyone
signed in to another game (or anonymously) could create a farm in our database.
Only the Admin SDK can set a custom claim, so #161's function must mint tokens
with `createCustomToken(uid, { game: 'sanctuary-farm' })`. An anonymous
first-run session (ADR-0002) has no claim and so plays locally until "Save to
the cloud" runs the function.

**No list.** A client fetches its farm by id; it never needs a query, so
`saves` cannot be enumerated even by a signed-in player.

**No client delete.** "Delete my farm" (`privacy.md`) needs the save code, must
also remove the code hash, username and PIN hash (which the client cannot
touch), and must write a `deletions` entry so a restore re-applies it
(`firestore-backup.md` §4). Only a function can do all three atomically, so the
client is denied. A child who wants a fresh farm overwrites their save, which
the rules allow.

**Server time only.** `updatedAt == request.time` means a client cannot
backdate a save to dodge the inactivity purge or post-date it to win a sync
conflict. A partial `update` that leaves the old `updatedAt` is refused, so
every write is a whole save.

**Not here, on purpose.** Visiting a friend's farm (Phase 6) is a function
returning a read-model, not a rule (`threat-model.md` row 6). Rate limiting PIN
guesses lives in the function (row 4). Write throttling is not in the rules;
see open questions.

## 4. Tests

`firestore/rules.test.ts`, on the emulator with project `demo-sanctuary-farm`
(against the emulator's default database — `firestore/README.md` explains why):
owner create / read / overwrite, a save at exactly the cap; another player's
read, write and create, unauthenticated read and write, a token without our
claim or with another game's, listing (owner and anonymous), owner delete — all
denied; oversized, empty, map-instead-of-string, extra-field, missing-field,
unsupported versions (3, 5, 0, `"4"`, 4.5), client-chosen and non-timestamp
`updatedAt`, a partial update, an added field on update — all denied; read,
write and list of each server-only collection denied; unmentioned paths and a
subcollection under your own save denied.

## 5. Open questions

- **Session log growth** (§1 size budget): trim on sync (#163), or cap in the
  domain?
- **Write throttling:** add `request.time > resource.data.updatedAt +
  duration.value(5, 's')` to bound the cost of a buggy sync loop, once #163's
  sync cadence is known?
- **Parent-initiated delete:** the function path above needs the save code. Is
  that enough for a parent who has lost it but still has the device signed in?
