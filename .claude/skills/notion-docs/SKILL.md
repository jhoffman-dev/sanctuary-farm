---
name: notion-docs
description: Mirror the repo's markdown docs (PRD, plan, architecture, ADRs, etc.) to Notion pages. Notion is where these are read; the markdown is authored via PR and pushed here. Use after merging a change to any doc listed in docs/README.md.
---

# Docs → Notion

**Notion is the canonical place to read the docs.** The markdown in `docs/` is
the authoring surface — changed via PR like code — and after a merge you push the
change to its Notion page with the **Notion MCP connector**. There is no pull: if
someone edits directly in Notion, that wins until the next authored change, so
prefer editing the markdown.

`CLAUDE.md` is the exception — it stays repo-only (it's the agent entry point).

## Where the pages live

Docs home: **Sanctuary Farm — Docs**
<https://app.notion.com/p/3cd672aa2c4a814e8714e77635cc762a>

`docs/README.md` is the link index — `{ file → Notion page }` for every mirrored
doc. Keep it current when you add or move a page.

## Push a changed doc

1. `notion-fetch` the docs-home page (or `docs/README.md`) to get the target
   page URL for the file you changed.
2. `notion-update-page`, `command: "replace_content"`, `new_str:` the file's
   markdown **minus its top-level `# H1`** (the Notion page title carries that).
   Notion-flavored markdown renders headings, lists, code fences, block quotes,
   tables, and inline formatting directly.
3. Re-`notion-fetch` the page and eyeball tables / code / headings.

## Add a new doc

1. `notion-create-pages` with `parent: { page_id:
   "3cd672aa-2c4a-814e-8714-e77635cc762a" }`, `properties: { title: "..." }`,
   `content:` the markdown (minus the `# H1`).
2. Add a row to `docs/README.md` with the new page URL.
3. If the doc started as a `Ready` ticket ("write docs/X.md"), move that ticket
   to review/Done as usual.

## Not yet written

Several docs in `docs/README.md` are still `Ready` tickets, not files
(curriculum, accessibility, performance-budget, threat-model, privacy,
art-direction, sound-design, definition-of-done, secrets). Mirror each when it's
authored — not before.
