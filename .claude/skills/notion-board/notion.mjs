#!/usr/bin/env node
// Sanctuary Farm — Notion board CLI.
//
// Config: .claude/notion.local.json or env — see scripts/notion/lib.mjs and docs/board.md.
//
// Commands:
//   schema                       show DB properties vs what the board needs
//   setup                        create the missing properties via the API
//   list [--status <s>] [--assignee <a>] [--type <t>] [--phase <p>]
//   get <SF-123>
//   create --type <Epic|Story|Task|Bug> --title "..." [--epic SF-1] [--status Backlog]
//          [--assignee Jonathan] [--size S] [--priority P1] [--phase "Phase 0"]
//          [--body "..."] [--file path.md]
//   move <SF-123> "<Status>"
//   assign <SF-123> <Jonathan|unassigned>
//   link <SF-123> <url>
//   note <SF-123> "text"
//   import <path.csv>     columns: Type,Title,Status,Assignee,Size,Priority,Phase,Epic,Body

import { readFileSync } from 'node:fs';
import { loadConfig, makeApi } from '../../../scripts/notion/lib.mjs';

const HELP =
  'commands: schema | setup | list | get | create | move | assign | link | note | import\n' +
  'see the header of this file or docs/board.md';
if (!process.argv[2] || ['help', '-h', '--help'].includes(process.argv[2])) {
  console.log(HELP);
  process.exit(0);
}

const { token, dbId } = loadConfig({ need: ['dbId'] });
const api = makeApi(token);

// ---- property helpers -------------------------------------------------------

let _db = null;
async function db() {
  if (!_db) _db = await api(`/databases/${dbId}`);
  return _db;
}

async function propType(name) {
  const d = await db();
  return d.properties[name]?.type;
}

async function selectProp(name, value) {
  const t = await propType(name);
  if (t === 'status') return { status: { name: value } };
  return { select: value == null ? null : { name: value } };
}

function titleProp(text) {
  return { title: [{ text: { content: text } }] };
}
function urlProp(url) {
  return { url: url || null };
}

async function allPages() {
  const out = [];
  let cursor;
  do {
    const page = await api(`/databases/${dbId}/query`, 'POST', {
      start_cursor: cursor,
      page_size: 100,
    });
    out.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return out;
}

function keyOf(page) {
  for (const [, v] of Object.entries(page.properties)) {
    if (v.type === 'unique_id' && v.unique_id) {
      return `${v.unique_id.prefix ? v.unique_id.prefix + '-' : ''}${v.unique_id.number}`;
    }
  }
  return page.id.slice(0, 8);
}
function titleOf(page) {
  for (const [, v] of Object.entries(page.properties)) {
    if (v.type === 'title') return v.title.map((t) => t.plain_text).join('');
  }
  return '(untitled)';
}
function selOf(page, name) {
  const v = page.properties[name];
  if (!v) return '';
  if (v.type === 'status') return v.status?.name || '';
  if (v.type === 'select') return v.select?.name || '';
  return '';
}

async function findByKey(key) {
  const norm = key.toUpperCase().replace(/^SF-?/, 'SF-');
  const pages = await allPages();
  const hit = pages.find((p) => keyOf(p).toUpperCase() === norm);
  if (!hit) {
    console.error(`No ticket ${key} on the board.`);
    process.exit(1);
  }
  return hit;
}

function parseArgs(args) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const k = args[i].slice(2);
      const v = args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[++i] : true;
      flags[k] = v;
    } else {
      pos.push(args[i]);
    }
  }
  return { flags, pos };
}

// ---- commands --------------------------------------------------------------

async function cmdSchema() {
  const d = await db();
  const dbTitle = (d.title || []).map((t) => t.plain_text).join('');
  console.log(`DB: ${dbTitle}  (${dbId})`);
  const want = {
    Name: 'title',
    ID: 'unique_id',
    Type: 'select',
    Status: 'status',
    Assignee: 'select',
    Size: 'select',
    Priority: 'select',
    Phase: 'select',
    Epic: 'relation',
    PR: 'url',
  };
  console.log('\nProperties present:');
  for (const [name, prop] of Object.entries(d.properties)) {
    console.log(`  ${name.padEnd(12)} ${prop.type}`);
  }
  console.log('\nExpected (see docs/board.md):');
  for (const [name, type] of Object.entries(want)) {
    const got = d.properties[name]?.type;
    const mark = got === type ? 'ok' : got ? `is ${got}` : 'MISSING';
    console.log(`  ${name.padEnd(12)} ${type.padEnd(12)} ${mark}`);
  }
}

