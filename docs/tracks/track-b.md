# Track B — Quiz loop and number pad

**Branch:** `track/b-quiz`
**Owns:** `src/quiz/QuizPanel.tsx`, `src/quiz/NumberPad.tsx`, `src/quiz/FeedbackOverlay.tsx`,
`src/quiz/*.test.tsx`, `src/dev/routes/quiz.route.tsx`.
**Never touch:** `src/contracts/**`, `src/engine/**`, any other track's directory.
**Depends on:** Phase 0 stubs of `Scheduler` (`@/engine/scheduler`), `CreatureSVG`
(`@/creatures/CreatureSVG`), `AudioBus` (`@/audio/sounds`). Use them by their stubs — do not
implement them.

`QuizPanel` is self-contained: takes a `Scheduler` + `QuizMode`, runs the questions, calls
`onComplete(SessionLog)`. It knows nothing about the world or the barn. It is embedded by
the stall screen and the paddock.

## Requirements

### Number pad, never multiple choice

- Large tappable buttons: 0–9, backspace, a big confirm. `NumberPadProps` from `@/contracts`.
- Physical keyboard as a parallel path (digits, Backspace, Enter).
- **No auto-submit.** She confirms. Confirm on an empty field does nothing.
- Typed digits shown large. `maxLength` 3 (144 is the largest answer).

### Latency measurement (D7 — get this exactly right)

- Start the timer on the question entrance animation's `onAnimationComplete` (not mount).
- Single-digit correct answer (answer ≤ 9): stop on the **first digit** entered.
- Multi-digit correct answer: stop on **confirm**.
- Pass the measured ms to `scheduler.grade(factId, given, latencyMs)`.

### Flow

For `mode.kind === 'count'`: run `mode.questions` questions. For `'timed'`: run until
`mode.durationMs` elapses (paddock). Call `scheduler.next()` for each question, `grade()` on
answer, accumulate `SessionEntry[]`, then `onComplete` with a `SessionLog` (`context` +
`familyContext` from props, `startedAt`/`endedAt` epoch ms).

Fire `onQuestionGraded(result)` after each grade and `onMood(mood)` to drive the creature:
`eating` while chewing a correct answer, `happy` on `FLUENT`, `puzzled` on `WRONG`, `idle`
between.

### Wrong answer (no shame)

Creature looks **puzzled — not sad**. Then `FeedbackOverlay`:
1. Show the fact plainly: `7 × 8 = 56`.
2. A dot-array (rows × cols) or skip-count strip for one beat.
3. She types the correct answer once to continue — this path **cannot be skipped** by
   tapping through (confirm must equal the answer).
4. No visible streak reset, no life lost. (The engine already re-queues it ~3 questions
   later via box-1 reset — Track B does nothing extra there.)

### Audio

Call `audioBus.play(...)`: `tap` on keypress, `correct`/`fluent` on right answers, `wrong`
on wrong, `chew` during eating. Get the bus from `createAudioBus()` (stub is a no-op — fine).

## Acceptance tests (`src/quiz/*.test.tsx`) — all must pass

- A full run completes with keyboard only, and with pointer/touch only (`@testing-library/user-event`).
- Backspace works; confirm on an empty field does nothing.
- Reported latency for a scripted ~2000 ms answer is within 2000 ± 150 ms (fake timers).
- The wrong-answer path cannot be dismissed without entering the correct answer.
- `onComplete` fires exactly once, after the right number of questions, with a well-formed
  `SessionLog`.
- Single-digit answers stop the timer on first digit; multi-digit on confirm.

## Dev route

`#/dev/quiz`: the real `QuizPanel` against `createScheduler(initialSchedulerState())`, no
farm, no barn. Show the reported latency for each answer so it can be eyeballed for
calibration. Restart on completion.

## DoD

typecheck / lint / test / build green; dev route works; only Track B files touched; `// STUB`
headers gone from the three components.
