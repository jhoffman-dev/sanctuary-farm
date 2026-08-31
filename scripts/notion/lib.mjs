// Shared Notion helpers for the board CLI and the docs sync.
//
// Config (either):
//   .claude/notion.local.json   { "token": "ntn_…", "dbId": "<32 hex>", "docsRootPageId": "<32 hex>" }
//   env  NOTION_TOKEN  SANCTUARY_FARM_DB_ID  SANCTUARY_FARM_DOCS_PAGE_ID

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const API = 'https://api.notion.com/v1';
const VERSION = '2022-06-28';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function loadConfig({ need = [] } = {}) {
  const cfg = {
    token: process.env.NOTION_TOKEN,
    dbId: process.env.SANCTUARY_FARM_DB_ID,
    docsRootPageId: process.env.SANCTUARY_FARM_DOCS_PAGE_ID,
  };
  const local = resolve(REPO_ROOT, '.claude/notion.local.json');
  if (existsSync(local)) {
    const j = JSON.parse(readFileSync(local, 'utf8'));
    cfg.token ??= j.token;
    cfg.dbId ??= j.dbId;
    cfg.docsRootPageId ??= j.docsRootPageId;
  }
  const missing = ['token', ...need].filter((k) => !cfg[k]);
  if (missing.length) {
    console.error(
      `Missing Notion config: ${missing.join(', ')}.\n` +
        'Set it in .claude/notion.local.json or the matching env vars. See docs/board.md.',
    );
    process.exit(2);
  }
  return cfg;
}

export function makeApi(token) {
  return async function api(path, method = 'GET', body) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': VERSION,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`Notion ${res.status}: ${json.message || JSON.stringify(json)}`);
      process.exit(1);
    }
    return json;
  };
}

// ---- minimal Markdown -> Notion blocks ------------------------------------
// Covers what our docs use: h1-h3, paragraphs, bullet / numbered lists, fenced
// code, blockquotes, tables, horizontal rules, and inline **bold** / *italic* /
// `code` / [links](url). Not a general converter.

function inlineRichText(text) {
  const out = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(plain(text.slice(last, m.index)));
    if (m[2] != null) out.push(plain(m[2], { bold: true }));
    else if (m[3] != null) out.push(plain(m[3], { italic: true }));
    else if (m[4] != null) out.push(plain(m[4], { code: true }));
    else if (m[5] != null) out.push(link(m[5], m[6]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(plain(text.slice(last)));
  return out.length ? out : [plain('')];
}
function plain(content, annotations) {
  return { type: 'text', text: { content }, annotations: annotations || undefined };
}
function link(content, url) {
  return { type: 'text', text: { content, link: { url } } };
}
function para(text) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: inlineRichText(text) } };
}

export function mdToBlocks(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  // strip a single leading H1 (it becomes the page title)
  while (i < lines.length && lines[i].trim() === '') i++;
  if (lines[i]?.startsWith('# ')) {
    i++;
    while (i < lines.length && lines[i].trim() === '') i++;
  }
  for (; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (t === '') continue;

    if (t.startsWith('```')) {
      const lang = t.slice(3).trim() || 'plain text';
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      blocks.push({
        object: 'block',
        type: 'code',
        code: {
          language: notionLang(lang),
          rich_text: [plain(code.join('\n'))],
        },
      });
      continue;
    }
    if (/^#{1,6}\s/.test(t)) {
      const level = Math.min(3, t.match(/^#+/)[0].length);
      const text = t.replace(/^#+\s/, '');
      blocks.push({
        object: 'block',
        type: `heading_${level}`,
        [`heading_${level}`]: { rich_text: inlineRichText(text) },
      });
      continue;
    }
    if (t === '---' || t === '***' || t === '___') {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
      continue;
    }
    if (/^[-*]\s/.test(t)) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: inlineRichText(t.replace(/^[-*]\s/, '')) },
      });
      continue;
    }
    if (/^\d+\.\s/.test(t)) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: inlineRichText(t.replace(/^\d+\.\s/, '')) },
      });
      continue;
    }
    if (t.startsWith('> ')) {
      const quote = [t.slice(2)];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('> ')) quote.push(lines[++i].trim().slice(2));
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: { rich_text: inlineRichText(quote.join('\n')) },
      });
      continue;
    }
    if (t.startsWith('|') && lines[i + 1]?.trim().match(/^\|[\s:|-]+\|$/)) {
      const rows = [t];
      i++; // skip divider
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) rows.push(lines[++i].trim());
      const cells = rows.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      blocks.push({
        object: 'block',
        type: 'table',
        table: {
          table_width: cells[0].length,
          has_column_header: true,
          has_row_header: false,
          children: cells.map((row) => ({
            object: 'block',
            type: 'table_row',
            table_row: { cells: row.map((c) => inlineRichText(c)) },
          })),
        },
      });
      continue;
    }
    // paragraph: join wrapped lines until a blank
    const buf = [t];
    while (i + 1 < lines.length && lines[i + 1].trim() !== '' && !/^([-*]|\d+\.|#{1,6}\s|>|\||```)/.test(lines[i + 1].trim())) {
      buf.push(lines[++i].trim());
    }
    blocks.push(para(buf.join(' ')));
  }
  return blocks;
}

const LANGS = new Set([
  'bash', 'css', 'html', 'java', 'javascript', 'json', 'markdown', 'python',
  'shell', 'sql', 'typescript', 'yaml', 'plain text',
]);
function notionLang(l) {
  const map = { js: 'javascript', ts: 'typescript', sh: 'shell', yml: 'yaml', text: 'plain text', txt: 'plain text' };
  const v = map[l] || l;
  return LANGS.has(v) ? v : 'plain text';
}
