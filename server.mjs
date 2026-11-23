import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import pg from 'pg';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '1mb' }));
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const port = Number(process.env.PORT || 10000);
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 }) : null;
const players = new Map();
const lastPersist = new Map();

async function initDb() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT 'male',
    class_id TEXT NOT NULL DEFAULT 'berserker',
    x DOUBLE PRECISION NOT NULL DEFAULT 0,
    z DOUBLE PRECISION NOT NULL DEFAULT 24,
    level INTEGER NOT NULL DEFAULT 1,
    hp DOUBLE PRECISION NOT NULL DEFAULT 200,
    mp DOUBLE PRECISION NOT NULL DEFAULT 100,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

app.get('/health', (_req, res) => res.json({ ok: true, online: players.size, database: Boolean(pool) }));
app.get('/api/online', (_req, res) => res.json({ players: [...players.values()].map(publicPlayer) }));

function publicPlayer(p) {
  return { id: p.id, username: p.username, gender: p.gender, classId: p.classId, x: p.x, z: p.z, level: p.level };
}

async function persistPlayer(p) {
  if (!pool) return;
  await pool.query(`INSERT INTO players (id, username, gender, class_id, x, z, level, hp, mp, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, gender=EXCLUDED.gender,
      class_id=EXCLUDED.class_id, x=EXCLUDED.x, z=EXCLUDED.z, level=EXCLUDED.level,
      hp=EXCLUDED.hp, mp=EXCLUDED.mp, updated_at=NOW()`,
    [p.id, p.username, p.gender, p.classId, p.x, p.z, p.level, p.hp, p.mp]);
}

function broadcast(message, exceptId = null) {
  const raw = JSON.stringify(message);
  for (const [id, ws] of wss.clients.entries()) {
    if (ws.readyState !== 1 || id === exceptId) continue;
    ws.send(raw);
  }
}

wss.on('connection', (ws) => {
  const id = randomUUID();
  ws.playerId = id;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.send(JSON.stringify({ type: 'welcome', id, players: [...players.values()].map(publicPlayer) }));

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'join') {
        const p = {
          id,
          username: String(msg.username || 'Hero').slice(0, 24),
          gender: msg.gender === 'female' ? 'female' : 'male',
          classId: String(msg.classId || 'berserker'),
          x: Number(msg.x) || 0,
          z: Number(msg.z) || 24,
          level: Math.max(1, Number(msg.level) || 1),
          hp: Number(msg.hp) || 200,
          mp: Number(msg.mp) || 100,
        };
        players.set(id, p);
        await persistPlayer(p);
        ws.send(JSON.stringify({ type: 'joined', player: publicPlayer(p) }));
        broadcast({ type: 'player_joined', player: publicPlayer(p) }, id);
      } else if (msg.type === 'state') {
        const p = players.get(id);
        if (!p) return;
        p.x = Number(msg.x) || p.x;
        p.z = Number(msg.z) || p.z;
        p.level = Math.max(1, Number(msg.level) || p.level);
        if (Number.isFinite(msg.hp)) p.hp = Number(msg.hp);
        if (Number.isFinite(msg.mp)) p.mp = Number(msg.mp);
        broadcast({ type: 'player_state', player: publicPlayer(p) }, id);
        const now = Date.now();
        if (!lastPersist.has(id) || now - lastPersist.get(id) > 5000) { lastPersist.set(id, now); persistPlayer(p).catch(() => {}); }
      } else if (msg.type === 'chat') {
        const p = players.get(id);
        if (!p) return;
        broadcast({ type: 'chat', playerId: id, username: p.username, text: String(msg.text || '').slice(0, 160) });
      }
    } catch (err) {
      console.error('WS message error:', err);
    }
  });

  ws.on('close', async () => {
    const p = players.get(id);
    players.delete(id);
    lastPersist.delete(id);
    if (p) await persistPlayer(p).catch(() => {});
    broadcast({ type: 'player_left', id });
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

initDb().then(() => server.listen(port, () => console.log(`Tartaros server listening on ${port}`)))
  .catch((err) => { console.error('Database init failed:', err); process.exit(1); });
