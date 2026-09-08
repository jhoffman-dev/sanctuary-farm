# Accessibility standard

PRD principle 8 and `CLAUDE.md` design rule 8, made testable. **WCAG 2.2 AA is
the floor**; the game-specific rules below tighten it. A ticket that touches
the HUD, the pad, the scene, or any feedback state is not done until the QA
checklist at the bottom passes.

## 1. The standard

WCAG 2.2 Level AA, all of it. These criteria carry most of the risk for a
timed, 3D, colour-heavy kids' game and get checked on every UI ticket:

| SC | Name | What it means here |
| --- | --- | --- |
| 1.4.1 | Use of colour | Right/wrong/fluent, feed level, egg state — never colour alone |
| 1.4.3 | Contrast (minimum) | Text ≥ 4.5:1 (large text ≥ 3:1) against its actual background, including over the 3D canvas |
| 1.4.11 | Non-text contrast | HUD icons, pad borders, focus rings, meters ≥ 3:1 |
| 2.1.1 | Keyboard | Whole day-one loop playable with keyboard only; the canvas never traps or steals focus |
| 2.2.1 | Timing adjustable | See below — the timer measures, it never gates |
| 2.3.3 | Animation from interactions | Motion triggered by an answer/tap is off or replaced under reduced motion |
| 2.5.8 | Target size (minimum) | Every tappable thing ≥ 24×24 CSS px; we require 56×56 for the pad and 44×44 elsewhere |

**How a timed paddock round complies with 2.2.1.** Latency is a mastery
*signal*, never a *gate*: a slow answer is still graded, still counts, and
still moves the round on — nothing is lost when the clock runs. The care loop
and the nest have no timer at all, so every reward path exists without one.
The one hard time limit — the session ending — is an *essential* limit by
design (PRD 6) and is exempt; it is also never surprising (see §2, timing).

## 2. Game-specific rules

Each rule: a bound QA can measure, and why it exists.

| Rule | Bound | Why |
| --- | --- | --- |
| **Number pad only** | Answers are typed on a 0–9 pad; a screen or component that offers a list of candidate answers fails review | Recognition is not recall; the whole learning model depends on producing the number |
| **Feedback is text or icon, never colour alone** | Every outcome (`FLUENT` / `SLOW` / `LABORED` / `WRONG`) renders a glyph **and** words; every meter has a numeric or text label | 1.4.1; ~8% of boys are colour-blind — many of the target players |
| **Colour-blind-safe palette** | No state distinguished by red↔green, green↔brown, blue↔purple, or amber↔green alone. Text ≥ 4.5:1; HUD icons, borders, meters, focus rings ≥ 3:1 | 1.4.3 / 1.4.11; the farm palette is green- and amber-heavy, so the risky pairs are the default ones |
| **Keyboard-playable end to end** | Digits, `Backspace`, `Enter` answer without focusing the pad; `Tab` order follows visual order; focus ring ≥ 3px and ≥ 3:1; the canvas is `tabindex="-1"` with no key handlers of its own | 2.1.1 / 2.4.7 / 2.4.11; Chromebooks and library PCs are keyboard-first |
| **Reduced motion honoured** | With `prefers-reduced-motion: reduce`: no camera sway, no idle bob, no confetti, no parallax; state transitions crossfade (≤ 200 ms) instead of bounce; *functional* animation (egg cracking, trough filling) stays but ≤ 600 ms | 2.3.3; vestibular triggers are common and a kid will not know to report them |
| **Minimum sizes** | Body ≥ 16px; the question ≥ 32px; pad keys ≥ 56×56 px with ≥ 8px gaps; HUD text ≥ 14px and every HUD number pairs an icon with an `aria-label` naming the quantity | 7-year-olds read slowly and tap imprecisely; a 4.5:1 ratio at 12px is still unreadable |
| **Readable small and zoomed** | Nothing clipped or overlapping at 360×640 CSS px, at 200% browser zoom, and at 1024×768; no horizontal scrolling | 1.4.4 / 1.4.10; old iPads and shared Chromebooks |
| **HUD labels and live regions** | Coins/feed/egg changes announced via `aria-live="polite"`; answer feedback via `role="status"`; the question via `aria-live="polite"`; no `aria-live="assertive"` anywhere except the goodnight screen | 4.1.3; a screen-reader user must hear that the trough filled without hunting for it |
| **Sound never the only channel** | Every sound-cued event has a visible counterpart on the same frame; the game is fully playable muted | 1.1.1; most school devices are muted |
| **Sessions end on time, without a hurry cue** | The goodnight is announced once, calmly, ≥ 60 s ahead; no countdown, no flashing clock, no ticking sound; the current question is always allowed to finish | 2.2.1 + PRD principle 6; urgency framing is the opposite of fluency |

## 3. The 3D world

The world is decoration. It reacts; it never instructs.

- **Everything the child must read or act on lives in the 2D DOM overlay** —
  questions, the pad, feedback, coins, feed, egg progress, goodnight. The
  canvas may *echo* these (trough fills, egg cracks) but never *own* them.
- **Hotspots have DOM equivalents.** Each clickable place in the world
  (paddock, trough, nest, ring, …) appears in a keyboard-reachable "Places"
  list in the overlay with a real `<button>`, in the same order every visit.
  Clicking a mesh and pressing that button do the same thing.