async function cmdSetup() {
  const d = await db();
  const has = d.properties;
  const add = {};
  const sel = (options) => ({ select: { options: options.map((name) => ({ name })) } });

  if (!has.Type) add.Type = sel(['Epic', 'Story', 'Task', 'Bug']);
  if (!has.Assignee) add.Assignee = sel(['Jonathan']);
  if (!has.Size) add.Size = sel(['XS', 'S', 'M']);
  if (!has.Priority) add.Priority = sel(['P0', 'P1', 'P2']);
  if (!has.Phase) add.Phase = sel(['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6']);
  if (!has.PR) add.PR = { url: {} };
  if (!has.Epic) add.Epic = { relation: { database_id: dbId, type: 'single_property', single_property: {} } };
  // Status: the API can't create or edit a native `status` property, so if one
  // isn't already there we make a plain select we CAN drive.
  if (!has.Status) add.Status = sel(['Backlog', 'Ready', 'In progress', 'In review', 'Blocked', 'Done']);

  if (Object.keys(add).length) {
    await api(`/databases/${dbId}`, 'PATCH', { properties: add });
    console.log(`Added: ${Object.keys(add).join(', ')}`);
  } else {
    console.log('All properties already present.');
  }

  // Things the API can't do — report for a 20-second UI fix.
  const manual = [];
  if (!has.ID) manual.push('Add an "ID" property of type "ID" (Unique ID), prefix "SF" — for stable ticket keys.');
  if (has.Status?.type === 'status') {
    const opts = new Set((has.Status.status?.options || []).map((o) => o.name));
    const need = ['Backlog', 'Ready', 'In progress', 'In review', 'Blocked', 'Done'].filter((s) => !opts.has(s));
    if (need.length) manual.push(`Status is a native "status" property — add these options in the UI: ${need.join(', ')}.`);
  }
  if (manual.length) {
    console.log('\nDo these in the Notion UI (the API cannot):');
    for (const m of manual) console.log(`  - ${m}`);
  }
  console.log('\nThen: node .claude/skills/notion-board/notion.mjs import docs/backlog.csv');
}

async function cmdList(flags) {
  const pages = await allPages();
  const rows = pages
    .filter((p) => !flags.status || selOf(p, 'Status').toLowerCase() === String(flags.status).toLowerCase())
    .filter((p) => !flags.type || selOf(p, 'Type').toLowerCase() === String(flags.type).toLowerCase())
    .filter((p) => !flags.assignee || selOf(p, 'Assignee').toLowerCase() === String(flags.assignee).toLowerCase())
    .filter((p) => !flags.phase || selOf(p, 'Phase').toLowerCase() === String(flags.phase).toLowerCase())
    .map((p) => ({
      key: keyOf(p),
      type: selOf(p, 'Type'),
      status: selOf(p, 'Status'),
      assignee: selOf(p, 'Assignee') || '-',
      title: titleOf(p),
    }))
    .sort((a, b) => {
      const n = (k) => parseInt(String(k).replace(/\D/g, ''), 10) || 0;
      return n(a.key) - n(b.key);
    });
  for (const r of rows) {
    console.log(
      `${r.key.padEnd(7)} ${r.type.padEnd(6)} ${r.status.padEnd(12)} ${r.assignee.padEnd(10)} ${r.title}`,
    );
  }
  console.log(`\n${rows.length} ticket(s).`);
}

async function cmdGet(key) {
  const p = await findByKey(key);
  console.log(`${keyOf(p)}  ${titleOf(p)}`);
  console.log(`Type ${selOf(p, 'Type')} | Status ${selOf(p, 'Status')} | Assignee ${selOf(p, 'Assignee') || '-'}`);
  console.log(`Size ${selOf(p, 'Size') || '-'} | Priority ${selOf(p, 'Priority') || '-'} | Phase ${selOf(p, 'Phase') || '-'}`);
  console.log(`URL ${p.url}`);
  const blocks = await api(`/blocks/${p.id}/children?page_size=100`);
  const text = blocks.results
    .map((b) => (b[b.type]?.rich_text || []).map((t) => t.plain_text).join(''))
    .filter(Boolean)
    .join('\n');
  if (text) console.log(`\n${text}`);
}

function bodyToBlocks(body) {
  return body
    .split('\n')
    .map((line) => ({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: line ? [{ type: 'text', text: { content: line } }] : [] },
    }));
}

async function createTicket({ type, title, status, assignee, size, priority, phase, epic, epicId, body }) {
  const props = { Name: titleProp(title) };
  if (type) props.Type = await selectProp('Type', type);
  props.Status = await selectProp('Status', status || 'Backlog');
  if (assignee && assignee !== 'unassigned') props.Assignee = await selectProp('Assignee', assignee);
  if (size) props.Size = await selectProp('Size', size);
  if (priority) props.Priority = await selectProp('Priority', priority);
  if (phase) props.Phase = await selectProp('Phase', phase);
  const parentId = epicId || (epic ? (await findByKey(epic)).id : null);
  if (parentId) props.Epic = { relation: [{ id: parentId }] };
  const page = await api('/pages', 'POST', {
    parent: { database_id: dbId },
    properties: props,
    children: body ? bodyToBlocks(body) : undefined,
  });
  return page;
}

