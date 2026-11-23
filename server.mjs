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
const duelRequests = new Map();
const duelCooldowns = new Map();
const duels = new Map();
const ARENA = { x: 0, z: 380, radius: 24 };
const CITY = { x: 0, z: 12 };
const DUEL_REQUEST_TTL = 30_000;
const DUEL_REJECT_COOLDOWN = 60 * 60 * 1000;
const DUEL_MAX_RANGE = 9;
const DUEL_ATTACK_RANGE = 18;

const SKILLS = {
  berserker: [1.15, 1.9, 2.4, 1.4, 2.9, 3.8],
  archer: [1.08, 2.0, 2.5, 1.3, 2.9, 3.7],
  knight: [1.1, 1.95, 2.3, 1.4, 2.85, 3.65],
  necromancer: [1.12, 2.1, 2.1, 2.5, 3.0, 3.9],
};
const SKILL_MP = {
  berserker: [0, 18, 24, 20, 34, 46],
  archer: [0, 16, 26, 18, 34, 44],
  knight: [0, 18, 22, 22, 34, 45],
  necromancer: [0, 20, 24, 26, 34, 48],
};

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
    gold DOUBLE PRECISION NOT NULL DEFAULT 200,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS gold DOUBLE PRECISION NOT NULL DEFAULT 200`);
}

app.get('/health', (_req, res) => res.json({ ok: true, online: players.size, duels: duels.size, database: Boolean(pool) }));
app.get('/api/online', (_req, res) => res.json({ players: [...players.values()].map(publicPlayer) }));

function publicPlayer(p) {
  return {
    id: p.id, username: p.username, gender: p.gender, classId: p.classId,
    x: p.x, z: p.z, level: p.level, hp: p.hp, maxHp: p.maxHp, mp: p.mp,
    maxMp: p.maxMp, atk: p.atk, def: p.def, gold: p.gold, duelId: p.duelId || null,
  };
}
function sendTo(id, message) {
  const ws = [...wss.clients].find((c) => c.playerId === id);
  if (ws?.readyState === 1) ws.send(JSON.stringify(message));
}
function broadcast(message, exceptId = null) {
  const raw = JSON.stringify(message);
  for (const ws of wss.clients) {
    if (ws.readyState !== 1 || ws.playerId === exceptId) continue;
    ws.send(raw);
  }
}
async function persistPlayer(p) {
  if (!pool) return;
  await pool.query(`INSERT INTO players (id, username, gender, class_id, x, z, level, hp, mp, gold, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, gender=EXCLUDED.gender,
      class_id=EXCLUDED.class_id, x=EXCLUDED.x, z=EXCLUDED.z, level=EXCLUDED.level,
      hp=EXCLUDED.hp, mp=EXCLUDED.mp, gold=EXCLUDED.gold, updated_at=NOW()`,
    [p.id, p.username, p.gender, p.classId, p.x, p.z, p.level, p.hp, p.mp, p.gold]);
}
function cooldownKey(fromId, toId) { return `${fromId}:${toId}`; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function duelOf(playerId) {
  for (const d of duels.values()) if (d.a === playerId || d.b === playerId) return d;
  return null;
}
function otherId(duel, playerId) { return duel.a === playerId ? duel.b : duel.a; }
function safePlayer(id) { return players.get(id); }

function finishDuel(duel, winnerId, loserId) {
  if (!duels.has(duel.id)) return;
  const winner = safePlayer(winnerId);
  const loser = safePlayer(loserId);
  if (!winner || !loser) { duels.delete(duel.id); return; }
  const transferred = Math.floor(Math.max(0, loser.gold) * 0.01);
  loser.gold = Math.max(0, loser.gold - transferred);
  winner.gold += transferred;
  loser.hp = 0;
  winner.hp = Math.max(1, winner.hp);
  winner.duelId = null;
  loser.duelId = null;
  winner.x = CITY.x; winner.z = CITY.z;
  loser.x = CITY.x; loser.z = CITY.z;
  const event = {
    duelId: duel.id, winnerId, loserId,
    winnerGold: winner.gold, loserGold: loser.gold,
    transferredGold: transferred, city: CITY,
  };
  sendTo(winnerId, { type: 'duel_ended', event });
  sendTo(loserId, { type: 'duel_ended', event });
  broadcast({ type: 'player_state', player: publicPlayer(winner) }, null);
  broadcast({ type: 'player_state', player: publicPlayer(loser) }, null);
  duels.delete(duel.id);
  persistPlayer(winner).catch(() => {});
  persistPlayer(loser).catch(() => {});
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
          id, username: String(msg.username || 'Hero').slice(0, 24),
          gender: msg.gender === 'female' ? 'female' : 'male',
          classId: String(msg.classId || 'berserker'),
          x: Number(msg.x) || 0, z: Number(msg.z) || 24,
          level: Math.max(1, Number(msg.level) || 1),
          hp: Math.max(1, Number(msg.hp) || 200), maxHp: Math.max(1, Number(msg.maxHp) || Number(msg.hp) || 200),
          mp: Math.max(0, Number(msg.mp) || 100), maxMp: Math.max(1, Number(msg.maxMp) || Number(msg.mp) || 100),
          atk: Math.max(1, Number(msg.atk) || 20), def: Math.max(0, Number(msg.def) || 10),
          gold: Math.max(0, Number(msg.gold) || 0), duelId: null,
        };
        players.set(id, p);
        await persistPlayer(p);
        ws.send(JSON.stringify({ type: 'joined', player: publicPlayer(p) }));
        broadcast({ type: 'player_joined', player: publicPlayer(p) }, id);
      } else if (msg.type === 'state') {
        const p = players.get(id); if (!p) return;
        const d = duelOf(id);
        if (d) {
          const opponent = safePlayer(otherId(d, id));
          // During a duel the server owns position. Clients cannot flee the arena.
          if (opponent) {
            const dx = p.x - ARENA.x, dz = p.z - ARENA.z;
            const dist = Math.hypot(dx, dz);
            if (dist > ARENA.radius) { p.x = ARENA.x + (dx / dist) * (ARENA.radius - 1); p.z = ARENA.z + (dz / dist) * (ARENA.radius - 1); }
          }
        } else {
          if (Number.isFinite(msg.x)) p.x = Number(msg.x);
          if (Number.isFinite(msg.z)) p.z = Number(msg.z);
        }
        if (Number.isFinite(msg.level)) p.level = Math.max(1, Number(msg.level));
        if (Number.isFinite(msg.hp) && !d) p.hp = Math.max(0, Math.min(p.maxHp, Number(msg.hp)));
        if (Number.isFinite(msg.maxHp)) p.maxHp = Math.max(1, Number(msg.maxHp));
        if (Number.isFinite(msg.mp) && !d) p.mp = Math.max(0, Math.min(p.maxMp, Number(msg.mp)));
        if (Number.isFinite(msg.maxMp)) p.maxMp = Math.max(1, Number(msg.maxMp));
        if (Number.isFinite(msg.atk)) p.atk = Math.max(1, Number(msg.atk));
        if (Number.isFinite(msg.def)) p.def = Math.max(0, Number(msg.def));
        if (Number.isFinite(msg.gold)) p.gold = Math.max(0, Number(msg.gold));
        broadcast({ type: 'player_state', player: publicPlayer(p) }, id);
        const now = Date.now();
        if (!lastPersist.has(id) || now - lastPersist.get(id) > 5000) { lastPersist.set(id, now); persistPlayer(p).catch(() => {}); }
      } else if (msg.type === 'duel_request') {
        const from = safePlayer(id), target = safePlayer(String(msg.targetId || ''));
        if (!from || !target || from.id === target.id) return;
        if (duelOf(id) || duelOf(target.id)) { sendTo(id, { type: 'duel_error', message: 'یکی از بازیکنان در دوئل است.' }); return; }
        if (distance(from, target) > DUEL_MAX_RANGE) { sendTo(id, { type: 'duel_error', message: 'برای درخواست دوئل باید نزدیک بازیکن باشید.' }); return; }
        const key = cooldownKey(id, target.id), until = duelCooldowns.get(key) || 0;
        if (until > Date.now()) { sendTo(id, { type: 'duel_error', message: `تا ${Math.ceil((until - Date.now()) / 60000)} دقیقه دیگر نمی‌توانید درخواست بدهید.` }); return; }
        const requestId = randomUUID();
        const request = { requestId, from: publicPlayer(from), expiresAt: Date.now() + DUEL_REQUEST_TTL };
        duelRequests.set(requestId, { requestId, fromId: id, targetId: target.id, expiresAt: request.expiresAt });
        sendTo(target.id, { type: 'duel_request_received', request });
        sendTo(id, { type: 'duel_request_sent', requestId, targetId: target.id });
        setTimeout(() => {
          const r = duelRequests.get(requestId); if (!r) return;
          duelRequests.delete(requestId);
          sendTo(r.fromId, { type: 'duel_request_expired', requestId, from: publicPlayer(from) });
          sendTo(r.targetId, { type: 'duel_request_expired', requestId, from: publicPlayer(from) });
        }, DUEL_REQUEST_TTL + 100);
      } else if (msg.type === 'duel_response') {
        const r = duelRequests.get(String(msg.requestId || '')); if (!r || r.targetId !== id) return;
        duelRequests.delete(r.requestId);
        const from = safePlayer(r.fromId), target = safePlayer(r.targetId);
        if (!from || !target) return;
        if (!msg.accept) {
          duelCooldowns.set(cooldownKey(from.id, target.id), Date.now() + DUEL_REJECT_COOLDOWN);
          sendTo(from.id, { type: 'duel_declined', target: publicPlayer(target), cooldownMs: DUEL_REJECT_COOLDOWN });
          return;
        }
        if (duelOf(from.id) || duelOf(target.id)) return;
        const duel = { id: randomUUID(), a: from.id, b: target.id, startedAt: Date.now() };
        duels.set(duel.id, duel);
        from.duelId = duel.id; target.duelId = duel.id;
        from.x = ARENA.x - 8; from.z = ARENA.z;
        target.x = ARENA.x + 8; target.z = ARENA.z;
        from.hp = Math.max(1, from.hp); target.hp = Math.max(1, target.hp);
        sendTo(from.id, { type: 'duel_started', duelId: duel.id, opponent: publicPlayer(target), arena: ARENA, spawn: { x: from.x, z: from.z } });
        sendTo(target.id, { type: 'duel_started', duelId: duel.id, opponent: publicPlayer(from), arena: ARENA, spawn: { x: target.x, z: target.z } });
        broadcast({ type: 'player_state', player: publicPlayer(from) }, null);
        broadcast({ type: 'player_state', player: publicPlayer(target) }, null);
      } else if (msg.type === 'duel_action') {
        const p = safePlayer(id), d = duelOf(id); if (!p || !d) return;
        const targetId = otherId(d, id), target = safePlayer(targetId); if (!target) return;
        const slot = Math.max(0, Math.min(5, Number(msg.skillSlot) || 0));
        if (distance(p, target) > DUEL_ATTACK_RANGE) return;
        const mults = SKILLS[p.classId] || SKILLS.berserker;
        const mps = SKILL_MP[p.classId] || SKILL_MP.berserker;
        const mpCost = mps[slot] || 0;
        if (p.mp < mpCost) return;
        if (mpCost) p.mp -= mpCost;
        const raw = p.atk * mults[slot];
        const damage = Math.max(1, Math.round(raw - target.def * 0.35));
        target.hp = Math.max(0, target.hp - damage);
        const event = { duelId: d.id, attackerId: id, targetId, damage, hp: target.hp, maxHp: target.maxHp, skillSlot: slot };
        sendTo(id, { type: 'duel_damage', event });
        sendTo(targetId, { type: 'duel_damage', event });
        broadcast({ type: 'player_state', player: publicPlayer(target) }, null);
        if (target.hp <= 0) finishDuel(d, id, targetId);
      }
    } catch (err) { console.error('WS message error:', err); }
  });

  ws.on('close', async () => {
    const p = players.get(id);
    const d = duelOf(id);
    if (d) {
      const opponent = safePlayer(otherId(d, id));
      if (opponent) finishDuel(d, opponent.id, id);
    }
    players.delete(id); lastPersist.delete(id);
    if (p) await persistPlayer(p).catch(() => {});
    broadcast({ type: 'player_left', id });
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false; ws.ping();
  }
  const now = Date.now();
  for (const [k, until] of duelCooldowns) if (until <= now) duelCooldowns.delete(k);
}, 30000);

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

initDb().then(() => server.listen(port, () => console.log(`Tartaros server listening on ${port}`)))
  .catch((err) => { console.error('Database init failed:', err); process.exit(1); });
