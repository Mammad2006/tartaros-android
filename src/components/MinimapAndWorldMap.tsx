import React, { useEffect, useRef, useState } from 'react';
import { Compass, MapPin, Minus, Plus, Store, Swords, UserCheck, X } from 'lucide-react';
import { TOWN_NPCS, WORLD_REGIONS } from '../game/data';
import { NpcDef, WorldRegion } from '../game/types';

interface MapEntityDot {
  id: string;
  x: number;
  z: number;
  isBoss?: boolean;
}

let cachedMapImg: HTMLImageElement | null = null;
let cachedMapReady = false;
const mapListeners = new Set<() => void>();

function ensureMapImage(): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;
  if (!cachedMapImg) {
    cachedMapImg = new Image();
    cachedMapImg.src = '/assets/aistudio/map_01028c3c.png';
    cachedMapImg.onload = () => {
      cachedMapReady = true;
      mapListeners.forEach((cb) => cb());
    };
  }
  return cachedMapImg;
}

export function drawAstarotCartography(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerX: number,
  centerZ: number,
  scale: number, // pixels per world unit
  playerX: number,
  playerZ: number,
  playerRotY: number,
  enemies: MapEntityDot[],
  showLabels: boolean
) {
  const toCanvas = (wx: number, wz: number) => ({
    x: width / 2 + (wx - centerX) * scale,
    y: height / 2 + (wz - centerZ) * scale,
  });

  // 1. Deep Ocean Backdrop
  ctx.fillStyle = '#071422';
  ctx.fillRect(0, 0, width, height);

  // 2. Render User's Uploaded Illustrated Map Image across the 2400x2400 World!
  const img = ensureMapImage();
  const tl = toCanvas(-1200, -1200);
  const br = toCanvas(1200, 1200);
  const mapW = br.x - tl.x;
  const mapH = br.y - tl.y;

  if (img && cachedMapReady && img.naturalWidth > 0) {
    ctx.drawImage(img, tl.x, tl.y, mapW, mapH);
  } else {
    ctx.fillStyle = '#233b23';
    ctx.fillRect(tl.x, tl.y, mapW, mapH);
  }

  // Subtle tactical border
  ctx.strokeStyle = '#c4984a';
  ctx.lineWidth = 2;
  ctx.strokeRect(tl.x, tl.y, mapW, mapH);

  // 3. Town NPCs Pins
  TOWN_NPCS.forEach((npc) => {
    const np = toCanvas(npc.x, npc.z);
    ctx.fillStyle = npc.role === 'quest' ? '#fbbf24' : '#fb923c';
    ctx.strokeStyle = '#090a0d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(np.x, np.y, Math.max(3, Math.min(6, scale * 18)), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (showLabels && scale >= 0.45) {
      ctx.font = '700 10px "Vazirmatn", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillText(npc.name, np.x + 1, np.y - 8);
      ctx.fillStyle = '#fef3c7';
      ctx.fillText(npc.name, np.x, np.y - 9);
    }
  });

  // 4. Enemies & Boss Pins
  enemies.forEach((e) => {
    const ep = toCanvas(e.x, e.z);
    ctx.fillStyle = e.isBoss ? '#ef4444' : '#f87171';
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, e.isBoss ? 5.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (e.isBoss) {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  });

  // 5. Region Labels on Full Map
  if (showLabels) {
    WORLD_REGIONS.forEach((r) => {
      const rp = toCanvas(r.x, r.z);
      ctx.font = '700 11px "Cinzel", "Vazirmatn", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.88)';
      ctx.fillText(r.persianName, rp.x + 1, rp.y - 12);
      ctx.fillStyle = '#fde68a';
      ctx.fillText(r.persianName, rp.x, rp.y - 13);
    });
  }

  // 6. Google Maps-Style Live Player GPS Beacon + Directional View Cone!
  const pp = toCanvas(playerX, playerZ);
  ctx.save();
  ctx.translate(pp.x, pp.y);

  // Soft Blue GPS Accuracy Halo
  ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  // Directional Vision Cone
  ctx.save();
  ctx.rotate(-playerRotY + Math.PI);
  const coneGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
  coneGrad.addColorStop(0, 'rgba(56, 189, 248, 0.75)');
  coneGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 22, -Math.PI * 0.72, -Math.PI * 0.28);
  ctx.closePath();
  ctx.fill();

  // Sharp White-Trimmed Navigation Arrow
  ctx.fillStyle = '#0ea5e9';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 5);
  ctx.lineTo(0, 2);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

interface MinimapWidgetProps {
  region: WorldRegion;
  playerX: number;
  playerZ: number;
  playerRotY: number;
  enemies: MapEntityDot[];
  onOpenFullMap: () => void;
  onAdjustZoom: (delta: number) => void;
}