- **Camera motion caps:** sway ≤ 0.35 m amplitude, ≤ 0.15 rad/s; any camera
  move the game initiates ≤ 1.5 s and eased; **no** camera motion under
  reduced motion (`frameloop="demand"`). Never move the camera in response to
  an answer.
- **No flashing above 3 Hz**, anywhere, ever (2.3.1). The fluent-glow is a
  single fade, not a pulse.
- **Canvas focus:** `tabindex="-1"`, `aria-hidden="true"`, no `keydown`
  handlers; pointer-down on the canvas must not blur the pad.
- **WebGL failure** shows the same DOM overlay on a flat background; the
  game remains playable.

## 4. QA checklist

Run on a real browser at 1280×800, then 360×640. Copy into the verification
report and tick each line with evidence.

### Keyboard
- [ ] Boot → paddock round → goodnight completed with keyboard only, mouse unplugged (manual)
- [ ] Digits / `Backspace` / `Enter` answer a question with nothing focused (manual)
- [ ] `Tab` visits every control in visual order and never lands on the canvas (manual)
- [ ] Focus ring visible on every control and ≥ 3:1 against its surroundings (axe DevTools + eyeball)
- [ ] Clicking the 3D world then typing a digit still enters it in the pad (manual)
- [ ] Every world hotspot has a matching button in the Places list (manual)

### Contrast and colour
- [ ] axe DevTools: zero *serious* / *critical* issues on boot, mid-round, on feedback, at goodnight
- [ ] Lighthouse Accessibility ≥ 95 on boot and mid-round (Chrome DevTools)
- [ ] All text ≥ 4.5:1 and HUD icons/borders ≥ 3:1, measured over the canvas (axe colour picker)
- [ ] macOS Colour Filters → Deuteranopia, Protanopia, Tritanopia: each outcome and meter still distinguishable (manual)
- [ ] Greyscale filter: nothing loses meaning (macOS Colour Filters → Grayscale)

### Motion
- [ ] DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`: no camera sway, no idle animation, no confetti (manual)
- [ ] Under reduced motion, egg crack / trough fill still play, ≤ 600 ms (manual, stopwatch)
- [ ] No element flashes > 3 times per second in any state (manual)

### Size and zoom
- [ ] 360×640: no clipping, no overlap, no horizontal scroll (DevTools device toolbar)
- [ ] 200% browser zoom at 1280×800: same (Chrome `⌘+`)
- [ ] Pad keys measure ≥ 56×56 CSS px; all other controls ≥ 44×44 (DevTools element inspector)
- [ ] Body ≥ 16px, question ≥ 32px, HUD text ≥ 14px (computed styles)

### Screen reader
- [ ] VoiceOver + Safari: question, feedback, coin change, and goodnight are each announced once, unprompted (manual)
- [ ] NVDA + Chrome: same four announcements (manual)
- [ ] Every pad key, HUD figure, and Places button reads a meaningful name — no "button", no "🪙" (VoiceOver rotor / NVDA elements list)
- [ ] Canvas is skipped by the screen reader (VoiceOver rotor shows no canvas item)

### Timing
- [ ] A deliberately slow answer (> 10 s) is still graded and the round continues (manual)
- [ ] Care loop and nest complete with no timer visible or running (manual)
- [ ] Goodnight is signalled ≥ 60 s ahead, once, with no countdown, and lets the current question finish (manual, stopwatch)
- [ ] Game fully playable with system sound muted (manual)

## 5. Automated coverage

The e2e suite (`pnpm e2e`, `apps/web/e2e/`) should assert the following on every PR. Today only the "number pad" row exists in `smoke.spec.ts`; the rest are planned and tracked as Phase 3 work:

| Assertion | Status | How |
| --- | --- | --- |
| axe scan on boot and mid-round returns zero serious/critical violations | planned | `@axe-core/playwright`, `AxeBuilder(page).analyze()` filtered by `impact` |
| A paddock round completes with keyboard only | planned | `page.keyboard.type` digits + `Enter`; no `click()` on the pad |
| A reduced-motion run | planned | `page.emulateMedia({ reducedMotion: 'reduce' })`; assert camera position is fixed across two frames |
| The pad is a number pad, never a choice list | **present** | `smoke.spec.ts` |
| Feedback carries text for every outcome | planned | assert `[data-testid=feedback]` text is non-empty and `role="status"` |

Component tests (Vitest) cover the pad's key handling and the live-region
attributes; the e2e run is the source of truth for focus and contrast.

**Already in place in the shell** (`apps/web/src/practice/NumberPad.tsx`,
`PracticePanel.tsx`, `a11y/use-reduced-motion.ts`, `scene/FarmScene.tsx`):
text + icon feedback via `role="status"`; 56px (`min-h-14 min-w-14`) keys with
a 4px focus outline; document-level digit / `Backspace` / `Enter` handling so
the canvas can never intercept an answer; the question region `aria-live`;
camera sway and the continuous frameloop switched off under reduced motion.
Still open: HUD live regions for coins/feed, the Places list, the axe and
reduced-motion e2e assertions, and a measured contrast pass over the canvas.
