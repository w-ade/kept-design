// Local server for docs/kept-bookmarks.html. Saves bookmarks to plain files that outlive any app.
//
//   node scripts/bookmarks-server.mjs            # http://127.0.0.1:5175
//   BOOKMARKS_DIR=/some/dir node scripts/bookmarks-server.mjs
//
// Storage (default: iCloud Drive/Kept Bookmarks, so there is a copy off this machine):
//   bookmarks.jsonl              append-only event log. The source of truth. Lines are never rewritten.
//   bookmarks.md                 readable mirror, regenerated after every change.
//   backups/bookmarks-DATE.jsonl one snapshot per day the server runs.
// Removing a bookmark appends a "remove" event; the original "add" line stays in the log.

import { createServer } from 'node:http';
import { closeSync, copyFileSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const PAGE = resolve(here, '../docs/kept-bookmarks.html');
const PORT = Number(process.env.PORT ?? 5175);
const DIR = process.env.BOOKMARKS_DIR ?? join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Kept Bookmarks');
const LOG = join(DIR, 'bookmarks.jsonl');
const MD = join(DIR, 'bookmarks.md');

mkdirSync(join(DIR, 'backups'), { recursive: true });
if (!existsSync(LOG)) writeFileSync(LOG, '');

function readEvents() {
  const events = [];
  let skipped = 0;
  for (const line of readFileSync(LOG, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { skipped += 1; }
  }
  if (skipped) console.warn(`${skipped} unreadable line(s) in ${LOG}; left untouched.`);
  return events;
}

function fold(events) {
  const byId = new Map();
  for (const e of events) {
    if (e.op === 'add' && e.id && e.url) byId.set(e.id, { id: e.id, url: e.url, title: e.title, note: e.note, tags: e.tags, added: e.added });
    else if (e.op === 'remove') byId.delete(e.id);
  }
  return [...byId.values()].sort((a, b) => (b.added + b.id).localeCompare(a.added + a.id));
}

function append(events) {
  const fd = openSync(LOG, 'a');
  try {
    writeSync(fd, events.map((e) => JSON.stringify(e) + '\n').join(''));
    fsyncSync(fd); // on disk before we say "saved"
  } finally {
    closeSync(fd);
  }
  writeMirror();
  snapshot();
}

function writeMirror() {
  const list = fold(readEvents());
  const text =
    '# Kept bookmarks\n\n' +
    list.map((b) => `- [${b.title}](${b.url}) — ${b.added}${b.tags?.length ? ` — ${b.tags.join(', ')}` : ''}${b.note ? `\n  ${b.note}` : ''}`).join('\n') +
    '\n';
  const tmp = MD + '.tmp';
  writeFileSync(tmp, text);
  renameSync(tmp, MD); // atomic: never a half-written file
}

function snapshot() {
  const file = join(DIR, 'backups', `bookmarks-${new Date().toISOString().slice(0, 10)}.jsonl`);
  copyFileSync(LOG, file); // overwritten through the day; the last one of each day stays
}

function clean(b) {
  let url = String(b.url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  new URL(url); // throws on garbage
  const tags = Array.isArray(b.tags) ? b.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean) : [];
  return {
    op: 'add',
    id: typeof b.id === 'string' && b.id ? b.id : randomUUID(),
    url,
    title: String(b.title ?? '').trim() || new URL(url).hostname.replace(/^www\./, ''),
    note: String(b.note ?? '').trim(),
    tags,
    added: /^\d{4}-\d{2}-\d{2}$/.test(b.added ?? '') ? b.added : new Date().toISOString().slice(0, 10),
    at: new Date().toISOString(),
  };
}

const body = (req) =>
  new Promise((resolveBody, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 5e6) reject(new Error('too large')); });
    req.on('end', () => { try { resolveBody(JSON.parse(raw || '{}')); } catch (e) { reject(e); } });
  });

const server = createServer(async (req, res) => {
  const send = (code, data, type = 'application/json') => {
    res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(type === 'application/json' ? JSON.stringify(data) : data);
  };
  try {
    const path = new URL(req.url, 'http://x').pathname;
    if (req.method === 'GET' && (path === '/' || path === '/index.html')) return send(200, readFileSync(PAGE, 'utf8'), 'text/html; charset=utf-8');
    if (!path.startsWith('/api/bookmarks')) return send(404, { error: 'not found' });

    // Other websites can POST to localhost; only accept our own page.
    if (req.method !== 'GET') {
      const origin = req.headers.origin;
      if (origin && origin !== `http://127.0.0.1:${PORT}` && origin !== `http://localhost:${PORT}`) return send(403, { error: 'forbidden origin' });
    }

    if (req.method === 'GET' && path === '/api/bookmarks') return send(200, { dir: DIR, bookmarks: fold(readEvents()) });

    if (req.method === 'POST' && path === '/api/bookmarks') {
      const item = clean(await body(req));
      append([item]);
      return send(200, item);
    }
    if (req.method === 'POST' && path === '/api/bookmarks/import') {
      const list = await body(req);
      const have = new Set(fold(readEvents()).map((b) => b.url));
      const fresh = [];
      for (const b of Array.isArray(list) ? list : []) {
        try {
          const item = clean(b);
          if (!have.has(item.url)) { have.add(item.url); fresh.push(item); }
        } catch { /* skip bad rows */ }
      }
      if (fresh.length) append(fresh);
      return send(200, { imported: fresh.length });
    }
    if (req.method === 'DELETE') {
      const id = decodeURIComponent(path.split('/').pop());
      append([{ op: 'remove', id, at: new Date().toISOString() }]);
      return send(200, { ok: true });
    }
    send(405, { error: 'method not allowed' });
  } catch (e) {
    send(400, { error: String(e.message ?? e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  writeMirror();
  snapshot();
  console.log(`Kept bookmarks: http://127.0.0.1:${PORT}\nSaving to: ${DIR}`);
});
