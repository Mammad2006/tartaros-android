import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Coins,
  Globe,
  LogOut,
  Pause,
  Plus,
  Settings,
  Sparkles,
  Store,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { CLASSES, ITEMS, TOWN_NPCS } from '../game/data';
import { TRANSLATIONS } from '../game/i18n';
import {
  ClassId,
  FpsCap,
  GameSettings,
  GraphicsQuality,
  HeroStats,
  InventoryEntry,
  Language,
  NpcDef,
  QuestDef,
} from '../game/types';
import { ItemIcon, RARITY_BORDER, RARITY_TEXT } from './ItemIcon';

interface NpcShopModalProps {
  npc: NpcDef;
  language: Language;
  stats: HeroStats;
  inventory: InventoryEntry[];
  quests: QuestDef[];
  onBuyItem: (itemId: string) => void;
  onSellItem: (uid: string) => void;
  onTurnInQuest: (questId: QuestDef['id']) => void;
  onClose: () => void;
}

export const NpcShopModal: React.FC<NpcShopModalProps> = ({
  npc: initialNpc,
  language,
  stats,
  inventory,
  quests,
  onBuyItem,
  onSellItem,
  onTurnInQuest,
  onClose,
}) => {
  const t = TRANSLATIONS[language];
  const [npc, setNpc] = useState<NpcDef>(initialNpc);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [showAllMarket, setShowAllMarket] = useState(false);
  const [catFilter, setCatFilter] = useState<string>('all');

  const readyQuests = quests.filter((q) => !q.completed && q.current >= q.target);

  const buyListIds = useMemo(() => {
    if (!showAllMarket) return npc.shopItemIds;
    return Object.values(ITEMS)
      .filter((it) => it.price > 0 && (catFilter === 'all' || it.category === catFilter))
      .map((it) => it.id);
  }, [npc.shopItemIds, showAllMarket, catFilter]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-3">
      <div className="tartaros-panel w-full max-w-4xl h-[92vh] rounded-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#c4984a]/30 bg-[#121015] shrink-0">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[#e0a943]" />
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-[#fde68a]">
                {npc.name}
              </h2>
              <p className="text-[10px] text-[#a89f91]">{npc.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 border border-[#c4984a]/35">
              <Coins className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="font-mono-num text-xs font-bold text-[#fde68a]">
                {stats.gold.toLocaleString()}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center text-[#f3ead8] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e0d12] border-b border-white/10 overflow-x-auto shrink-0">
          {TOWN_NPCS.map((n) => (
            <button
              key={n.id}
              onClick={() => setNpc(n)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                npc.id === n.id
                  ? 'bg-[#e0a943]/20 border border-[#e0a943] text-[#fde68a]'
                  : 'bg-white/5 border border-white/10 text-[#a89f91]'
              }`}
            >
              {n.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
          <div className="p-2.5 rounded-lg border border-[#c4984a]/35 bg-[#18151d]">
            <p className="text-xs text-[#ece3d3]">"{npc.greeting}"</p>
            {npc.role === 'quest' && readyQuests.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
                {readyQuests.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-2 p-2 rounded bg-amber-950/35 border border-amber-500/50"
                  >
                    <div className="text-xs font-bold text-[#fde68a]">{q.title}</div>
                    <button
                      onClick={() => onTurnInQuest(q.id)}
                      className="px-3 py-1 rounded bg-[#e0a943] text-[#120d06] text-xs font-bold cursor-pointer"
                    >
                      دریافت پاداش
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode('buy')}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  mode === 'buy' ? 'bg-[#e0a943] text-[#120d06]' : 'bg-white/5 text-[#c7b99e]'
                }`}
              >
                {t.buyItem}
              </button>
              <button
                onClick={() => setMode('sell')}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  mode === 'sell' ? 'bg-[#e0a943] text-[#120d06]' : 'bg-white/5 text-[#c7b99e]'
                }`}
              >
                {t.sellItem} ({inventory.length})
              </button>
            </div>

            {mode === 'buy' && (
              <button
                onClick={() => setShowAllMarket((v) => !v)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                  showAllMarket
                    ? 'bg-emerald-700/30 border-emerald-400 text-emerald-200'
                    : 'bg-white/5 border-white/15 text-[#c7b99e]'
                }`}
              >
                {showAllMarket ? 'بازار کامل (۲۰۰ آیتم)' : 'نمایش کل بازار (۲۰۰ آیتم)'}
              </button>
            )}
          </div>

          {mode === 'buy' && showAllMarket && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {['all', 'weapon', 'helmet', 'armor', 'cloak', 'gauntlets', 'boots', 'ring', 'amulet', 'consumable'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] capitalize cursor-pointer ${
                      catFilter === cat
                        ? 'bg-[#e0a943] text-[#120d06] font-bold'
                        : 'bg-white/5 text-[#a89f91]'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          )}

          {mode === 'buy' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {buyListIds.map((id) => {
                const item = ITEMS[id];
                if (!item) return null;
                const canAfford = stats.gold >= item.price;
                return (
                  <div
                    key={id}
                    className={`p-2 rounded-lg border bg-[#16141b] flex items-center justify-between gap-2 ${RARITY_BORDER[item.rarity]}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-10 h-10 rounded-lg tartaros-slot flex items-center justify-center shrink-0">
                        <ItemIcon iconKey={item.iconKey} className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${RARITY_TEXT[item.rarity]}`}>
                          {item.name}
                        </div>
                        <div className="text-[10px] text-[#a89f91] truncate">
                          {Object.entries(item.stats)
                            .map(([k, v]) => `${k.toUpperCase()}+${v}`)
                            .join(' ') || item.description}
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => onBuyItem(id)}
                      className={`px-2.5 py-1 rounded text-xs font-bold font-mono-num shrink-0 cursor-pointer ${
                        canAfford ? 'bg-[#e0a943] text-[#120d06]' : 'bg-white/5 text-[#78716c]'
                      }`}
                    >
                      {item.price} G
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {inventory.map((entry) => {
                const item = ITEMS[entry.itemId];
                if (!item) return null;
                return (
                  <div
                    key={entry.uid}
                    className="p-2 rounded-lg border border-white/10 bg-[#16141b] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-lg tartaros-slot flex items-center justify-center shrink-0">
                        <ItemIcon iconKey={item.iconKey} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${RARITY_TEXT[item.rarity]}`}>
                          {item.name} {entry.quantity > 1 ? `x${entry.quantity}` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onSellItem(entry.uid)}
                      className="px-2.5 py-1 rounded bg-white/10 border border-[#c4984a]/40 text-[#fde68a] text-xs font-bold font-mono-num cursor-pointer"
                    >
                      +{item.sellPrice} G
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SkillsQuestsModalProps {
  tab: 'skills' | 'quests';
  language: Language;
  classId: ClassId;
  stats: HeroStats;
  skillLevels: Record<string, number>;
  quests: QuestDef[];
  onUpgradeSkill: (skillId: string) => void;
  onClose: () => void;
}

export const SkillsQuestsModal: React.FC<SkillsQuestsModalProps> = ({
  tab,
  language,
  classId,
  stats,
  skillLevels,
  quests,
  onUpgradeSkill,
  onClose,
}) => {
  const t = TRANSLATIONS[language];
  const classDef = CLASSES.find((c) => c.id === classId) || CLASSES[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
      <div className="tartaros-panel w-full max-w-3xl max-h-[90vh] rounded-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#c4984a]/30 bg-[#121015]">
          <div className="flex items-center gap-2">
            {tab === 'skills' ? (
              <Sparkles className="w-5 h-5 text-[#e0a943]" />
            ) : (
              <BookOpen className="w-5 h-5 text-[#e0a943]" />
            )}
            <h2 className="font-display text-sm sm:text-base font-bold tartaros-gold-text">
              {tab === 'skills'
                ? `${classDef.persianName} (${t.skillTokens}: ${stats.skillTokens})`
                : t.quests}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center text-[#f3ead8] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {tab === 'skills'
            ? classDef.skills.map((skill) => {
                const rank = skillLevels[skill.id] || 1;
                const unlocked = stats.level >= skill.unlockLevel;
                return (
                  <div
                    key={skill.id}
                    className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 ${
                      unlocked
                        ? 'border-[#c4984a]/45 bg-[#16141b]'
                        : 'border-white/10 bg-[#100f14] opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xs sm:text-sm text-[#fde68a]">
                          {language === 'fa' ? skill.persianName : skill.name}{' '}
                          <span className="font-mono-num text-[11px] text-emerald-400">
                            (Lv.{rank})
                          </span>
                        </h3>
                        <span className="font-mono-num text-[10px] text-[#7dd3fc]">
                          {skill.mpCost} MP
                        </span>
                      </div>
                      <p className="text-[11px] text-[#d6cfc2] mt-0.5">{skill.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px]">
                      <span className="font-mono-num text-[#c7b99e]">
                        {unlocked
                          ? `${Math.round((skill.damageMultiplier + (rank - 1) * 0.25) * 100)}% DMG`
                          : `Lv.${skill.unlockLevel}`}
                      </span>
                      {unlocked && stats.skillTokens > 0 && (
                        <button
                          onClick={() => onUpgradeSkill(skill.id)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Upgrade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            : quests.map((q) => (
                <div
                  key={q.id}
                  className="p-3 rounded-lg border border-[#c4984a]/40 bg-[#16141b] space-y-1 sm:col-span-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#e0a943]">{q.type}</span>
                    {q.completed ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Completed
                      </span>
                    ) : (
                      <span className="font-mono-num text-xs text-[#fde68a]">
                        {q.current} / {q.target}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-sm font-bold text-[#f3ead8]">{q.title}</h3>
                  <p className="text-xs text-[#c7b99e]">{q.description}</p>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

/* SETTINGS MODAL (FPS, GRAPHICS, MUSIC & SFX VOLUME, PERSIAN/ENGLISH LANGUAGE, RESET SAVE) */
export const SettingsModal: React.FC<{
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onResetSave: () => void;
  onClose: () => void;
}> = ({ settings, onChange, onResetSave, onClose }) => {
  const t = TRANSLATIONS[settings.language];
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4">
      <div className="tartaros-panel w-full max-w-lg max-h-[92vh] rounded-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#c4984a]/30 bg-[#121015]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#e0a943]" />
            <h2 className="font-display text-base font-bold tartaros-gold-text">{t.settings}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center text-[#f3ead8] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar space-y-3 text-xs sm:text-sm">
          {/* FPS Cap */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#ece3d3] font-semibold">{t.fpsCap}</span>
            <div className="flex items-center gap-1.5">
              {([30, 60, 120] as FpsCap[]).map((fps) => (
                <button
                  key={fps}
                  onClick={() => onChange({ ...settings, fpsCap: fps })}
                  className={`px-3 py-1 rounded font-mono-num text-xs font-bold cursor-pointer ${
                    settings.fpsCap === fps
                      ? 'bg-[#e0a943] text-[#120d06]'
                      : 'bg-white/5 border border-white/15 text-[#c7b99e]'
                  }`}
                >
                  {fps}
                </button>
              ))}
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#ece3d3] font-semibold">{t.graphics}</span>
            <div className="flex items-center gap-1.5">
              {([
                { id: 'low' as GraphicsQuality, label: t.low },
                { id: 'medium' as GraphicsQuality, label: t.medium },
                { id: 'high' as GraphicsQuality, label: t.high },
              ]).map((g) => (
                <button
                  key={g.id}
                  onClick={() => onChange({ ...settings, graphics: g.id })}
                  className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                    settings.graphics === g.id
                      ? 'bg-[#e0a943] text-[#120d06]'
                      : 'bg-white/5 border border-white/15 text-[#c7b99e]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Music Volume */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#ece3d3] font-semibold flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#e0a943]" />
                {t.bgmVolume}
              </span>
              <span className="font-mono-num text-xs text-[#fde68a]">
                {Math.round(settings.bgmVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.bgmVolume * 100)}
              onChange={(e) => onChange({ ...settings, bgmVolume: Number(e.target.value) / 100 })}
              className="w-full accent-[#e0a943] cursor-pointer"
            />
          </div>

          {/* SFX Volume */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#ece3d3] font-semibold flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-sky-400" />
                {t.sfxVolume}
              </span>
              <span className="font-mono-num text-xs text-[#fde68a]">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) => onChange({ ...settings, sfxVolume: Number(e.target.value) / 100 })}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          {/* Language Toggle (Persian / English ONLY) */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
            <span className="text-[#ece3d3] font-semibold flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              {t.language}
            </span>
            <div className="flex items-center gap-1.5">
              {([
                { id: 'fa' as Language, label: 'فارسی' },
                { id: 'en' as Language, label: 'English' },
              ]).map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => onChange({ ...settings, language: lang.id })}
                  className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                    settings.language === lang.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/5 border border-white/15 text-[#c7b99e]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Saved Game */}
          <div className="pt-2 border-t border-white/10">
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-2 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-red-900/60 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.resetSave}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-1.5 rounded bg-white/10 text-xs text-[#d6cfc2] cursor-pointer"
                >
                  لغو / Cancel
                </button>
                <button
                  onClick={onResetSave}
                  className="flex-1 py-1.5 rounded bg-red-600 text-xs font-bold text-white cursor-pointer"
                >
                  تایید حذف / Confirm
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* EXIT / PAUSE CONFIRMATION MODAL */
export const ExitPauseModal: React.FC<{
  language: Language;
  isPaused: boolean;
  onTogglePause: () => void;
  onExitGame: () => void;
  onClose: () => void;
}> = ({ language, isPaused, onTogglePause, onExitGame, onClose }) => {
  const t = TRANSLATIONS[language];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
      <div className="tartaros-panel max-w-sm w-full rounded-xl p-5 text-center space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-[#fde68a]">
            {t.exitConfirmTitle}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded bg-white/5 flex items-center justify-center text-[#d6cfc2] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#ece3d3]">{t.exitConfirmBody}</p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onTogglePause}
            className="py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Pause className="w-4 h-4" />
            <span>{isPaused ? t.resumeBtn : t.pauseBtn}</span>
          </button>
          <button
            onClick={onExitGame}
            className="py-2.5 px-3 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.exitBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
