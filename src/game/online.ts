export interface OnlinePlayer {
  id: string;
  username: string;
  gender: 'male' | 'female';
  classId: string;
  x: number;
  z: number;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  gold: number;
  duelId?: string | null;
}

export interface DuelRequest {
  requestId: string;
  from: OnlinePlayer;
  expiresAt: number;
}

export interface DuelState {
  duelId: string;
  active: boolean;
  opponentId: string;
  opponent: OnlinePlayer;
  arena: { x: number; z: number; radius: number };
  spawn: { x: number; z: number };
}

export interface DuelDamageEvent {
  duelId: string;
  attackerId: string;
  targetId: string;
  damage: number;
  hp: number;
  maxHp: number;
  skillSlot: number;
}

export interface DuelEndEvent {
  duelId: string;
  winnerId: string;
  loserId: string;
  winnerGold: number;
  loserGold: number;
  transferredGold: number;
  city: { x: number; z: number };
}

export class OnlineSession {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private stopped = false;
  private reconnectMs = 1000;
  private players = new Map<string, OnlinePlayer>();
  private listeners = new Set<(players: OnlinePlayer[]) => void>();
  private onStatusCb: (online: boolean) => void;
  private onDuelRequestCb: (request: DuelRequest) => void;
  private onDuelStateCb: (state: DuelState | null) => void;
  private onDuelDamageCb: (event: DuelDamageEvent) => void;
  private onDuelEndCb: (event: DuelEndEvent) => void;
  private onDuelNoticeCb: (message: string) => void;
  private player: OnlinePlayer;

  constructor(
    player: OnlinePlayer,
    onStatus: (online: boolean) => void,
    handlers?: {
      onDuelRequest?: (request: DuelRequest) => void;
      onDuelState?: (state: DuelState | null) => void;
      onDuelDamage?: (event: DuelDamageEvent) => void;
      onDuelEnd?: (event: DuelEndEvent) => void;
      onDuelNotice?: (message: string) => void;
    }
  ) {
    this.player = player;
    this.onStatusCb = onStatus;
    this.onDuelRequestCb = handlers?.onDuelRequest || (() => {});
    this.onDuelStateCb = handlers?.onDuelState || (() => {});
    this.onDuelDamageCb = handlers?.onDuelDamage || (() => {});
    this.onDuelEndCb = handlers?.onDuelEnd || (() => {});
    this.onDuelNoticeCb = handlers?.onDuelNotice || (() => {});
  }

  subscribe(cb: (players: OnlinePlayer[]) => void) {
    this.listeners.add(cb); cb([...this.players.values()]);
    return () => this.listeners.delete(cb);
  }

  start() { this.stopped = false; this.connect(); }
  stop() {
    this.stopped = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.ws?.close(); this.ws = null;
  }

  updateLocal(patch: Partial<OnlinePlayer>) {
    this.player = { ...this.player, ...patch };
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'state', ...patch }));
  }

  getLocalId() { return this.player.id; }

  requestDuel(targetId: string) {
    this.send({ type: 'duel_request', targetId });
  }
  respondDuel(requestId: string, accept: boolean) {
    this.send({ type: 'duel_response', requestId, accept });
  }
  sendDuelAction(skillSlot: number) {
    this.send({ type: 'duel_action', skillSlot });
  }

  private send(msg: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private emit() { this.listeners.forEach((cb) => cb([...this.players.values()])); }

  private connect() {
    if (this.stopped) return;
    const configured = (import.meta.env.VITE_GAME_SERVER_URL || '').trim().replace(/\/$/, '');
    const base = configured || window.location.origin;
    const wsUrl = base.startsWith('https://') ? `wss://${base.slice(8)}/ws` : base.startsWith('http://') ? `ws://${base.slice(7)}/ws` : `wss://${base}/ws`;
    try { this.ws = new WebSocket(wsUrl); } catch { this.scheduleReconnect(); return; }
    this.ws.onopen = () => {
      this.reconnectMs = 1000; this.onStatusCb(true);
      this.ws?.send(JSON.stringify({ type: 'join', ...this.player }));
    };
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'welcome') {
          this.player.id = msg.id || this.player.id;
          this.players.clear();
          for (const pl of msg.players || []) if (pl.id !== this.player.id) this.players.set(pl.id, pl);
          this.emit();
        } else if (msg.type === 'joined') {
          this.player.id = msg.player.id;
          this.player = { ...this.player, ...msg.player };
        } else if (msg.type === 'player_joined' || msg.type === 'player_state') {
          if (msg.player.id !== this.player.id) { this.players.set(msg.player.id, msg.player); this.emit(); }
        } else if (msg.type === 'player_left') {
          this.players.delete(msg.id); this.emit();
        } else if (msg.type === 'duel_request_received') {
          this.onDuelRequestCb(msg.request);
        } else if (msg.type === 'duel_started') {
          const opponent = msg.opponent as OnlinePlayer;
          this.onDuelStateCb({ duelId: msg.duelId, active: true, opponentId: opponent.id, opponent, arena: msg.arena, spawn: msg.spawn });
        } else if (msg.type === 'duel_damage') {
          this.onDuelDamageCb(msg.event);
        } else if (msg.type === 'duel_ended') {
          this.onDuelEndCb(msg.event);
          this.onDuelStateCb(null);
        } else if (msg.type === 'duel_error' || msg.type === 'duel_declined') {
          this.onDuelNoticeCb(String(msg.message || (msg.type === 'duel_declined' ? 'درخواست دوئل رد شد؛ تا یک ساعت دوباره درخواست ندهید.' : 'درخواست دوئل انجام نشد.')));
        } else if (msg.type === 'duel_request_expired') {
          this.onDuelRequestCb({ requestId: msg.requestId, from: msg.from, expiresAt: 0 });
        }
      } catch {}
    };
    this.ws.onclose = () => { this.onStatusCb(false); this.scheduleReconnect(); };
    this.ws.onerror = () => { this.onStatusCb(false); };
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => { this.reconnectTimer = null; this.connect(); }, this.reconnectMs);
    this.reconnectMs = Math.min(this.reconnectMs * 2, 30000);
  }
}
