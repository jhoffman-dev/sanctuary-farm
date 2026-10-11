# Sound design

Ticket SF-53. How Sanctuary Farm sounds, why, and the rules for adding to it.
Applies PRD §4 principles 5–8 and `accessibility.md` §2 to audio. Code lives in
`packages/audio` (adapter) and `packages/application/src/sounds.ts` (what plays).

## 1. Principles

- **Sound rewards and reassures; it never punishes.** A wrong answer gets a
  sigh, not a buzzer. Nothing in the mix says "you failed".
- **Sound is never the only channel.** Every cued event has a visible
  counterpart on the same frame; the game is fully playable muted
  (`accessibility.md` §2). Most school devices are muted.
- **Sound never nags.** No tick, no countdown, no "hurry" cue. The goodnight
  is one calm chime, announced once (PRD 6, `accessibility.md` §2 timing row).
- **Silence is a valid state.** A missing device, a blocked `AudioContext`, or
  a muted player is not an error path; the bus is best-effort and never throws.

## 2. Synth vs sampled

**Now:** every sound is a short stack of enveloped Web Audio oscillator voices
(`recipes.ts`, ~50 lines; `web-audio-bus.ts`, ~90). Zero assets, zero download,
deterministic on every device, and testable by injecting a fake `AudioContext`.
Its limits: sine/triangle stacks cannot do voices, texture, or a believable
outdoor bed. A synth sheep is a cartoon; a synth breeze is a hiss.

**When samples earn their place:** animal voices (bleat, cluck, low) and the
ambient bed (§4). Rule for adding any sample: short (voices ≤ 1 s, bed ≤ 20 s
seamless loop), compressed (Opus/AAC, mono, 22 kHz), decoded size counted
against `performance-budget.md`, fetched lazily after first paint,
and one coherent set from a single source or author — no mixed-library zoo.

**Decision:** synth stays for feedback and UI forever. Samples only for animals
and ambience, Phase 3+ ("Audio pass" in `implementation-plan.md`).

## 3. Feedback sounds

Envelope for every voice: 15 ms attack to peak, exponential decay to silence,
50 ms release tail. The outcome sounds share C-major (C5 E5 G5 …) so they blend; the world sounds are untuned low thuds.

| Name | When | Character | Current recipe |
| --- | --- | --- | --- |
| `correct` | `SLOW` / `LABORED` outcome | Two-note rising chime; warm, brief | C5 → E5 sine, 0.14 + 0.18 s |
| `fluent` | `FLUENT` outcome | Deliberately the richest: the game's core signal is speed, so *fast* must sound plainly better than *right* | `correct` + G5, plus two shimmering triangle overtones (G6, C7); ~0.55 s total |
| `wrong` | `WRONG` outcome | Soft downward sigh. Low, neutral, no attack. Never a buzzer — a buzzer is punishment framing (PRD 7) and makes a kid flinch before the next fact | E♭4 sine gliding to C4, 0.34 s, peak 0.10 |
| `hatch` | family just mastered, on top of the outcome sound | Ascending four-note fanfare; the one moment allowed to feel big | C5 E5 G5 C6, 0.12 s each, longer last note |
| `tap` | pad key press (recipe exists, not yet wired) | Tiny click; confirms input, nothing more | 660 Hz triangle, 0.05 s |
| `footstep` | walking in the world (not yet wired) | Dull low thud | 120 → 80 Hz sine, 0.07 s |
| `doorOpen` | entering a building (not yet wired) | Low creak-glide | 220 → 110 Hz triangle, 0.3 s |
| `chew` | animal eats from the trough (not yet wired) | Two soft low chews | 90 + 84 Hz triangle, 0.04 s each |

Planned, same idiom (synth, ≤ 0.5 s, character note in `recipes.ts`):

| Name | When | Intended character |
| --- | --- | --- |
| `goodnight` | session end announced | One slow, low, resolving chime (G4 → C4). Calm. Plays once. Never repeats |
| `coin` | coin earned in paddock / nest | Single bright ping above `correct`, so it stacks cleanly on it |
| `purchase` | feed-shed buy | Short two-note "settled" figure (E5 → C5); the inverse of `correct` |

`fluent` (~0.55 s) and `hatch` (~0.56 s) are the longest feedback sounds; nothing new may exceed them.

## 4. Ambient bed

