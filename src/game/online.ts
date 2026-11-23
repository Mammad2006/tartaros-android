export interface OnlinePlayer {
  id: string;
  username: string;
  gender: 'male' | 'female';
  classId: string;
  x: number;
  z: number;
  level: number;
}

export class OnlineSession {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private stopped = false;
  private reconnectMs = 1000;
  private players = new Map<string, OnlinePlayer>();
  private listeners = new Set<(players: OnlinePlayer[]) => void>();
  private onStatusCb: (online: boolean) => void;
  private player: OnlinePlayer;

  constructor(player: OnlinePlayer, onStatus: (online: boolean) => void) {
    this.player = player;
    this.onStatusCb = onStatus;
  }

  subscribe(cb: (players: OnlinePlayer[]) => void) {
    this.listeners.add(cb); cb([...this.players.values()]);
    return () => this.listeners.delete(cb);
  }

  start() { this.stopped = false; this.connect(); }
  stop() { this.stopped = true; if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer); this.ws?.close(); this.ws = null; }

  updateLocal(patch: Partial<OnlinePlayer>) {
    this.player = { ...this.player, ...patch };
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'state', ...this.player }));
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
          for (const p of msg.players || []) if (p.id !== this.player.id) this.players.set(p.id, p);
          this.emit();
        } else if (msg.type === 'joined') {
          this.player.id = msg.player.id;
        } else if (msg.type === 'player_joined' || msg.type === 'player_state') {
          if (msg.player.id !== this.player.id) { this.players.set(msg.player.id, msg.player); this.emit(); }
        } else if (msg.type === 'player_left') {
          this.players.delete(msg.id); this.emit();
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
