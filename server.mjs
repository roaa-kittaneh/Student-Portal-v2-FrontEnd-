import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const DB = path.join(path.dirname(fileURLToPath(import.meta.url)), 'db.json');
const PORT = Number(process.env.PORT) || 4001;
const NUL = String.fromCharCode(0);

async function read() {
  try {
    let r = (await fs.readFile(DB, 'utf8')).split(NUL).join('').trim();
    if (!r) return { students: [] };
    const p = JSON.parse(r);
    if (!Array.isArray(p.students)) p.students = [];
    return p;
  } catch (e) {
    console.warn('[api] db.json bad:', e.message);
    return { students: [] };
  }
}

let q = Promise.resolve();
const write = (d) => (q = q.then(() => fs.writeFile(DB, JSON.stringify(d, null, 2) + '\n', 'utf8')));

function send(res, s, b) {
  res.statusCode = s;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.end(b === undefined ? '' : JSON.stringify(b));
}

const body = (req) => new Promise((ok, no) => {
  let d = '';
  req.on('data', (c) => { d += c; if (d.length > 1e6) req.destroy(); });
  req.on('end', () => { if (!d) return ok({}); try { ok(JSON.parse(d)); } catch { no(new Error('bad json')); } });
  req.on('error', no);
});

const eq = (a, b) => String(a) === String(b);
const NF = { message: 'Not found' };

const srv = http.createServer(async (req, res) => {
  const t = Date.now();
  res.on('finish', () => console.log('[api]', req.method, req.url, '->', res.statusCode, (Date.now() - t) + 'ms'));
  try {
    if (req.method === 'OPTIONS') return send(res, 204);
    const u = new URL(req.url, 'http://x');
    const p = u.pathname.split('/').filter(Boolean);
    if (!p.length || p[0] === 'health') return send(res, 200, { status: 'ok', server: 'server.mjs' });
    if (p[0] !== 'students') return send(res, 404, NF);
    const db = await read(), xs = db.students;
    const m = req.method, n = p.length;
    if (m === 'GET' && n === 1) return send(res, 200, xs);
    if (m === 'GET' && n === 2) {
      const f = xs.find((s) => eq(s.id, p[1]));
      return send(res, f ? 200 : 404, f || NF);
    }
    if (m === 'POST' && n === 1) {
      const b = await body(req);
      const r = { ...b, id: b.id ? String(b.id) : randomUUID() };
      xs.push(r); await write(db);
      return send(res, 201, r);
    }
    if (m === 'PUT' && n === 2) {
      const b = await body(req);
      const i = xs.findIndex((s) => eq(s.id, p[1]));
      if (i === -1) return send(res, 404, NF);
      xs[i] = { ...b, id: p[1] }; await write(db);
      return send(res, 200, xs[i]);
    }
    if (m === 'PATCH' && n === 2) {
      const b = await body(req);
      const i = xs.findIndex((s) => eq(s.id, p[1]));
      if (i === -1) return send(res, 404, NF);
      xs[i] = { ...xs[i], ...b, id: p[1] }; await write(db);
      return send(res, 200, xs[i]);
    }
    if (m === 'DELETE' && n === 2) {
      const before = xs.length;
      db.students = xs.filter((s) => !eq(s.id, p[1]));
      if (db.students.length === before) return send(res, 404, NF);
      await write(db);
      return send(res, 204);
    }
    send(res, 405, { message: 'Method not allowed' });
  } catch (e) {
    console.error('[api]', e);
    send(res, 500, { message: e.message });
  }
});

srv.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\nERROR: port ' + PORT + ' is already in use. Kill the old process first.\n');
    process.exit(1);
  }
  console.error('[api] fatal:', err);
  process.exit(1);
});

srv.listen(PORT, () => {
  console.log('Mock API ready: http://localhost:' + PORT);
  console.log('Health check:   http://localhost:' + PORT + '/health');
});

for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => srv.close(() => process.exit(0)));
