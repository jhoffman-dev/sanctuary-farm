# Petting zoo rules (SF-110)

The rules half of the petting zoo by the pond: which animals visit, and the
move between the barn and the zoo, as pure GDScript in `game/domain/zoo/` with
the use-cases on `FarmGame`. The zoo scene binds to the read-model below; it
decides nothing. Every number here is a constant in one place.

Prototype sources are in git history before the rebuild commit `db9c208`
(`git show db9c208^:src/game/screens/PettingZooScreen.tsx`, `src/game/gameState.tsx`,
`src/contracts/creature.ts`, `src/save/store.ts`).

## The rules and where they come from

| Rule | Value | Where in code | Source |
| --- | --- | --- | --- |
| Two places | every animal lives in exactly one: `barn` or `zoo` | `Zoo.BARN`, `Zoo.ZOO`, each animal's `home` | prototype `contracts/creature.ts:37` (`CreatureHome = 'barn' \| 'zoo'`); redesign-notes.md:36 |
| Where animals start | in the barn — the day-one cow, pig and chick, and every hatchling | `Barn.new_animal` | prototype `save/store.ts:135` (missing home → `'barn'`) |
| Who may move | any animal the farm owns, starting or hatched, in either direction | `Zoo.check_move` | prototype `PettingZooScreen.tsx` (every barn animal listed under "Bring an animal from the barn"; every visitor has "send to the barn") |
| How many visit | **12** — every animal a farm can own (one per species). The prototype had no limit | `Zoo.CAPACITY` | prototype `PettingZooScreen.tsx` (no cap); decision to keep a single tunable number |
| The barn always has room | a visitor can always go home, even from a full zoo | `Zoo.check_move` | follows from the prototype (no barn cap) |
| The barn may stand empty | every animal may visit at once | `Zoo.check_move` | prototype (no rule against it) |
| Gentle refusals | `Barn.UNKNOWN_ANIMAL`, `Zoo.ALREADY_THERE` ("it's already here"), `Zoo.ZOO_FULL` ("bring someone back first"), `Zoo.UNKNOWN_HOME`; a refusal writes nothing | `Zoo.check_move`, `Zoo.move` | ticket; CLAUDE.md rule 6 |
| Moving is free | no coins, no feed, no question asked — it is play, not progress | `Zoo.move`, `FarmGame._move` | prototype `gameState.tsx:306-314` (`moveAnimal` only sets `home`); CLAUDE.md rule 2 |
| Moving is not "play" for the clock | it never starts or extends the session, like buying feed | `FarmGame._move` (no `play_session` write) | session.md (only rounds count as play) |
| Care follows the animal | a visitor still has its four daily tasks, is cared for with the same rounds, health and feed, and decays the same — capped, never below the glum floor | `Barn` (unchanged; ignores `home`) | prototype `PettingZooScreen.tsx` ("needs care →" opens the stall; health bar shown); `gameState.tsx:278-280` (care from the zoo returns to the zoo) |
| Visitors earn nothing | the zoo pays no coins and grows no egg | — | CLAUDE.md rule 2 (coins only in the paddock and nest) |
| Hatched stays hatched | an animal visiting the zoo still counts as hatched; its egg never comes back | `Nest` (reads every animal, wherever it lives) | decision |
| Barn shows its own | `barn().animals` lists only the animals at home; `all_done_today` still counts every animal's chores | `BarnSummary.of` | prototype `BarnScreen.tsx:9` (filters out `home === 'zoo'`) |
| While a round runs | no animal moves (`FarmGame.ROUND_IS_ACTIVE`) — the round's screen is in front of the farm, and the animal being cared for stays where its care began | `FarmGame._zoo_closed_because` | decision (as `hatch`) |
| After goodnight | the zoo settles down: moves refused with `PlaySession.GOODNIGHT`; visitors stay the night | `FarmGame._zoo_closed_because` | session.md (the feed shed shuts after goodnight: "the farm settles down") |

## What the scene binds to

- `FarmGame.zoo() -> Result` → `ZooSummary`:
  - `visitors: Array[ZooAnimal]`, `in_barn: Array[ZooAnimal]` — farm order.
  - `capacity`, `places_left`, `is_full`.
  - `closed_because` — `""`, `PlaySession.GOODNIGHT` or `FarmGame.ROUND_IS_ACTIVE`.
- `ZooAnimal`: `animal` (an `AnimalSummary`: id, species, `home`, health, band,
  tasks due), `can_move`, `why_not` (empty, or one of the refusals above).
- `await FarmGame.move_to_zoo(animal_id)` / `await FarmGame.move_to_barn(animal_id)`
  → the new `ZooSummary`. Serialised with the other persisting calls; the
  game moves only once the save has landed.
- Care from the zoo is the barn's: `start_care(animal_id, task)` works for a visitor.

## Save

Each animal record gains `"home": "barn" | "zoo"`. The schema stays **v4**: a
v4 save written before the zoo has no `home` and loads with every animal in the
barn (the same additive pattern as `play_session`). The codec rejects a home
that is neither, and more visitors than `Zoo.CAPACITY`. A single field per
animal means no animal can be in both places and there is no separate id list
to hold unknown ids. With one animal per species and a capacity of 12, the
capacity check cannot fire today; it starts guarding once the capacity is
tuned down.

## Open tuning questions for James

1. **Capacity.** The prototype had no limit, so it is 12 (every animal). Should
   the pen hold fewer — say 4 to 6 — so choosing who visits is a real choice?
   One constant: `Zoo.CAPACITY`.
2. **Empty barn.** May every animal leave the barn at once (prototype: yes),
   or should one always stay home?
3. **Goodnight.** The zoo closes with the feed shed. Keep moving open after
   goodnight instead, since it is calm play that changes no progress?
4. **Does the zoo do anything?** In the prototype it is display only; visitors
   earn nothing. The PRD lists "visitors" as post-alpha — anything for alpha?
