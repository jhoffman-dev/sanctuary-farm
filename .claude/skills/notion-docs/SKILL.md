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

Everything is under the project page **Sanctuary Farm — Student Game Project**
(<https://app.notion.com/p/3cd672aa2c4a814e8714e77635cc762a>):

- **Docs** page (parent for every mirrored doc):
  <https://app.notion.com/p/3d5672aa2c4a80ecaed8f07d0875b5aa>
  — page id `3d5672aa-2c4a-80ec-aed8-f07d0875b5aa`
- **ADR's** subpage (parent for ADR pages):
  <https://app.notion.com/p/3d5672aa2c4a809791c7dd75c84db1e9>
  — page id `3d5672aa-2c4a-8097-91c7-dd75c84db1e9`

`docs/README.md` is the link index — `{ file → Notion page }` for every mirrored
doc. Keep it current when you add or move a page.

## Push a changed doc

1. Look up the target page URL in `docs/README.md` (or `notion-fetch` the Docs
   page).
2. `notion-update-page`, `command: "replace_content"`, `new_str:` the file's
   markdown **minus its top-level `# H1`** (the Notion page title carries that).
   Notion-flavored markdown renders headings, lists, code fences, block quotes,
   tables, and inline formatting directly.
3. Re-`notion-fetch` the page and eyeball tables / code / headings.

## Add a new doc

1. `notion-create-pages` with `parent: { page_id: "<Docs page id>" }` (or the
   ADR's page id for an ADR), `properties: { title: "..." }`, `content:` the
   markdown (minus the `# H1`).
2. Add a row to `docs/README.md` with the new page URL.
3. If the doc started as a `Ready` ticket ("write docs/X.md"), move that ticket
   to review/Done as usual (the ticket is a GitHub issue — skill: `github-board`).

## Not yet written

Several docs in `docs/README.md` are still `Ready` tickets, not files
(curriculum, accessibility, performance-budget, threat-model, privacy,
art-direction, sound-design, definition-of-done, secrets). Mirror each when it's
authored — not before.
