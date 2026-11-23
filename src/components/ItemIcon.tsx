import React from 'react';
import { ItemRarity } from '../game/types';

export const RARITY_BORDER: Record<ItemRarity, string> = {
  common: 'border-[#7c7467]/60',
  rare: 'border-[#38bdf8]/75 shadow-[inset_0_0_10px_rgba(56,189,248,0.18)]',
  epic: 'border-[#c084fc]/85 shadow-[inset_0_0_12px_rgba(192,132,252,0.22)]',
  legendary: 'border-[#f59e0b]/95 shadow-[inset_0_0_14px_rgba(245,158,11,0.3)]',
};

export const RARITY_TEXT: Record<ItemRarity, string> = {
  common: 'text-[#d6cfc2]',
  rare: 'text-[#7dd3fc]',
  epic: 'text-[#d8b4fe]',
  legendary: 'text-[#fbbf24]',
};

interface ItemIconProps {
  iconKey: string;
  className?: string;
}

export const ItemIcon: React.FC<ItemIconProps> = ({ iconKey, className = 'w-8 h-8' }) => {
  if (iconKey.startsWith('sword_')) {
    const isFlame = iconKey === 'sword_flame';
    const isLegend = iconKey === 'sword_legendary';
    const isKnight = iconKey === 'sword_knight';
    const blade = isLegend ? '#fde68a' : isFlame ? '#fb923c' : isKnight ? '#e2e8f0' : '#94a3b8';
    const guard = isLegend || isKnight ? '#eab308' : isFlame ? '#ea580c' : '#78716c';
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {isLegend && <circle cx="24" cy="24" r="18" fill="rgba(245,158,11,0.18)" />}
        {isFlame && <circle cx="24" cy="24" r="18" fill="rgba(239,68,68,0.2)" />}
        <path d="M37 7L29 11L15 29L19 33L37 15L41 7H37Z" fill={blade} stroke="#1f2937" strokeWidth="1.5" />
        {(isFlame || isLegend) && (
          <path d="M35 11L20 28" stroke={isLegend ? '#f59e0b' : '#ef4444'} strokeWidth="2.4" strokeLinecap="round" />
        )}
        <path d="M12 25L23 36" stroke={guard} strokeWidth="4" strokeLinecap="round" />
        <path d="M16 32L9 39" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="8" cy="40" r="2.6" fill={guard} />
      </svg>
    );
  }

  if (iconKey.startsWith('helm_')) {
    const isDragon = iconKey === 'helm_dragon';
    const isKnight = iconKey === 'helm_knight';
    const metal = isDragon ? '#312e38' : isKnight ? '#cbd5e1' : '#858e99';
    const trim = isDragon || isKnight ? '#eab308' : '#52525b';
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {isDragon && (
          <>
            <path d="M14 16C8 12 7 6 10 4C12 9 14 12 17 14" fill="#eab308" />
            <path d="M34 16C40 12 41 6 38 4C36 9 34 12 31 14" fill="#eab308" />
          </>
        )}
        <path d="M12 24C12 14 17 9 24 9C31 9 36 14 36 24V37L29 40L24 34L19 40L12 37V24Z" fill={metal} stroke={trim} strokeWidth="2" />
        <path d="M24 9V27" stroke={trim} strokeWidth="2.4" />
        <path d="M16 23H22M26 23H32" stroke={isDragon ? '#ef4444' : '#0f172a'} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (iconKey.startsWith('armor_')) {
    const isObsidian = iconKey === 'armor_obsidian';
    const isSteel = iconKey === 'armor_steel';
    const body = isObsidian ? '#25222c' : isSteel ? '#64748b' : '#6b442a';
    const trim = isObsidian || isSteel ? '#eab308' : '#a16207';
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <path d="M10 13L17 9L24 13L31 9L38 13L41 21L35 23L34 39H14L13 23L7 21L10 13Z" fill={body} stroke={trim} strokeWidth="2" />
        <path d="M17 15L24 19L31 15" stroke={trim} strokeWidth="2" />
        <path d="M15 31H33" stroke={trim} strokeWidth="2.4" />
        {isObsidian && <polygon points="24,20 27,24 24,28 21,24" fill="#ef4444" />}
      </svg>
    );
  }

  if (iconKey.startsWith('cloak_')) {
    const color = iconKey === 'cloak_crimson' ? '#991b1b' : iconKey === 'cloak_abyss' ? '#2e1a36' : '#4d5c46';
    const trim = iconKey === 'cloak_green' ? '#a8a29e' : '#eab308';
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <path d="M15 10H33L39 39L24 35L9 39L15 10Z" fill={color} stroke={trim} strokeWidth="2" />
        <circle cx="17" cy="13" r="2.5" fill={trim} />
        <circle cx="31" cy="13" r="2.5" fill={trim} />
      </svg>
    );
  }

  if (iconKey.startsWith('gauntlets_')) {
    const isGold = iconKey === 'gauntlets_gold';
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect x="13" y="13" width="22" height="25" rx="4" fill={isGold ? '#29252e' : '#64748b'} stroke={isGold ? '#eab308' : '#94a3b8'} strokeWidth="2" />
        <path d="M16 12V22M21 10V22M27 10V22M32 12V22" stroke={isGold ? '#eab308' : '#cbd5e1'} strokeWidth="3" strokeLinecap="round" />
        <path d="M14 29H34" stroke={isGold ? '#eab308' : '#475569'} strokeWidth="2.5" />
      </svg>
    );
  }

  if (iconKey.startsWith('boots_')) {
    const isGold = iconKey === 'boots_gold';
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <path d="M15 10H27V27L37 31V38H14V10Z" fill={isGold ? '#25222c' : '#6b4226'} stroke={isGold ? '#eab308' : '#a16207'} strokeWidth="2" />
        <path d="M15 17H27" stroke={isGold ? '#eab308' : '#451a03'} strokeWidth="2.4" />
      </svg>
    );
  }

  if (iconKey.startsWith('ring_')) {
    const gem = iconKey === 'ring_ruby' ? '#ef4444' : '#38bdf8';
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <circle cx="24" cy="27" r="11" stroke="#eab308" strokeWidth="4.5" />
        <polygon points="24,10 30,16 24,22 18,16" fill={gem} stroke="#fef08a" strokeWidth="1.2" />
      </svg>
    );
  }

  if (iconKey.startsWith('amulet_')) {
    const gem = iconKey === 'amulet_fang' ? '#f59e0b' : '#fbbf24';
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <path d="M14 11C14 18 19 23 24 23C29 23 34 18 34 11" stroke="#d4a243" strokeWidth="2.2" />
        <circle cx="24" cy="30" r="9" fill="#1f1c24" stroke="#eab308" strokeWidth="2.5" />
        <polygon points="24,23 29,30 24,37 19,30" fill={gem} />
      </svg>
    );
  }

  if (iconKey.startsWith('potion_')) {
    const liquid = iconKey === 'potion_hp' ? '#dc2626' : iconKey === 'potion_mp' ? '#2563eb' : '#f59e0b';
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect x="20" y="7" width="8" height="5" rx="1" fill="#a16207" />
        <path d="M19 12H29V17L36 27C37 33 32 39 24 39C16 39 11 33 12 27L19 17V12Z" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.8" />
        <path d="M14 27C14 32 18 37 24 37C30 37 34 32 34 27L31 23H17L14 27Z" fill={liquid} />
      </svg>
    );
  }

  // Wolf Tooth Quest Item
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <path d="M16 10L31 12C29 22 25 32 15 39C16 28 16 18 16 10Z" fill="#f1e8d6" stroke="#a8a29e" strokeWidth="1.8" />
      <path d="M16 10H31" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
};
