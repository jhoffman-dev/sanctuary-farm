---
name: notion-docs
description: Mirror the repo's markdown docs (PRD, plan, architecture, ADRs, etc.) to Notion pages. Notion is where these are read; the markdown is authored via PR and pushed here. Use after merging a change to any doc in the manifest.
---

# Docs → Notion

**Notion is the canonical place to read the docs.** The markdown in `docs/` is
the authoring surface — changed via PR like code — and this sync pushes each
merge to its Notion page. There is no pull: if someone edits directly in Notion,
that wins until the next authored change, so prefer editing the markdown.

`CLAUDE.md` is the exception — it stays repo-only (it's the agent entry point).

## What's mirrored

`scripts/notion/docs-manifest.json` — the list of `{ file, title, pageId }`.
`pageId` is filled in on first push and committed. Add a doc by adding a row
(pageId `null`).

## Run it

```
node scripts/notion/sync-docs.mjs                 # all docs in the manifest
node scripts/notion/sync-docs.mjs docs/PRD.md     # just this one (after editing it)
node scripts/notion/sync-docs.mjs --index         # only rebuild docs/README.md
```

Needs `.claude/notion.local.json` with `token` and `docsRootPageId` (a Notion
page shared with the integration, under which the doc pages live). See
`docs/board.md` §Setup.

After a run: commit the updated `docs-manifest.json` (new page ids) and
`docs/README.md` (the link index).

## When to run

- You merged a PR that changed a doc in the manifest → sync that file.
- You added a new doc → add it to the manifest, then sync.
- The converter (`mdToBlocks` in `scripts/notion/lib.mjs`) covers headings,
  lists, code, quotes, tables, and inline formatting. Nested list items are
  flattened. If a doc renders badly in Notion, fix the converter — don't
  hand-edit the Notion page.
