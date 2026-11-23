import React, { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  BookOpen,
  ChevronLeft,
  Coins,
  Gem,
  Map,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Store,
  User,
  X,
} from 'lucide-react';
import { ITEMS } from '../game/data';
import { TRANSLATIONS } from '../game/i18n';
import { CharacterPreviewController, mountCharacterPreview } from '../game/three/CharacterPreview';
import {
  AllocatedStats,
  ClassId,
  EquipSlot,
  EquippedMap,
  Gender,
  HeroStats,
  InventoryEntry,
  Language,
  ModalTab,
} from '../game/types';
import { ItemIcon, RARITY_BORDER, RARITY_TEXT } from './ItemIcon';

interface CharacterInventoryModalProps {
  activeTab: 'character' | 'inventory';
  language: Language;
  username: string;
  gender: Gender;
  classId: ClassId;
  stats: HeroStats;
  equipped: EquippedMap;
  inventory: InventoryEntry[];
  onSwitchTab: (tab: ModalTab) => void;
  onEquipItem: (uid: string) => void;
  onUnequipSlot: (slot: EquipSlot) => void;
  onUseConsumable: (uid: string) => void;
  onAllocateStat: (statKey: keyof AllocatedStats) => void;
  onClose: () => void;
}

const LEFT_SLOTS: Array<{ slot: EquipSlot; label: string }> = [
  { slot: 'helmet', label: 'Helm' },
  { slot: 'armor', label: 'Armor' },
  { slot: 'gauntlets', label: 'Gloves' },
  { slot: 'ring', label: 'Ring' },
];

const RIGHT_SLOTS: Array<{ slot: EquipSlot; label: string }> = [
  { slot: 'cloak', label: 'Cloak' },
  { slot: 'weapon', label: 'Weapon' },
  { slot: 'boots', label: 'Boots' },
  { slot: 'amulet', label: 'Amulet' },
];

