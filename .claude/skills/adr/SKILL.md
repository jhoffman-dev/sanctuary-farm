---
name: adr
description: How and when to record an Architecture Decision Record for Sanctuary Farm. Use whenever a choice would be expensive to reverse or would puzzle a future reader — stack, data model, auth, asset pipeline, hosting, a hard trade-off.
---

# Writing an ADR

An ADR captures **one decision**, the forces behind it, and what it costs — so
nobody re-litigates it later without new information.

## When to write one

- A choice that's expensive to undo (stack, framework, data model, hosting, auth).
- A trade-off where the rejected option was reasonable.
- Anything a new agent would otherwise ask "why is it done this way?"

Not for: routine implementation, anything already covered by `CLAUDE.md` or
`docs/architecture.md`, reversible local choices.

## How

1. Copy `docs/adr/template.md` to `docs/adr/NNNN-short-slug.md` — `NNNN` is the
   next number (`ls docs/adr`).
2. Fill every section. Keep **Context** factual (the forces, not the conclusion).
   List real **Alternatives** with why each lost. **Consequences** must include
   the downsides and any new follow-up work.
3. Status starts `Proposed`. A human (Jonathan) moves it to `Accepted`.
4. Link it from the relevant ticket and from `CLAUDE.md` / `docs/` if it changes
   a rule.
5. Superseding a past ADR: set the old one's Status to `Superseded by NNNN` —
   never edit its decision.

Spike tickets end here: the spike's findings ARE an ADR (or a note in
`docs/decisions/`).
