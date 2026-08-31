# Sanctuary Farm — Product Requirements

> Living document. Change it as the product changes; note big shifts in an ADR.

## 1. One line

A cosy 2.5D farm game that teaches math fluency — kids think they're raising
animals; they're actually practising until recall is instant.

## 2. Why

Timed, mixed multiplication practice with immediate feedback is one of the most
effective ways to build fact fluency, and almost no kid will do it as flashcards.
Wrap it in a farm they want to come back to and the practice happens on its own.

## 3. Who it's for

- **Primary:** kids ~7–11 building multiplication fluency (expandable to other
  topics later).
- **Secondary:** parents who want screen time that isn't junk; teachers who want
  a free tool to point a class at.

## 4. Principles (do not compromise)

1. **Free forever. No ads. No purchases.** Cost must never be a barrier.
2. **No PII.** Never collect a name, age, email, location. (See ADR-0002.)
3. **Reachable by any kid on any device via a link** — Chromebook, old iPad,
   library PC. No install required.
4. **Math advances; exploration reveals.** Every point of progress comes from a
   graded answer. No idle income, no paying minigames.
5. **Latency drives mastery.** A correct-but-slow answer was computed, not
   recalled. Speed is the signal.
6. **Sessions end on time.** The game says goodnight; it never begs for one more.
7. **No punishment framing.** Animals get glum when neglected but never starve,
   sicken, or leave.
8. **Accessible.** Readable fonts, colour-blind-safe, keyboard playable, respects
   reduced-motion.

## 5. Core loop

```
Do a care task / a paddock round / help an egg  →  answer mixed facts, fast
        ↓                                                   ↓
the farm reacts (trough fills, egg cracks, coins in the paddock)
        ↓
the spaced-repetition engine schedules what you see next
        ↓
come back tomorrow — a little further along
```

## 6. Feature areas

| Area | Alpha | Later |
| --- | --- | --- |
| Farm world (walkable, hotspots) | 3D, one farm | expandable land, decoration |
| Animals + daily care (feed/water/clean/play) | ✓ | more tasks, personalities |
| Health / mood | ✓ | — |
| Multiplication engine (Leitner + latency + interleave + tiers) | ✓ | — |
| Nest / eggs — hatch a family by mastering it, tap to practise | ✓ | — |
| Paddock — 60s speed round, earns coins | ✓ | leaderboard vs. your own best |
| Feed shed — buy feed with coins | ✓ | more supplies |
| Training ring — see a fact broken down (area model, ×10, doubling, squares) | ✓ | more strategies, per-topic |
| Petting zoo by the pond — move animals to display | ✓ | visitors |
| Cloud save (no PII) | thin | robust, cross-device |
| Character creator | — | swappable parts, Roblox-style |
| Fantasy animals (dragons, unicorns) | — | ✓ |
| Async multiplayer — visit a friend's farm by code | — | ✓ |
| Math expansions — factors, then more | — | ✓ (curriculum as data) |

## 7. Alpha — definition

The smallest build worth daily play and real feedback from one 10-year-old:

- 3D farm, keeper with a real walk cycle, tap-to-move.
- ~3 animals, the feed/water/clean/play loop with the reactive care scenes.
- The full multiplication scheduler (unchanged from the prototype logic).
- Nest + eggs + hatch; paddock; training ring; feed shed; petting zoo.
- HUD: coins, feed, per-animal health.
- Save persistence (local is fine for alpha; cloud save can follow).
- Runs acceptably on the oldest device we commit to (name it — e.g. a 2019 iPad
  / a low-end Chromebook).

**Explicitly out of alpha:** character creator, fantasy animals, multiplayer,
other math topics, land expansion, accounts.

## 8. Success signals

Not downloads. In priority order:

1. **Latency distribution on the hard-core set** (7×8, 6×8, …) trends down over
   weeks of play — the game is actually teaching.
2. **Return rate** — she opens it again tomorrow without being told to.
3. **Unprompted "can I play the farm game"** from her, then from other kids.
4. A teacher tries it with students and sends feedback.

## 9. Non-goals

- A curriculum-standards compliance product / gradebook integration (maybe far
  later; not now).
- Real-time multiplayer.
- Anything that monetises.
- Anything that needs an app store to reach a kid.
