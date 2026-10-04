---
name: write-ticket
description: How to write a ticket for Sanctuary Farm — Epic / Story / Task / Bug. Small, discrete, clear (not verbose), with acceptance criteria where they apply. Use whenever creating or refining a board item.
---

# Writing a ticket

## Shape

**Small and discrete.** One outcome. If it needs "and" in the title, it's two
tickets. Target: a dev agent finishes it in well under half a day.

**Clear, not verbose.** Enough context to start cold; no essays. If you're
writing more than ~8–12 lines of description, either it's an Epic or it should be
split.

## Types

| Type | Is | Parent |
| --- | --- | --- |
| **Epic** | a phase or a large feature area | — |
| **Story** | a user-visible slice of an Epic | Epic |
| **Task** | a technical step (may not be user-visible) | Story or Epic |
| **Bug** | something that regressed or never worked | Epic (area) |

## Template

```
Title: <verb + object, specific>   e.g. "Extract @sf/domain scheduler as a pure package"

Context: 1–3 sentences. Why now, what it unblocks, any pointer
(file, ADR, doc).

Outcome: what is true when this is done.

Acceptance criteria:   (bullet list; omit if a chore with an obvious done-state)
- [ ] …
- [ ] tests: <what must be covered>
- [ ] gate green (typecheck / lint / test / build)

Assignee: unassigned  (agent-doable)   OR   jhoffman-dev  (needs James — say why)

Size: XS / S / M    (M → consider splitting)
```

## Rules

- Every ticket that changes behaviour lists the **tests** as an AC line.
- If a human must do it (interactive auth, an account, a purchase, a
  product/legal call, a physical device test), assign **James** (`jhoffman-dev`) and give the
  exact steps.
- A spike is a real ticket: timebox it, and its AC is "findings written to
  `docs/adr/NNNN-*.md` or `docs/decisions/*.md`".
- Link the Epic (as a GitHub sub-issue). Link related ADRs.
- Don't restate `CLAUDE.md` in the ticket — reference it.

## Then

A ticket is a **GitHub issue** titled `[SF-n] <title>`. Create it with the
`github-board` skill: milestone = its phase, labels for type / priority / size,
sub-issue of its Epic, added to the "Sanctuary Farm Project" with Status =
`Backlog` (or `Ready` if it's unblocked and next).