export const MinimapWidget: React.FC<MinimapWidgetProps> = ({
  region,
  playerX,
  playerZ,
  playerRotY,
  enemies,
  onOpenFullMap,
  onAdjustZoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setMapLoadedTick] = useState(0);

  useEffect(() => {
    const cb = () => setMapLoadedTick((t) => t + 1);
    mapListeners.add(cb);
    ensureMapImage();
    return () => {
      mapListeners.delete(cb);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawAstarotCartography(
      ctx,
      128,
      128,
      playerX,
      playerZ,
      0.24,
      playerX,
      playerZ,
      playerRotY,
      enemies,
      false
    );
  }, [playerX, playerZ, playerRotY, enemies]);

  return (
    <div className="flex flex-col items-center pointer-events-auto">
      <div className="relative w-[112px] h-[112px] sm:w-[124px] sm:h-[124px] rounded-full border-2 border-[#d49c42] shadow-[0_8px_24px_rgba(0,0,0,0.85)] overflow-hidden bg-[#071422]">
        <button
          onClick={onOpenFullMap}
          className="w-full h-full block cursor-pointer focus:outline-none"
          title="کلیک برای باز کردن نقشه کامل"
        >
          <canvas ref={canvasRef} width={128} height={128} className="w-full h-full block" />
        </button>

        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-display font-bold text-[#fde68a] bg-[#0d0c10]/85 px-1.5 rounded pointer-events-none">
          N
        </span>

        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdjustZoom(-0.35);
            }}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#121116]/90 border border-[#c4984a]/60 flex items-center justify-center text-[#fde68a] cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdjustZoom(0.35);
            }}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#121116]/90 border border-[#c4984a]/60 flex items-center justify-center text-[#fde68a] cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <button
        onClick={onOpenFullMap}
        className="-mt-2 px-2.5 py-0.5 rounded border border-[#c4984a]/75 bg-[#121015]/95 text-[10px] sm:text-[11px] font-display font-semibold text-[#fde68a] shadow-md whitespace-nowrap cursor-pointer"
      >
        {region.persianName}
      </button>
    </div>
  );
};

interface WorldMapModalProps {
  playerX: number;
  playerZ: number;
  playerRotY: number;
  enemies: MapEntityDot[];
  onClose: () => void;
  onTravelTo: (x: number, z: number, zoomLevel: 'close' | 'adventure', openNpc?: NpcDef) => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  playerX,
  playerZ,
  playerRotY,
  enemies,
  onClose,
  onTravelTo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(0.24);
  const [pan, setPan] = useState({ x: 0, z: 0 });
  const [selectedRegion, setSelectedRegion] = useState<WorldRegion>(WORLD_REGIONS[0]);
  const [selectedNpc, setSelectedNpc] = useState<NpcDef | null>(null);
  const dragging = useRef({ active: false, lastX: 0, lastY: 0 });
  const [, setMapTick] = useState(0);