A very quiet farm loop: wind, a few birds, distant animals. Sampled, one
seamless loop ≤ 20 s with a slow randomised start offset so it never sounds
like a loop. Plays only in the world; it fades out (≤ 500 ms) when a practice
round starts and back in after the summary, so the pad is a quiet place and
feedback is never competing with a rooster. Ducked a further 6 dB while any
feedback sound plays.

Loudness targets: feedback peaks around −12 dBFS, ambience around −30 dBFS,
animal voices around −18 dBFS. Master never above −6 dBFS. Phase 3+.

## 5. Mute by default?

Arguments for muting by default: classrooms and libraries, shared devices, and
the fact that a browser will not play anything before a gesture anyway.
Arguments against: `fluent` is the fastest, clearest signal the game has that
speed matters, and a kid who never hears it learns the rule more slowly; a
muted-by-default game reads as broken on a home tablet.

**Decision: sound is on by default, but nothing plays until the first tap.**
The bus already creates its `AudioContext` lazily on the first un-muted play,
so the browser gesture rule is satisfied for free. The HUD carries a visible,
always-reachable mute toggle (`apps/web/src/hud/Hud.tsx`, `aria-pressed`,
labelled "Sound on/off"); the setting persists in the save via
`farmGame.setMuted` and is restored on load. Respect the platform silent state
where detectable (an `AudioContext` that stays `suspended` after resume, or a
`play()` that throws): stay silent, do not prompt, do not flip the saved
setting. A device that is muted at the OS level is the OS's decision.

### 5a. The Godot client (SF-97)

Godot's web export has no procedural audio (ADR-0006), so the Godot client
plays files: `game/tools/render_sounds.mjs` loads the real `recipes.ts` and
`web-audio-bus.ts` into headless Chromium, plays each recipe into an
`OfflineAudioContext`, and writes `game/assets/audio/<id>.ogg` (44.1 kHz mono
Vorbis q6, reproducible byte for byte) plus `manifest.json`. A render stops
when the last envelope reaches silence, so the files are exactly the lengths in
§3 (`fluent` 0.55 s, `hatch` 0.56 s); a GUT test holds every file to §6's
limits. Change a recipe → rerun the script and commit the OGGs.

`GodotAudioBus` plays them from a pool of 8 players on the "SFX" bus. Mute is
the same saved setting as above (`FarmSave.settings.muted`, via
`FarmAudio.toggle_mute` → `FarmGame.set_muted`), not a separate settings file:
it is per farm like every other choice, travels with the save, and needs no
second file to keep in step. The bus goes quiet at once; a refused save leaves
this visit muted and only the next load forgets it. The HUD's toggle is a plain
button ("Sound: on/off", accessible name "Sound on/off", Tab-reachable).

## 6. Rules for implementers

- Every sound goes through the `AudioBus` port. Presentation never touches
  `@sf/audio` internals or a Web Audio API.
- **The application layer decides what plays**; the UI only forwards events.
  `sounds.ts` is the single map from outcome to sound. A component calling
  `play('fluent')` is in the wrong layer.
- Every new `SoundName` gets a recipe in `recipes.ts` with a one-line
  character note (why it sounds the way it does), and is added to the table
  above.
- Test with `recordingAudioBus()` (`test-fakes.ts`) at the application layer
  and with the injected fake `AudioContext` in `web-audio-bus.test.ts`.
- Feedback sounds ≤ 0.6 s (`fluent` and `hatch` are the ceiling). World sounds ≤ 1 s. Only the bed loops.
- Never more than 8 voices sounding at once, and never the same name twice
  within 50 ms; a rapid-fire pad must not turn `tap` into a drone.
- Reduced motion does not imply reduced sound, but the two are tuned to match:
  no sound may cue a motion the reduced-motion path has removed.

## 7. Open questions

- Should `SLOW` and `LABORED` share `correct`, or should `LABORED` be a single
  note so the tiers are audible as a ladder? Needs playtesting with kids.
- Does `hatch` on top of `fluent` exceed comfortable loudness on small tablet
  speakers? Measure once the Phase 3 device matrix exists.
- Who authors the animal and ambience set, and under what licence? Tie to the
  art-pack decision in `art-direction.md`.
- Per-child volume, or only mute? Mute-only is simpler and enough until a
  parent asks.
