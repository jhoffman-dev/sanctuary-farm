#!/usr/bin/env node
// Push the repo's markdown docs to Notion pages (repo -> Notion mirror).
//
//   node scripts/notion/sync-docs.mjs            # sync every doc in the manifest
//   node scripts/notion/sync-docs.mjs docs/PRD.md [more…]   # sync just these
//   node scripts/notion/sync-docs.mjs --index    # only regenerate docs/README.md
//
// Notion is the canonical place to READ these. Author changes as markdown + a
// PR, then run this so Notion reflects the merge. Direct edits in Notion win
// until the next authored change; there is no pull.
//
// Needs .claude/notion.local.json (or env) with token + docsRootPageId — a
// Notion page you have shared with the integration, under which the doc pages
// are created. See docs/board.md.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, makeApi, mdToBlocks, REPO_ROOT } from './lib.mjs';

const MANIFEST = resolve(REPO_ROOT, 'scripts/notion/docs-manifest.json');
const INDEX = resolve(REPO_ROOT, 'docs/README.md');

const args = process.argv.slice(2);
const indexOnly = args.includes('--index');
const only = args.filter((a) => !a.startsWith('--'));

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const cfg = indexOnly ? {} : loadConfig({ need: ['docsRootPageId'] });
const { token, docsRootPageId } = cfg;
const api = indexOnly ? null : makeApi(token);

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function clearChildren(pageId) {
  let cursor;
  do {
    const res = await api(`/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    for (const block of res.results) {
      await api(`/blocks/${block.id}`, 'DELETE');
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

async function pushDoc(entry) {
  const md = readFileSync(resolve(REPO_ROOT, entry.file), 'utf8');
  const blocks = mdToBlocks(md);
  const titleRt = [{ type: 'text', text: { content: entry.title } }];

  if (!entry.pageId) {
    const page = await api('/pages', 'POST', {
      parent: { page_id: docsRootPageId },
      properties: { title: { title: titleRt } },
    });
    entry.pageId = page.id;
    entry.url = page.url;
    console.log(`  created  ${entry.file}  ->  ${page.url}`);
  } else {
    await api(`/pages/${entry.pageId}`, 'PATCH', { properties: { title: { title: titleRt } } });
    await clearChildren(entry.pageId);
    const page = await api(`/pages/${entry.pageId}`);
    entry.url = page.url;
    console.log(`  updated  ${entry.file}`);
  }

  for (const group of chunk(blocks, 100)) {
    await api(`/blocks/${entry.pageId}/children`, 'PATCH', { children: group });
  }
}

function writeIndex() {
  const lines = [
    '# Docs',
    '',
    'These docs are **mirrored to Notion** — that is where to read and (if needed) edit them.',
    'The markdown here is authored via PR; `scripts/notion/sync-docs.mjs` pushes merges to',
    'Notion. `CLAUDE.md` stays repo-only (it is the agent entry point).',
    '',
    '| Doc | Notion |',
    '| --- | --- |',
  ];
  for (const d of manifest.docs) {
    const link = d.url ? `[open](${d.url})` : '_not pushed yet_';
    lines.push(`| \`${d.file}\` — ${d.title} | ${link} |`);
  }
  lines.push('');
  writeFileSync(INDEX, lines.join('\n'));
  console.log(`  wrote docs/README.md`);
}

if (!indexOnly) {
  const targets = only.length
    ? manifest.docs.filter((d) => only.includes(d.file))
    : manifest.docs;
  if (only.length && targets.length !== only.length) {
    console.error(`Not in the manifest: ${only.filter((f) => !manifest.docs.some((d) => d.file === f)).join(', ')}`);
    process.exit(2);
  }
  for (const entry of targets) {
    if (!existsSync(resolve(REPO_ROOT, entry.file))) {
      console.log(`  skip     ${entry.file}  (not written yet)`);
      continue;
    }
    await pushDoc(entry);
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
}
writeIndex();
console.log('done.');