async function cmdCreate(flags) {
  if (!flags.title) {
    console.error('create needs --title');
    process.exit(2);
  }
  let body = flags.body || '';
  if (flags.file) body = readFileSync(flags.file, 'utf8');
  const page = await createTicket({
    type: flags.type,
    title: flags.title,
    status: flags.status,
    assignee: flags.assignee,
    size: flags.size,
    priority: flags.priority,
    phase: flags.phase,
    epic: flags.epic,
    body,
  });
  // re-read for the unique id
  const fresh = await api(`/pages/${page.id}`);
  console.log(`Created ${keyOf(fresh)}  ${flags.title}`);
  console.log(fresh.url);
}

async function cmdMove(key, status) {
  const p = await findByKey(key);
  await api(`/pages/${p.id}`, 'PATCH', { properties: { Status: await selectProp('Status', status) } });
  console.log(`${keyOf(p)} → ${status}`);
}

async function cmdAssign(key, who) {
  const p = await findByKey(key);
  const val = who === 'unassigned' ? null : who;
  await api(`/pages/${p.id}`, 'PATCH', { properties: { Assignee: await selectProp('Assignee', val) } });
  console.log(`${keyOf(p)} assignee → ${who}`);
}

async function cmdLink(key, url) {
  const p = await findByKey(key);
  await api(`/pages/${p.id}`, 'PATCH', { properties: { PR: urlProp(url) } });
  console.log(`${keyOf(p)} PR → ${url}`);
}

async function cmdNote(key, text) {
  const p = await findByKey(key);
  await api(`/comments`, 'POST', {
    parent: { page_id: p.id },
    rich_text: [{ type: 'text', text: { content: text } }],
  });
  console.log(`${keyOf(p)} note added`);
}

function parseCsv(raw) {
  // minimal CSV: quoted fields, doubled quotes, commas, newlines in quotes
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (q) {
      if (c === '"' && raw[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && raw[i + 1] === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    if (row.some((f) => f !== '')) rows.push(row);
  }
  return rows;
}

async function cmdImport(path) {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  const header = rows.shift().map((h) => h.trim());
  const idx = (n) => header.indexOf(n);
  // two passes: Epics first so relations resolve
  const records = rows.map((r) => ({
    type: r[idx('Type')]?.trim(),
    title: r[idx('Title')]?.trim(),
    status: r[idx('Status')]?.trim() || 'Backlog',
    assignee: r[idx('Assignee')]?.trim(),
    size: r[idx('Size')]?.trim(),
    priority: r[idx('Priority')]?.trim(),
    phase: r[idx('Phase')]?.trim(),
    epic: r[idx('Epic')]?.trim(),
    body: (r[idx('Body')] || '').replace(/\\n/g, '\n').trim(),
  }));
  const order = { Epic: 0, Story: 1, Task: 2, Bug: 3 };
  records.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
  const titleToId = {};
  for (const rec of records) {
    // the Epic column names another row's Title (usually an Epic in this import)
    const epicId = rec.epic ? titleToId[rec.epic] : undefined;
    if (rec.epic && !epicId) console.log(`  (note: epic "${rec.epic}" for "${rec.title}" not found in this import — left unlinked)`);
    const page = await createTicket({ ...rec, epicId });
    titleToId[rec.title] = page.id;
    const key = keyOf(await api(`/pages/${page.id}`));
    console.log(`  ${key.padEnd(7)} ${(rec.type || '').padEnd(6)} ${rec.title}`);
  }
  console.log(`\nImported ${records.length} ticket(s).`);
}

// ---- dispatch -------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2);
const { flags, pos } = parseArgs(rest);

switch (cmd) {
  case 'schema':
    await cmdSchema();
    break;
  case 'setup':
    await cmdSetup();
    break;
  case 'list':
    await cmdList(flags);
    break;
  case 'get':
    await cmdGet(pos[0]);
    break;
  case 'create':
    await cmdCreate(flags);
    break;
  case 'move':
    await cmdMove(pos[0], pos[1]);
    break;
  case 'assign':
    await cmdAssign(pos[0], pos[1]);
    break;
  case 'link':
    await cmdLink(pos[0], pos[1]);
    break;
  case 'note':
    await cmdNote(pos[0], pos.slice(1).join(' '));
    break;
  case 'import':
    await cmdImport(pos[0]);
    break;
  default:
    console.log(HELP);
}