  useEffect(() => {
    const cb = () => setMapTick((t) => t + 1);
    mapListeners.add(cb);
    ensureMapImage();
    return () => {
      mapListeners.delete(cb);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawAstarotCartography(
      ctx,
      canvas.width,
      canvas.height,
      pan.x,
      pan.z,
      zoom,
      playerX,
      playerZ,
      playerRotY,
      enemies,
      true
    );
  }, [pan, zoom, playerX, playerZ, playerRotY, enemies]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const wx = pan.x + (cx - canvas.width / 2) / zoom;
    const wz = pan.z + (cy - canvas.height / 2) / zoom;

    const npc = TOWN_NPCS.find((n) => Math.hypot(n.x - wx, n.z - wz) < 42);
    if (npc) {
      setSelectedNpc(npc);
      setPan({ x: npc.x, z: npc.z });
      setZoom(0.85);
      return;
    }

    const reg = WORLD_REGIONS.find((r) => Math.hypot(r.x - wx, r.z - wz) < r.size + 45);
    if (reg) {
      setSelectedNpc(null);
      setSelectedRegion(reg);
      setPan({ x: reg.x, z: reg.z });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-3">
      <div className="tartaros-panel w-full max-w-6xl h-[94vh] rounded-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#c4984a]/30 bg-[#121015] shrink-0">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-[#e0a943]" />
            <h2 className="font-display text-sm sm:text-base font-bold tartaros-gold-text">
              نقشه جامع دنیای تارتاروس (Google Maps GPS)
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setPan({ x: playerX, z: playerZ });
                setZoom(0.55);
              }}
              className="px-2.5 py-1 rounded bg-sky-600/25 border border-sky-400/70 text-sky-200 text-xs font-semibold cursor-pointer"
            >
              موقعیت من
            </button>
            <button
              onClick={() => {
                setPan({ x: 0, z: 0 });
                setZoom(0.22);
              }}
              className="px-2.5 py-1 rounded bg-white/5 border border-white/15 text-[#d6cfc2] text-xs font-medium cursor-pointer"
            >
              کل نقشه
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center text-[#f3ead8] hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-row overflow-hidden min-h-0">
          <div className="relative flex-1 bg-[#071422] overflow-hidden">
            <canvas
              ref={canvasRef}
              width={780}
              height={540}
              onClick={handleCanvasClick}
              onWheel={(e) => {
                e.preventDefault();
                setZoom((z) => Math.min(1.6, Math.max(0.18, z - e.deltaY * 0.0008)));
              }}
              onPointerDown={(e) => {
                dragging.current = { active: true, lastX: e.clientX, lastY: e.clientY };
              }}
              onPointerMove={(e) => {
                if (!dragging.current.active) return;
                const dx = e.clientX - dragging.current.lastX;
                const dy = e.clientY - dragging.current.lastY;
                dragging.current.lastX = e.clientX;
                dragging.current.lastY = e.clientY;
                setPan((p) => ({
                  x: Math.max(-1100, Math.min(1100, p.x - dx / zoom)),
                  z: Math.max(-1100, Math.min(1100, p.z - dy / zoom)),
                }));
              }}
              onPointerUp={() => {
                dragging.current.active = false;
              }}
              className="w-full h-full object-cover cursor-grab active:cursor-grabbing touch-none"
            />

            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/80 border border-white/10 text-[10px] font-mono-num text-[#fde68a]">
              GPS: ({Math.round(playerX)}, {Math.round(playerZ)})
            </div>

            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-[#110f14]/90 border border-[#c4984a]/50 rounded-lg p-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.18, z - 0.12))}
                className="w-7 h-7 rounded bg-white/5 flex items-center justify-center text-[#fde68a] cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(1.6, z + 0.12))}
                className="w-7 h-7 rounded bg-white/5 flex items-center justify-center text-[#fde68a] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="w-60 sm:w-72 border-l border-[#c4984a]/30 bg-[#110f15] p-2.5 flex flex-col gap-2.5 overflow-y-auto custom-scrollbar shrink-0">
            {selectedNpc ? (
              <div className="p-2.5 rounded-lg border border-[#e0a943]/60 bg-[#1b1713]">
                <div className="flex items-center gap-1.5 text-[#fde68a] font-bold text-xs">
                  <Store className="w-3.5 h-3.5" />
                  <span>{selectedNpc.name}</span>
                </div>
                <p className="text-[11px] text-[#c7b99e] mt-1">{selectedNpc.greeting}</p>
                <button
                  onClick={() => onTravelTo(selectedNpc.x, selectedNpc.z + 4, 'close', selectedNpc)}
                  className="mt-2 w-full py-1.5 rounded bg-gradient-to-b from-[#e0a943] to-[#a36c1b] text-[#120d06] font-bold text-xs cursor-pointer"
                >
                  سفر سریع به مغازه
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg border border-[#c4984a]/40 bg-[#18161d]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-[#fde68a]">{selectedRegion.persianName}</h3>
                  <span className="font-mono-num text-[10px] text-[#c7b99e]">
                    Lv.{selectedRegion.recommendedLevel}+
                  </span>
                </div>
                <p className="text-[10px] text-[#ded5c5] mt-1">{selectedRegion.description}</p>
                <button
                  onClick={() =>
                    onTravelTo(
                      selectedRegion.x,
                      selectedRegion.z + (selectedRegion.biome === 'city' ? 14 : 0),
                      selectedRegion.biome === 'city' ? 'close' : 'adventure'
                    )
                  }
                  className="mt-2 w-full py-1.5 rounded bg-gradient-to-b from-[#e0a943] to-[#a36c1b] text-[#120d06] font-bold text-xs cursor-pointer"
                >
                  انتقال به {selectedRegion.persianName}
                </button>
              </div>
            )}

            <div>
              <h4 className="text-[11px] font-bold text-[#c4984a] mb-1">مناطق ۹گانه نقشه</h4>
              <div className="space-y-1">
                {WORLD_REGIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedNpc(null);
                      setSelectedRegion(r);
                      setPan({ x: r.x, z: r.z });
                      setZoom(0.45);
                    }}
                    className={`w-full text-left p-1.5 rounded-lg border flex items-center justify-between cursor-pointer ${
                      selectedRegion.id === r.id && !selectedNpc
                        ? 'border-[#e0a943] bg-[#e0a943]/15'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {r.biome === 'lava' ? (
                        <Swords className="w-3 h-3 text-red-400 shrink-0" />
                      ) : (
                        <MapPin className="w-3 h-3 text-[#e0a943] shrink-0" />
                      )}
                      <span className="text-[11px] font-semibold text-[#f3ead8] truncate">
                        {r.persianName}
                      </span>
                    </div>
                    <span className="font-mono-num text-[10px] text-[#c7b99e]">
                      Lv.{r.recommendedLevel}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-[#c4984a] mb-1">فروشندگان و NPC شهرها</h4>
              <div className="space-y-1">
                {TOWN_NPCS.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedNpc(n);
                      setPan({ x: n.x, z: n.z });
                      setZoom(0.85);
                    }}
                    className="w-full text-left p-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-[#f3ead8]">{n.name}</div>
                      <div className="text-[9px] text-[#a89f91]">{n.title}</div>
                    </div>
                    <UserCheck className="w-3 h-3 text-[#fbbf24]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