export const CharacterInventoryModal: React.FC<CharacterInventoryModalProps> = ({
  activeTab,
  language,
  username,
  gender,
  classId,
  stats,
  equipped,
  inventory,
  onSwitchTab,
  onEquipItem,
  onUnequipSlot,
  onUseConsumable,
  onAllocateStat,
  onClose,
}) => {
  const t = TRANSLATIONS[language];
  const mountRef = useRef<HTMLDivElement>(null);
  const previewCtrlRef = useRef<CharacterPreviewController | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<EquipSlot | null>(null);
  const [selectedInvUid, setSelectedInvUid] = useState<string | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const ctrl = mountCharacterPreview(el, gender, classId, equipped);
    previewCtrlRef.current = ctrl;
    return () => {
      ctrl.dispose();
      previewCtrlRef.current = null;
    };
  }, [gender, classId]);

  useEffect(() => {
    previewCtrlRef.current?.updateEquipment(equipped);
  }, [equipped]);

  // Filter inventory by selected equipment slot when a slot is clicked!
  const visibleInventory = selectedSlot
    ? inventory.filter((e) => ITEMS[e.itemId]?.category === selectedSlot)
    : inventory;

  const selectedEntry = selectedInvUid
    ? inventory.find((e) => e.uid === selectedInvUid) || null
    : null;
  const selectedInvItem = selectedEntry ? ITEMS[selectedEntry.itemId] : null;
  const selectedSlotItemId = selectedSlot ? equipped[selectedSlot] : null;
  const selectedSlotItem = selectedSlotItemId ? ITEMS[selectedSlotItemId] : null;

  const renderEquipSlot = (slot: EquipSlot, label: string) => {
    const itemId = equipped[slot];
    const item = itemId ? ITEMS[itemId] : null;
    const isFocused = selectedSlot === slot;

    return (
      <div key={slot} className="flex flex-col items-center gap-0.5">
        <button
          onClick={() => {
            setSelectedInvUid(null);
            setSelectedSlot((prev) => (prev === slot ? null : slot));
          }}
          className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg tartaros-slot flex flex-col items-center justify-center transition-all cursor-pointer ${
            item ? RARITY_BORDER[item.rarity] : 'border-[#7c7467]/40'
          } ${isFocused ? 'ring-2 ring-[#fbbf24]' : 'hover:border-[#e0a943]'}`}
          title={item ? item.name : label}
        >
          {item ? (
            <ItemIcon iconKey={item.iconKey} className="w-6 h-6 sm:w-8 sm:h-8" />
          ) : (
            <div className="flex flex-col items-center text-[#78716c]">
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[8px] leading-none">{label}</span>
            </div>
          )}
        </button>

        {/* Direct "Unequip / غیرتجهیز کردن" button right below the clicked equipped slot */}
        {isFocused && item && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnequipSlot(slot);
            }}
            className="px-1.5 py-0.5 rounded bg-red-900/90 border border-red-400/80 text-[9px] font-bold text-red-100 whitespace-nowrap hover:bg-red-800 cursor-pointer shadow"
          >
            {t.unequip}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-1.5 sm:p-3">
      <div className="tartaros-panel w-full max-w-6xl h-[94vh] rounded-xl flex overflow-hidden">
        {/* Compact Left Navigation Sidebar (Access Inventory, Skills, Quests, Map, Shop, Settings) */}
        <aside className="w-12 sm:w-36 border-r border-[#c4984a]/30 bg-[#0d0c10] flex flex-col py-2 shrink-0 overflow-y-auto custom-scrollbar">
          <button
            onClick={onClose}
            className="mx-auto sm:mx-2.5 mb-2 w-8 h-8 rounded-full border border-[#c4984a]/50 bg-[#1a171c] flex items-center justify-center text-[#fde68a] cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <nav className="flex-1 flex flex-col gap-1 px-1 sm:px-2">
            {[
              { id: 'character' as ModalTab, label: t.character, icon: User },
              { id: 'inventory' as ModalTab, label: t.inventory, icon: Backpack },
              { id: 'skills' as ModalTab, label: t.skills, icon: Sparkles },
              { id: 'quests' as ModalTab, label: t.quests, icon: BookOpen },
              { id: 'map' as ModalTab, label: t.map, icon: Map },
              { id: 'shop' as ModalTab, label: t.shop, icon: Store },
              { id: 'settings' as ModalTab, label: t.settings, icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  onClick={() => onSwitchTab(item.id)}
                  className={`flex items-center justify-center sm:justify-start gap-2 px-2 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-medium cursor-pointer ${
                    isActive
                      ? 'bg-[#e0a943]/15 text-[#fde68a] border border-[#e0a943]/60'
                      : 'text-[#a89f91] hover:text-[#f3ead8] hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Horizontal Compact Body */}
        <div className="flex-1 flex flex-row overflow-hidden bg-[#100f14] min-w-0">
          {/* Center-Left: 3D Hero Preview + 8 Gear Slots */}
          <div className="relative flex-1 flex flex-col p-2 sm:p-3 border-r border-[#c4984a]/25 min-w-0">
            <div className="flex items-center justify-between z-10 pointer-events-none shrink-0">
              <div className="min-w-0">
                <div className="font-display text-xs sm:text-base font-bold text-[#fde68a] truncate">
                  {username} · Lv.{stats.level}
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#a89f91] shrink-0">
                <Shield className="w-3 h-3 text-[#e0a943]" />
                <span>3D Gear</span>
              </div>
            </div>

            <div className="relative flex-1 flex items-center justify-between gap-1.5 sm:gap-2 mt-1.5 min-h-0">
              <div className="z-10 flex flex-col gap-1.5 sm:gap-2 shrink-0">
                {LEFT_SLOTS.map((s) => renderEquipSlot(s.slot, s.label))}
              </div>
              <div
                ref={mountRef}
                className="flex-1 h-full min-w-[110px] rounded-xl overflow-hidden border border-[#c4984a]/25 bg-[#0c0b10]"
              />
              <div className="z-10 flex flex-col gap-1.5 sm:gap-2 shrink-0">
                {RIGHT_SLOTS.map((s) => renderEquipSlot(s.slot, s.label))}
              </div>
            </div>
          </div>

          {/* Right: Currencies + Slot-Filtered Bag + Stats */}
          <div className="w-[260px] sm:w-[340px] md:w-[380px] flex flex-col p-2 sm:p-3 bg-[#121016] shrink-0 overflow-y-auto custom-scrollbar">
            {/* Top Currency + Close */}
            <div className="flex items-center justify-between pb-1.5 border-b border-[#c4984a]/25 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span className="font-mono-num text-xs font-bold text-[#fde68a]">
                    {stats.gold.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Gem className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span className="font-mono-num text-xs font-bold text-[#bae6fd]">
                    {stats.gems.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[11px] px-2 py-0.5 rounded border border-[#c4984a]/40 text-[#d6cfc2] hover:bg-white/5 cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>{t.close}</span>
              </button>
            </div>

            {/* Active Slot Filter Header */}
            {selectedSlot && (
              <div className="mt-1.5 px-2 py-1.5 rounded-lg bg-[#e0a943]/15 border border-[#e0a943]/50 flex items-center justify-between gap-2 shrink-0">
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#fde68a] truncate">
                  {t.selectItemForSlot}{' '}
                  <span className="uppercase text-amber-300">({selectedSlot})</span>
                </div>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-[#d6cfc2] hover:text-white shrink-0 cursor-pointer"
                >
                  {t.showAll}
                </button>
              </div>
            )}

            {/* Bag Items Grid (Scrollable, click item directly to equip if slot-filtered!) */}
            <div className="mt-2 flex-1 min-h-[115px] max-h-[165px] overflow-y-auto custom-scrollbar pr-0.5">
              {visibleInventory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-[11px] text-[#a89f91] p-3 border border-dashed border-white/10 rounded-lg">
                  {selectedSlot ? t.emptySlotItems : t.emptySlotItems}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-1.5">
                  {visibleInventory.map((entry) => {
                    const item = ITEMS[entry.itemId];
                    if (!item) return null;
                    const isSelected = selectedInvUid === entry.uid;
                    return (
                      <button
                        key={entry.uid}
                        onClick={() => {
                          if (selectedSlot && item.category === selectedSlot) {
                            // Direct single-click equip when filtering by a slot!
                            onEquipItem(entry.uid);
                            setSelectedInvUid(null);
                          } else {
                            setSelectedInvUid(entry.uid);
                          }
                        }}
                        className={`relative aspect-square rounded-lg tartaros-slot flex items-center justify-center cursor-pointer ${
                          RARITY_BORDER[item.rarity]
                        } ${isSelected ? 'ring-2 ring-[#fbbf24]' : 'hover:border-[#e0a943]'}`}
                        title={item.name}
                      >
                        <ItemIcon iconKey={item.iconKey} className="w-6 h-6 sm:w-7 sm:h-7" />
                        {entry.quantity > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 font-mono-num text-[9px] font-bold text-[#fef3c7] bg-black/80 px-1 rounded">
                            {entry.quantity}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compact Item Inspector */}
            <div className="mt-2 p-2 rounded-lg border border-[#c4984a]/35 bg-[#18151d] min-h-[68px] flex flex-col justify-between shrink-0">
              {selectedSlotItem && !selectedInvItem ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`text-xs font-bold truncate ${RARITY_TEXT[selectedSlotItem.rarity]}`}>
                      {selectedSlotItem.name}
                    </div>
                    <div className="text-[10px] text-[#c7b99e] truncate">
                      {selectedSlotItem.description}
                    </div>
                  </div>
                  <button
                    onClick={() => selectedSlot && onUnequipSlot(selectedSlot)}
                    className="px-2.5 py-1 rounded bg-red-900/80 border border-red-400/70 text-red-100 text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    {t.unequip}
                  </button>
                </div>
              ) : selectedInvItem && selectedEntry ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`text-xs font-bold truncate ${RARITY_TEXT[selectedInvItem.rarity]}`}>
                      {selectedInvItem.name}
                    </div>
                    <div className="text-[10px] text-[#c7b99e] truncate">
                      {Object.entries(selectedInvItem.stats)
                        .map(([k, v]) => `${k.toUpperCase()}: +${v}`)
                        .join(' · ') || selectedInvItem.description}
                    </div>
                  </div>
                  {selectedInvItem.category === 'consumable' ? (
                    <button
                      onClick={() => onUseConsumable(selectedEntry.uid)}
                      className="px-2.5 py-1 rounded bg-emerald-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                    >
                      {t.use}
                    </button>
                  ) : selectedInvItem.category !== 'quest' ? (
                    <button
                      onClick={() => onEquipItem(selectedEntry.uid)}
                      className="px-2.5 py-1 rounded bg-gradient-to-b from-[#e0a943] to-[#a36c1b] text-[#120d06] text-[11px] font-bold shrink-0 cursor-pointer"
                    >
                      {t.equip}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="text-[11px] text-[#a89f91] text-center my-auto">
                  {selectedSlot
                    ? `${t.selectItemForSlot} (${selectedSlot})`
                    : 'روی هر اسلات تجهیزات یا آیتم کلیک کنید'}
                </div>
              )}
            </div>

            {/* Compact Stats + Stat Token Allocation */}
            <div className="mt-2 pt-1.5 border-t border-[#c4984a]/25 space-y-1 text-[11px] shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#e0a943]">{t.statsTitle}</span>
                <span className="font-mono-num text-[10px] text-[#7dd3fc]">
                  {t.statTokens}: {stats.statTokens}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {(
                  [
                    { key: 'hp', label: 'HP', val: stats.maxHp },
                    { key: 'atk', label: 'ATK', val: stats.atk },
                    { key: 'def', label: 'DEF', val: stats.def },
                    { key: 'spd', label: 'SPD', val: stats.spd },
                  ] as const
                ).map((row) => (
                  <div key={row.key} className="flex items-center justify-between">
                    <span className="font-display text-[#c7b99e]">{row.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-num font-bold text-[#f3ead8]">{row.val}</span>
                      {stats.statTokens > 0 && (
                        <button
                          onClick={() => onAllocateStat(row.key)}
                          className="w-5 h-5 rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
