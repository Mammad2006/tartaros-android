import {
  ClassDef,
  EnemyState,
  EquipSlot,
  EquippedMap,
  GameItem,
  InventoryEntry,
  ItemRarity,
  MobKind,
  NpcDef,
  QuestDef,
  VisualTier,
  WorldRegion,
} from './types';

const BASE_ITEMS: Record<string, GameItem> = {
  // === CORE WEAPONS ===
  rusty_broadsword: {
    id: 'rusty_broadsword',
    name: 'Iron Broadsword',
    category: 'weapon',
    rarity: 'common',
    description: 'Dependable forged iron blade of the Astarot garrison.',
    stats: { atk: 12 },
    price: 150,
    sellPrice: 75,
    visualTier: 'rustic',
    weaponKind: 'sword',
    primaryColor: '#94a3b8',
    accentColor: '#78350f',
    iconKey: 'sword_iron',
  },
  astarot_knight_blade: {
    id: 'astarot_knight_blade',
    name: 'Astarot Sovereign Blade',
    category: 'weapon',
    rarity: 'rare',
    description: 'Tempered silver-steel longsword with a gilded Astarot crest guard.',
    stats: { atk: 24, def: 4, spd: 1 },
    price: 400,
    sellPrice: 200,
    visualTier: 'steel',
    weaponKind: 'sword',
    primaryColor: '#e2e8f0',
    accentColor: '#e0a943',
    iconKey: 'sword_knight',
  },
  crimson_ignis_sword: {
    id: 'crimson_ignis_sword',
    name: 'Ignis Berserker Cleaver',
    category: 'weapon',
    rarity: 'epic',
    description: 'Balanced volcanic-forged greataxe radiating warm embers.',
    stats: { atk: 34, spd: 1 },
    price: 760,
    sellPrice: 380,
    visualTier: 'crimson',
    weaponKind: 'greataxe',
    primaryColor: '#3b3740',
    accentColor: '#d97706',
    glowColor: '#ff5a1f',
    iconKey: 'sword_flame',
  },
  sylvan_longbow: {
    id: 'sylvan_longbow',
    name: 'Sylvan Windbow',
    category: 'weapon',
    rarity: 'rare',
    description: 'Carved from Whispering Woods heartwood for balanced precision.',
    stats: { atk: 25, spd: 4 },
    price: 440,
    sellPrice: 220,
    visualTier: 'steel',
    weaponKind: 'bow',
    primaryColor: '#84cc16',
    accentColor: '#d4a243',
    glowColor: '#4ade80',
    iconKey: 'sword_knight',
  },
  soulreaper_staff: {
    id: 'soulreaper_staff',
    name: 'Tartaros Soul Staff',
    category: 'weapon',
    rarity: 'epic',
    description: 'Obsidian necromantic scepter channeling violet fire.',
    stats: { atk: 32, mp: 35 },
    price: 720,
    sellPrice: 360,
    visualTier: 'tartaros',
    weaponKind: 'staff',
    primaryColor: '#1e1b26',
    accentColor: '#c084fc',
    glowColor: '#a855f7',
    iconKey: 'sword_flame',
  },
  lost_sword_tartaros: {
    id: 'lost_sword_tartaros',
    name: 'Lost Sword of Tartaros',
    category: 'weapon',
    rarity: 'legendary',
    description: 'The mythic solar-forged sovereign relic stolen from Astarot Citadel.',
    stats: { atk: 54, def: 8, spd: 4 },
    price: 2100,
    sellPrice: 1050,
    visualTier: 'tartaros',
    weaponKind: 'sword',
    primaryColor: '#f8fafc',
    accentColor: '#f5b942',
    glowColor: '#ff7b00',
    iconKey: 'sword_legendary',
  },

  // === CORE HELMETS ===
  iron_sallet: {
    id: 'iron_sallet',
    name: 'Iron Sallet',
    category: 'helmet',
    rarity: 'common',
    description: 'Brushed iron helm offering reliable cranial protection.',
    stats: { def: 6, hp: 20 },
    price: 150,
    sellPrice: 75,
    visualTier: 'rustic',
    primaryColor: '#7c848e',
    accentColor: '#4b5563',
    iconKey: 'helm_iron',
  },
  vanguard_helm: {
    id: 'vanguard_helm',
    name: 'Vanguard Crested Helm',
    category: 'helmet',
    rarity: 'rare',
    description: 'Polished knight helm crowned with an Astarot gold ridge.',
    stats: { def: 12, hp: 38 },
    price: 380,
    sellPrice: 190,
    visualTier: 'steel',
    primaryColor: '#94a3b8',
    accentColor: '#d4a243',
    iconKey: 'helm_knight',
  },
  dragonscale_warhelm: {
    id: 'dragonscale_warhelm',
    name: 'Tartaros Horned Helm',
    category: 'helmet',
    rarity: 'legendary',
    description: 'Obsidian warhelm crowned with curved gold horns.',
    stats: { def: 20, hp: 68, atk: 7 },
    price: 920,
    sellPrice: 460,
    visualTier: 'tartaros',
    primaryColor: '#1f1c24',
    accentColor: '#e0a943',
    glowColor: '#dc2626',
    iconKey: 'helm_dragon',
  },

  // === CORE ARMOR ===
  leather_brigandine: {
    id: 'leather_brigandine',
    name: 'Scout Brigandine',
    category: 'armor',
    rarity: 'common',
    description: 'Supple cured leather reinforced with riveted bronze plates.',
    stats: { hp: 35, def: 7, spd: 1 },
    price: 190,
    sellPrice: 95,
    visualTier: 'rustic',
    primaryColor: '#5c3c28',
    accentColor: '#92653a',
    iconKey: 'armor_leather',
  },
  astarot_steel_cuirass: {
    id: 'astarot_steel_cuirass',
    name: 'Astarot Steel Cuirass',
    category: 'armor',
    rarity: 'rare',
    description: 'Heavy breastplate and pauldrons worn by citadel guardians.',
    stats: { hp: 70, def: 14 },
    price: 460,
    sellPrice: 230,
    visualTier: 'steel',
    primaryColor: '#64748b',
    accentColor: '#d4a243',
    iconKey: 'armor_steel',
  },
  obsidian_tartaros_plate: {
    id: 'obsidian_tartaros_plate',
    name: 'Obsidian Sovereign Plate',
    category: 'armor',
    rarity: 'legendary',
    description: 'Masterwork dark obsidian cuirass inlaid with gold filigree.',
    stats: { hp: 125, def: 22, atk: 9 },
    price: 1080,
    sellPrice: 540,
    visualTier: 'tartaros',
    primaryColor: '#1b1a21',
    accentColor: '#dfa642',
    glowColor: '#ef4444',
    iconKey: 'armor_obsidian',
  },

  // === CORE CLOAKS ===
  traveler_mantle: {
    id: 'traveler_mantle',
    name: 'Forest Ranger Cloak',
    category: 'cloak',
    rarity: 'common',
    description: 'Weather-worn emerald cloak suited for woodland scouts.',
    stats: { spd: 2, def: 3 },
    price: 120,
    sellPrice: 60,
    visualTier: 'rustic',
    primaryColor: '#2f4f32',
    accentColor: '#78716c',
    iconKey: 'cloak_green',
  },
  crimson_royal_cape: {
    id: 'crimson_royal_cape',
    name: 'Crimson Champion Cape',
    category: 'cloak',
    rarity: 'epic',
    description: 'Deep scarlet war-cape clasped in hammered gold.',
    stats: { spd: 4, def: 6, atk: 5 },
    price: 520,
    sellPrice: 260,
    visualTier: 'crimson',
    primaryColor: '#8b161e',
    accentColor: '#e0a943',
    iconKey: 'cloak_crimson',
  },
  shadow_dragon_cloak: {
    id: 'shadow_dragon_cloak',
    name: 'Abyssal Ember Cloak',
    category: 'cloak',
    rarity: 'legendary',
    description: 'Woven from drake-silk with smoldering ember trim.',
    stats: { spd: 6, def: 10, atk: 10 },
    price: 1020,
    sellPrice: 510,
    visualTier: 'tartaros',
    primaryColor: '#1e1620',
    accentColor: '#f59e0b',
    glowColor: '#f97316',
    iconKey: 'cloak_abyss',
  },

  // === CORE GAUNTLETS ===
  iron_gauntlets: {
    id: 'iron_gauntlets',
    name: 'Iron Vambraces',
    category: 'gauntlets',
    rarity: 'common',
    description: 'Reinforced forearm guards for parrying heavy strikes.',
    stats: { def: 4, atk: 3 },
    price: 130,
    sellPrice: 65,
    visualTier: 'rustic',
    primaryColor: '#6b7280',
    accentColor: '#374151',
    iconKey: 'gauntlets_iron',
  },
  gilded_war_gauntlets: {
    id: 'gilded_war_gauntlets',
    name: 'Gilded War Gauntlets',
    category: 'gauntlets',
    rarity: 'epic',
    description: 'Articulated dark steel gauntlets trimmed in royal gold.',
    stats: { def: 9, atk: 8 },
    price: 440,
    sellPrice: 220,
    visualTier: 'tartaros',
    primaryColor: '#25232b',
    accentColor: '#dfa642',
    iconKey: 'gauntlets_gold',
  },

  // === CORE BOOTS ===
  leather_boots: {
    id: 'leather_boots',
    name: 'Ranger Boots',
    category: 'boots',
    rarity: 'common',
    description: 'Light stitched leather boots built for steep mountain trails.',
    stats: { spd: 3, def: 3 },
    price: 120,
    sellPrice: 60,
    visualTier: 'rustic',
    primaryColor: '#5c402c',
    accentColor: '#292524',
    iconKey: 'boots_leather',
  },
  sovereign_greaves: {
    id: 'sovereign_greaves',
    name: 'Sovereign Sabatons',
    category: 'boots',
    rarity: 'epic',
    description: 'Armored knee-greaves with gilded spurs that quicken stride.',
    stats: { spd: 5, def: 8, hp: 25 },
    price: 470,
    sellPrice: 235,
    visualTier: 'tartaros',
    primaryColor: '#222029',
    accentColor: '#dfa642',
    iconKey: 'boots_gold',
  },

  // === CORE RINGS & AMULETS ===
  ruby_signet_ring: {
    id: 'ruby_signet_ring',
    name: 'Crimson Signet Ring',
    category: 'ring',
    rarity: 'rare',
    description: 'Channels inner battle fervor into sharper strikes.',
    stats: { atk: 7, hp: 24 },
    price: 320,
    sellPrice: 160,
    visualTier: 'crimson',
    primaryColor: '#d4a243',
    glowColor: '#ef4444',
    iconKey: 'ring_ruby',
  },
  arcane_sapphire_ring: {
    id: 'arcane_sapphire_ring',
    name: 'Arcane Runestone Ring',
    category: 'ring',
    rarity: 'epic',
    description: 'Expands mana reserves and arcane casting.',
    stats: { mp: 40, atk: 10, spd: 2 },
    price: 580,
    sellPrice: 290,
    visualTier: 'tartaros',
    primaryColor: '#cbd5e1',
    glowColor: '#38bdf8',
    iconKey: 'ring_arcane',
  },
  wolf_fang_amulet: {
    id: 'wolf_fang_amulet',
    name: 'Wolf-Fang Talisman',
    category: 'amulet',
    rarity: 'epic',
    description: 'Blessed by Elder Kaelen with the ferocity of the Shadow Pack.',
    stats: { atk: 11, spd: 3, hp: 38 },
    price: 600,
    sellPrice: 300,
    visualTier: 'crimson',
    primaryColor: '#e2e8f0',
    glowColor: '#f59e0b',
    iconKey: 'amulet_fang',
  },
  solar_crest_amulet: {
    id: 'solar_crest_amulet',
    name: 'Astarot Sun Medallion',
    category: 'amulet',
    rarity: 'rare',
    description: 'Warm golden medallion radiating protective light.',
    stats: { hp: 45, def: 6, mp: 20 },
    price: 360,
    sellPrice: 180,
    visualTier: 'steel',
    primaryColor: '#f5b942',
    glowColor: '#fbbf24',
    iconKey: 'amulet_sun',
  },

  // === CONSUMABLES & QUEST ITEMS ===
  health_potion: {
    id: 'health_potion',
    name: 'Crimson Health Vial',
    category: 'consumable',
    rarity: 'common',
    description: 'Restores 140 HP immediately.',
    stats: { healHp: 140 },
    price: 50,
    sellPrice: 20,
    iconKey: 'potion_hp',
    stackable: true,
  },
  mana_elixir: {
    id: 'mana_elixir',
    name: 'Sapphire Mana Elixir',
    category: 'consumable',
    rarity: 'common',
    description: 'Restores 75 MP immediately.',
    stats: { healMp: 75 },
    price: 55,
    sellPrice: 25,
    iconKey: 'potion_mp',
    stackable: true,
  },
  greater_sun_elixir: {
    id: 'greater_sun_elixir',
    name: 'Elixir of Tartaros',
    category: 'consumable',
    rarity: 'epic',
    description: 'Restores 300 HP and 110 MP with golden alchemical vigor.',
    stats: { healHp: 300, healMp: 110 },
    price: 165,
    sellPrice: 80,
    iconKey: 'potion_gold',
    stackable: true,
  },
  golden_healing_flower: {
    id: 'golden_healing_flower',
    name: 'Golden Sunbloom Herb',
    category: 'consumable',
    rarity: 'rare',
    description: 'Rare forest-grown golden flower restoring 210 HP & 50 MP.',
    stats: { healHp: 210, healMp: 50 },
    price: 110,
    sellPrice: 55,
    iconKey: 'potion_gold',
    stackable: true,
  },
  wolf_tooth: {
    id: 'wolf_tooth',
    name: 'Shadow Wolf Tooth',
    category: 'quest',
    rarity: 'rare',
    description: 'Sharp obsidian fang dropped by Shadow Wolves.',
    stats: {},
    price: 0,
    sellPrice: 25,
    iconKey: 'quest_tooth',
    stackable: true,
  },
};

// === GENERATE REMAINING ITEMS TO REACH EXACTLY 200 BALANCED ITEMS ===
function build200ItemsCatalog(): Record<string, GameItem> {
  const catalog: Record<string, GameItem> = { ...BASE_ITEMS };

  const prefixes: Array<{
    key: string;
    label: string;
    rarity: ItemRarity;
    tier: VisualTier;
    mult: number;
    primary: string;
    accent: string;
    glow?: string;
  }> = [
    { key: 'bronze', label: 'Bronze', rarity: 'common', tier: 'rustic', mult: 0.75, primary: '#926239', accent: '#57534e' },
    { key: 'militia', label: 'Astarot Militia', rarity: 'common', tier: 'rustic', mult: 0.9, primary: '#78716c', accent: '#a8a29e' },
    { key: 'valoria', label: 'Valoria Mariner', rarity: 'rare', tier: 'steel', mult: 1.15, primary: '#38bdf8', accent: '#cbd5e1' },
    { key: 'ironhold', label: 'Ironhold Bastion', rarity: 'rare', tier: 'steel', mult: 1.3, primary: '#64748b', accent: '#f59e0b' },
    { key: 'elderwood', label: 'Elderwood Guardian', rarity: 'rare', tier: 'steel', mult: 1.35, primary: '#22c55e', accent: '#a16207', glow: '#4ade80' },
    { key: 'frostfang', label: 'Frostfang Glacier', rarity: 'epic', tier: 'crimson', mult: 1.55, primary: '#bae6fd', accent: '#3b82f6', glow: '#38bdf8' },
    { key: 'crimson_guard', label: 'Crimson Legion', rarity: 'epic', tier: 'crimson', mult: 1.7, primary: '#991b1b', accent: '#fbbf24', glow: '#ef4444' },
    { key: 'obsidian_flame', label: 'Inferno Caldera', rarity: 'epic', tier: 'crimson', mult: 1.85, primary: '#292524', accent: '#f97316', glow: '#ea580c' },
    { key: 'abyssal_void', label: 'Abyssal Eclipse', rarity: 'legendary', tier: 'tartaros', mult: 2.05, primary: '#1e1b2e', accent: '#c084fc', glow: '#a855f7' },
    { key: 'sovereign_sun', label: 'Sovereign Dawn', rarity: 'legendary', tier: 'tartaros', mult: 2.2, primary: '#fef3c7', accent: '#f59e0b', glow: '#fbbf24' },
  ];

  const slotTemplates: Array<{
    cat: EquipSlot;
    names: string[];
    iconKeys: string[];
    weaponKinds?: Array<'sword' | 'greataxe' | 'bow' | 'staff'>;
  }> = [
    {
      cat: 'weapon',
      names: ['Longsword', 'Battleaxe', 'Recurve Bow', 'Runestaff'],
      iconKeys: ['sword_knight', 'sword_flame', 'sword_knight', 'sword_legendary'],
      weaponKinds: ['sword', 'greataxe', 'bow', 'staff'],
    },
    { cat: 'helmet', names: ['Warhelm', 'Barbute'], iconKeys: ['helm_iron', 'helm_knight'] },
    { cat: 'armor', names: ['Breastplate', 'Hauberk'], iconKeys: ['armor_leather', 'armor_steel'] },
    { cat: 'cloak', names: ['Battle Cloak', 'Mantle'], iconKeys: ['cloak_green', 'cloak_crimson'] },
    { cat: 'gauntlets', names: ['Gauntlets', 'Bracers'], iconKeys: ['gauntlets_iron', 'gauntlets_gold'] },
    { cat: 'boots', names: ['Greaves', 'Warboots'], iconKeys: ['boots_leather', 'boots_gold'] },
    { cat: 'ring', names: ['Signet Ring', 'Band'], iconKeys: ['ring_ruby', 'ring_arcane'] },
    { cat: 'amulet', names: ['Talisman', 'Pendant'], iconKeys: ['amulet_sun', 'amulet_fang'] },
  ];

  let idx = 1;
  for (const pref of prefixes) {
    for (const tmpl of slotTemplates) {
      for (let v = 0; v < tmpl.names.length; v++) {
        if (Object.keys(catalog).length >= 192) break;
        const id = `item_${pref.key}_${tmpl.cat}_${v + 1}`;
        if (catalog[id]) continue;

        const m = pref.mult;
        const stats: GameItem['stats'] = {};
        if (tmpl.cat === 'weapon') stats.atk = Math.round(13 * m + v * 2);
        if (tmpl.cat === 'helmet') {
          stats.def = Math.round(6 * m);
          stats.hp = Math.round(22 * m);
        }
        if (tmpl.cat === 'armor') {
          stats.hp = Math.round(42 * m);
          stats.def = Math.round(8 * m);
        }
        if (tmpl.cat === 'cloak') {
          stats.spd = Math.max(1, Math.round(2 * m));
          stats.def = Math.round(3 * m);
        }
        if (tmpl.cat === 'gauntlets') {
          stats.atk = Math.round(4 * m);
          stats.def = Math.round(4 * m);
        }
        if (tmpl.cat === 'boots') {
          stats.spd = Math.max(2, Math.round(2.5 * m));
          stats.def = Math.round(3 * m);
        }
        if (tmpl.cat === 'ring') {
          stats.atk = Math.round(4 * m);
          stats.mp = Math.round(14 * m);
        }
        if (tmpl.cat === 'amulet') {
          stats.hp = Math.round(26 * m);
          stats.def = Math.round(3 * m);
        }

        const price = Math.round(120 * m * m + v * 35);
        catalog[id] = {
          id,
          name: `${pref.label} ${tmpl.names[v]}`,
          category: tmpl.cat,
          rarity: pref.rarity,
          description: `Forged ${pref.label} ${tmpl.names[v].toLowerCase()} balanced for Astarot campaigns.`,
          stats,
          price,
          sellPrice: Math.round(price * 0.5),
          visualTier: pref.tier,
          weaponKind: tmpl.weaponKinds ? tmpl.weaponKinds[v] : undefined,
          primaryColor: pref.primary,
          accentColor: pref.accent,
          glowColor: pref.glow,
          iconKey: tmpl.iconKeys[v % tmpl.iconKeys.length],
        };
        idx++;
      }
    }
  }

  // Top up remaining slots to EXACTLY 200 items with balanced Alchemical Brews
  const brewSpecs = [
    { id: 'brew_forest_mint', name: 'Whispering Mint Draught', hp: 110, mp: 35, price: 45 },
    { id: 'brew_valoria_tonic', name: 'Valoria Sea Tonic', hp: 150, mp: 60, price: 75 },
    { id: 'brew_ironhold_mead', name: 'Ironhold Stout Mead', hp: 220, mp: 40, price: 95 },
    { id: 'brew_glacier_dew', name: 'Glacier Frost Dew', hp: 130, mp: 120, price: 105 },
    { id: 'brew_ember_draught', name: 'Caldera Ember Flask', hp: 280, mp: 90, price: 145 },
    { id: 'brew_moonlight_nectar', name: 'Moonlight Recovery Vial', hp: 240, mp: 140, price: 160 },
    { id: 'brew_royal_cordial', name: 'Royal Astarot Cordial', hp: 320, mp: 120, price: 195 },
    { id: 'brew_tartaros_ambrosia', name: 'Tartaros Sovereign Ambrosia', hp: 420, mp: 180, price: 260 },
    { id: 'quest_glacier_shard', name: 'Glacier Ice Crystal', hp: 0, mp: 0, price: 0 },
    { id: 'quest_ember_core', name: 'Caldera Magma Core', hp: 0, mp: 0, price: 0 },
  ];
  for (const b of brewSpecs) {
    if (Object.keys(catalog).length >= 200) break;
    if (!catalog[b.id]) {
      const isQuest = b.id.startsWith('quest_');
      catalog[b.id] = {
        id: b.id,
        name: b.name,
        category: isQuest ? 'quest' : 'consumable',
        rarity: b.price > 170 ? 'epic' : b.price > 90 ? 'rare' : 'common',
        description: isQuest
          ? 'Trophy relic recovered from powerful beasts.'
          : `Restores ${b.hp} HP and ${b.mp} MP.`,
        stats: isQuest ? {} : { healHp: b.hp, healMp: b.mp },
        price: b.price,
        sellPrice: Math.round(b.price * 0.5),
        iconKey: isQuest ? 'quest_tooth' : b.mp > b.hp ? 'potion_mp' : 'potion_hp',
        stackable: true,
      };
    }
  }

  return catalog;
}

export const ITEMS: Record<string, GameItem> = build200ItemsCatalog();

export const STARTER_EMPTY_EQUIPPED: EquippedMap = {
  helmet: null,
  armor: null,
  gauntlets: null,
  ring: null,
  cloak: null,
  weapon: null,
  boots: null,
  amulet: null,
};

export function createStarterInventory(starterWeaponId: string): InventoryEntry[] {
  return [
    { uid: 'inv-start-wpn', itemId: starterWeaponId, quantity: 1 },
    { uid: 'inv-start-armor', itemId: 'leather_brigandine', quantity: 1 },
    { uid: 'inv-start-helm', itemId: 'iron_sallet', quantity: 1 },
    { uid: 'inv-start-boots', itemId: 'leather_boots', quantity: 1 },
    { uid: 'inv-start-cape', itemId: 'traveler_mantle', quantity: 1 },
    { uid: 'inv-start-hp', itemId: 'health_potion', quantity: 5 },
    { uid: 'inv-start-mp', itemId: 'mana_elixir', quantity: 4 },
  ];
}

// === 4 BALANCED PLAYABLE CLASSES ===
export const CLASSES: ClassDef[] = [
  {
    id: 'berserker',
    name: 'Berserker',
    persianName: 'برسرک',
    subtitle: 'Fury-Driven Titan',
    description:
      'جنگجویی با هیکل تنومند و قدرت بدنی بالا که با ضربات سنگین و خشم آتشین دشمنان را شکست می‌دهد.',
    baseHp: 240,
    baseMp: 90,
    baseAtk: 20,
    baseDef: 12,
    baseSpd: 9,
    accentColor: '#ef4444',
    starterWeaponId: 'crimson_ignis_sword',
    skills: [
      { id: 'bsk_strike', slotIndex: 0, name: 'Brutal Cleave', persianName: 'ضربه وحشیانه', mpCost: 0, cooldown: 0.72, damageMultiplier: 1.15, range: 4.5, aoeRadius: 2.8, unlockLevel: 1, description: 'ضربه سنگین و نزدیک با تبر/شمشیر بزرگ', color: '#f97316', effectKind: 'melee' },
      { id: 'bsk_whirl', slotIndex: 1, name: 'Blood Whirlwind', persianName: 'گردباد خونین', mpCost: 18, cooldown: 3.4, damageMultiplier: 1.9, range: 4.5, aoeRadius: 4.8, unlockLevel: 1, description: 'چرخش ۳۶۰ درجه و آسیب به تمام دشمنان اطراف', color: '#ef4444', effectKind: 'whirlwind' },
      { id: 'bsk_slam', slotIndex: 2, name: 'Earth Shatter', persianName: 'شکاف زمین', mpCost: 24, cooldown: 4.8, damageMultiplier: 2.4, range: 5.2, aoeRadius: 5.5, unlockLevel: 1, description: 'پرش و کوبیدن سلاح بر زمین با موج انفجار آتشین', color: '#ea580c', effectKind: 'slam' },
      { id: 'bsk_roar', slotIndex: 3, name: 'Titan Warcry', persianName: 'فریاد تایتان', mpCost: 20, cooldown: 7.5, damageMultiplier: 1.4, range: 6.0, aoeRadius: 6.0, unlockLevel: 3, description: 'احیای ۲۲٪ جان و تقویت نبرد', color: '#fbbf24', effectKind: 'buff_heal' },
      { id: 'bsk_inferno', slotIndex: 4, name: 'Volcanic Surge', persianName: 'موج آتشفشان', mpCost: 34, cooldown: 6.8, damageMultiplier: 2.9, range: 6.5, aoeRadius: 6.8, unlockLevel: 6, description: 'فوران گدازه‌های تارتاروس زیر پای دشمنان', color: '#dc2626', effectKind: 'nova' },
      { id: 'bsk_ragnarok', slotIndex: 5, name: 'Ragnarok Doom', persianName: 'نابودی راگناروک', mpCost: 46, cooldown: 9.5, damageMultiplier: 3.8, range: 7.0, aoeRadius: 7.5, unlockLevel: 9, description: 'مهارت نهایی برسرک با انفجار عظیم آتش', color: '#b91c1c', effectKind: 'slam' },
    ],
  },
  {
    id: 'archer',
    name: 'Ranger Archer',
    persianName: 'کماندار',
    subtitle: 'Noble Woodland Marksman',
    description:
      'تیرانداز نجیب و چابک جنگل‌های آستاروت با سرعت حرکت بالا، تیرهای نافذ و باران تیر.',
    baseHp: 195,
    baseMp: 115,
    baseAtk: 19,
    baseDef: 9,
    baseSpd: 14,
    accentColor: '#22c55e',
    starterWeaponId: 'sylvan_longbow',
    skills: [
      { id: 'arc_shot', slotIndex: 0, name: 'Swift Arrow', persianName: 'تیر سریع', mpCost: 0, cooldown: 0.68, damageMultiplier: 1.08, range: 11.5, aoeRadius: 2.2, unlockLevel: 1, description: 'شلیک دقیق تیر سبز به دشمنان از راه دور', color: '#4ade80', effectKind: 'projectile' },
      { id: 'arc_pierce', slotIndex: 1, name: 'Piercing Gale', persianName: 'تیر شکافنده باد', mpCost: 16, cooldown: 3.2, damageMultiplier: 2.0, range: 13.0, aoeRadius: 3.5, unlockLevel: 1, description: 'پرتاب تیر پرقدرت بادی با آسیب شدید', color: '#22c55e', effectKind: 'projectile' },
      { id: 'arc_rain', slotIndex: 2, name: 'Emerald Arrow Rain', persianName: 'باران تیر زمردین', mpCost: 26, cooldown: 5.2, damageMultiplier: 2.5, range: 11.0, aoeRadius: 6.5, unlockLevel: 1, description: 'بارش تیرهای نورانی روی منطقه هدف', color: '#10b981', effectKind: 'nova' },
      { id: 'arc_wind', slotIndex: 3, name: 'Sylvan Grace', persianName: 'نفس جنگل', mpCost: 18, cooldown: 7.0, damageMultiplier: 1.3, range: 5.0, aoeRadius: 5.0, unlockLevel: 3, description: 'بازیابی جان با انرژی طبیعت', color: '#86efac', effectKind: 'buff_heal' },
      { id: 'arc_star', slotIndex: 4, name: 'Starfall Volley', persianName: 'رگبار شهاب', mpCost: 34, cooldown: 7.0, damageMultiplier: 2.9, range: 13.0, aoeRadius: 6.0, unlockLevel: 6, description: 'رگبار تیرهای درخشان ستاره‌ای', color: '#38bdf8', effectKind: 'projectile' },
      { id: 'arc_phoenix', slotIndex: 5, name: 'Phoenix Snipe', persianName: 'تیر ققنوس', mpCost: 44, cooldown: 9.0, damageMultiplier: 3.7, range: 15.0, aoeRadius: 6.5, unlockLevel: 9, description: 'مهارت نهایی کماندار با شعله ققنوس', color: '#f59e0b', effectKind: 'slam' },
    ],
  },
  {
    id: 'knight',
    name: 'Knight',
    persianName: 'شوالیه',
    subtitle: 'Radiant Citadel Vanguard',
    description:
      'مدافع نجیب‌زاده و زره‌پوش قلعه آستاروت با دفاع پولادین، ضربات متعادل و نور مقدس محافظ.',
    baseHp: 225,
    baseMp: 105,
    baseAtk: 18,
    baseDef: 16,
    baseSpd: 10,
    accentColor: '#eab308',
    starterWeaponId: 'astarot_knight_blade',
    skills: [
      { id: 'knt_slash', slotIndex: 0, name: 'Royal Blade', persianName: 'شمشیر سلطنتی', mpCost: 0, cooldown: 0.7, damageMultiplier: 1.1, range: 4.2, aoeRadius: 2.5, unlockLevel: 1, description: 'ضربه سریع و متوازن با شمشیر شوالیه', color: '#fde047', effectKind: 'melee' },
      { id: 'knt_cross', slotIndex: 1, name: 'Solar Cross Slash', persianName: 'ضربت صلیب خورشید', mpCost: 18, cooldown: 3.4, damageMultiplier: 1.95, range: 5.0, aoeRadius: 4.2, unlockLevel: 1, description: 'شکاف نورانی با شمشیر آستاروت', color: '#f59e0b', effectKind: 'slam' },
      { id: 'knt_aegis', slotIndex: 2, name: 'Aegis Shockwave', persianName: 'موج سپر مقدس', mpCost: 22, cooldown: 4.8, damageMultiplier: 2.3, range: 5.5, aoeRadius: 5.8, unlockLevel: 1, description: 'موج دفاعی طلایی در اطراف قهرمان', color: '#eab308', effectKind: 'nova' },
      { id: 'knt_vow', slotIndex: 3, name: 'Paladin Vow', persianName: 'سوگند مقدس', mpCost: 22, cooldown: 7.2, damageMultiplier: 1.4, range: 5.5, aoeRadius: 5.5, unlockLevel: 3, description: 'بازیابی جان با نور خورشید آستاروت', color: '#fef08a', effectKind: 'buff_heal' },
      { id: 'knt_lance', slotIndex: 4, name: 'Divine Judgment', persianName: 'داوری الهی', mpCost: 34, cooldown: 6.8, damageMultiplier: 2.85, range: 6.5, aoeRadius: 6.2, unlockLevel: 6, description: 'فرود ضربه آسمانی بر سر دشمنان', color: '#fbbf24', effectKind: 'slam' },
      { id: 'knt_bastion', slotIndex: 5, name: 'Sovereign Nova', persianName: 'ابرنواختر پادشاه', mpCost: 45, cooldown: 9.2, damageMultiplier: 3.65, range: 7.0, aoeRadius: 7.5, unlockLevel: 9, description: 'انفجار نور زرین در میدان نبرد', color: '#f59e0b', effectKind: 'nova' },
    ],
  },
  {
    id: 'necromancer',
    name: 'Necromancer',
    persianName: 'نکرومنسر',
    subtitle: 'Godlike Sovereign of Shadows',
    description:
      'جادوگر اسطوره‌ای سایه‌ها و ارواح تارتاروس با مانا بالا، طلسم‌های بنفش و جادوی گسترده.',
    baseHp: 188,
    baseMp: 155,
    baseAtk: 21,
    baseDef: 10,
    baseSpd: 11,
    accentColor: '#a855f7',
    starterWeaponId: 'soulreaper_staff',
    skills: [
      { id: 'nec_bolt', slotIndex: 0, name: 'Soul Bolt', persianName: 'آذرخش روح', mpCost: 0, cooldown: 0.72, damageMultiplier: 1.12, range: 10.5, aoeRadius: 2.5, unlockLevel: 1, description: 'شلیک گوی ارواح بنفش از عصای تارتاروس', color: '#c084fc', effectKind: 'projectile' },
      { id: 'nec_rift', slotIndex: 1, name: 'Abyssal Nova', persianName: 'انفجار پرتگاه', mpCost: 20, cooldown: 3.5, damageMultiplier: 2.1, range: 6.5, aoeRadius: 6.0, unlockLevel: 1, description: 'گشودن شکاف تاریکی زیر پای دشمنان', color: '#a855f7', effectKind: 'nova' },
      { id: 'nec_drain', slotIndex: 2, name: 'Vampiric Harvest', persianName: 'درو کردن جان', mpCost: 24, cooldown: 5.0, damageMultiplier: 2.1, range: 7.0, aoeRadius: 5.5, unlockLevel: 1, description: 'آسیب بنفش و بازیابی جان قهرمان', color: '#e879f9', effectKind: 'buff_heal' },
      { id: 'nec_curse', slotIndex: 3, name: 'Tartaros Sigil', persianName: 'مهر تارتاروس', mpCost: 26, cooldown: 6.0, damageMultiplier: 2.5, range: 8.5, aoeRadius: 6.8, unlockLevel: 3, description: 'احضار حلقه نفرین باستانی در محدوده وسیع', color: '#9333ea', effectKind: 'nova' },
      { id: 'nec_spear', slotIndex: 4, name: 'Phantom Lance', persianName: 'نیزه شبح', mpCost: 34, cooldown: 6.5, damageMultiplier: 3.0, range: 12.0, aoeRadius: 4.8, unlockLevel: 6, description: 'پرتاب نیزه ارواح با قدرت نفوذ بالا', color: '#7e22ce', effectKind: 'projectile' },
      { id: 'nec_eclipse', slotIndex: 5, name: 'Shadow Eclipse', persianName: 'کسوف تاریک', mpCost: 48, cooldown: 9.5, damageMultiplier: 3.9, range: 8.5, aoeRadius: 8.5, unlockLevel: 9, description: 'طلسم نهایی نکرومنسر و سایه‌های ابدی', color: '#6b21a8', effectKind: 'nova' },
    ],
  },
];

export const INITIAL_QUESTS: QuestDef[] = [
  {
    id: 'main_lost_sword',
    type: 'Main Quest',
    title: 'Find the Lost Sword',
    description:
      'Traverse Astarot, defeat Tartaros the Fallen Sovereign or the Orc Warlord, and claim the Lost Sword of Tartaros.',
    goalText: 'Slay Bosses in Astarot',
    current: 0,
    target: 1,
    completed: false,
    rewardGold: 1000,
    rewardGems: 40,
    rewardXp: 420,
    rewardItemId: 'lost_sword_tartaros',
  },
  {
    id: 'side_wolf_teeth',
    type: 'Side Quest',
    title: 'Collect 10 Wolf Teeth',
    description:
      'Hunt Shadow Wolves in Whispering Woods or Elderwood Wilds and collect 10 Wolf Teeth.',
    goalText: 'Wolf Teeth',
    current: 0,
    target: 10,
    completed: false,
    rewardGold: 500,
    rewardGems: 20,
    rewardXp: 240,
    rewardItemId: 'wolf_fang_amulet',
  },
  {
    id: 'boss_slayer',
    type: 'Side Quest',
    title: 'Conquer the 10 Bosses',
    description: 'Prove your might across all forests, snowy peaks, and the volcanic caldera.',
    goalText: 'Bosses Slain',
    current: 0,
    target: 10,
    completed: false,
    rewardGold: 2200,
    rewardGems: 90,
    rewardXp: 1000,
    rewardItemId: 'dragonscale_warhelm',
  },
];

// === 9 REGIONS MAPPED EXACTLY TO USER'S UPLOADED MAP ARTWORK (map_01028c3c.png) ===
export const WORLD_REGIONS: WorldRegion[] = [
  {
    id: 'city_astarot',
    name: 'Astarot Capital',
    persianName: 'پایتخت آستاروت',
    subtitle: 'Grand Central Capital (440x440)',
    biome: 'city',
    x: 0,
    z: 0,
    size: 220,
    recommendedLevel: 1,
    description: 'Golden royal capital with King Palace, Upper/Middle/Poor districts & open-door shops.',
    color: '#e0a943',
  },
  {
    id: 'city_valoria',
    name: 'Valoria Port City',
    persianName: 'شهر بندری والوریا',
    subtitle: 'Southwest Harbor Citadel (440x440)',
    biome: 'city',
    x: -660,
    z: 620,
    size: 220,
    recommendedLevel: 4,
    description: 'Blue coastal metropolis in the southwest with docks, palace, and market.',
    color: '#38bdf8',
  },
  {
    id: 'city_ironhold',
    name: 'Ironhold Bastion',
    persianName: 'دژ آیرون‌هولد',
    subtitle: 'Southeast Crimson Citadel (440x440)',
    biome: 'city',
    x: 660,
    z: 620,
    size: 220,
    recommendedLevel: 7,
    description: 'Crimson stone bastion guarding the southeast coast and southern fortress.',
    color: '#f87171',
  },
  {
    id: 'forest_whispering',
    name: 'Whispering Woods',
    persianName: 'جنگل نجوا',
    subtitle: 'Eastern Emerald Forest',
    biome: 'forest',
    x: 560,
    z: 40,
    size: 220,
    recommendedLevel: 2,
    description: 'Lush emerald woods fed by mountain rivers, rich with golden healing herbs.',
    color: '#22c55e',
  },
  {
    id: 'forest_elderwood',
    name: 'Elderwood Wilds',
    persianName: 'جنگل الدروود',
    subtitle: 'Western Violet Spirit Woods',
    biome: 'forest',
    x: -580,
    z: -120,
    size: 220,
    recommendedLevel: 5,
    description: 'Ancient spirit canopy fed by northern rivers and prowled by Shadow Wolves.',
    color: '#a855f7',
  },
  {
    id: 'mountain_frostfang',
    name: 'Frostfang Peaks',
    persianName: 'کوه‌های فراست‌فنگ',
    subtitle: 'Northwest Highland Crags',
    biome: 'mountain',
    x: -660,
    z: -620,
    size: 210,
    recommendedLevel: 8,
    description: 'Towering northwestern stone crags feeding sparkling rivers into the forests.',
    color: '#94a3b8',
  },
  {
    id: 'mountain_granite',
    name: 'Granite Spire Ridge',
    persianName: 'رشته‌کوه گرانیت',
    subtitle: 'Eastern Highland Crags',
    biome: 'mountain',
    x: 840,
    z: 220,
    size: 190,
    recommendedLevel: 9,
    description: 'Rugged eastern ridges overlooking the glowing forest waterfalls.',
    color: '#a8a29e',
  },
  {
    id: 'snow_glacier',
    name: 'Glacier Tundra',
    persianName: 'سرزمین برفی توندرا',
    subtitle: 'Northern Frozen Realm',
    biome: 'snow',
    x: -40,
    z: -760,
    size: 250,
    recommendedLevel: 11,
    description: 'Frozen northern realm where snow blankets the earth and roofs.',
    color: '#bae6fd',
  },
  {
    id: 'lava_caldera',
    name: 'Inferno Volcano',
    persianName: 'منطقه مذاب و آتشفشان',
    subtitle: 'Northeast Volcanic Caldera',
    biome: 'lava',
    x: 740,
    z: -640,
    size: 260,
    recommendedLevel: 14,
    description: 'Erupting northeast volcano and obsidian fortress of the Final Bosses.',
    color: '#ef4444',
  },
];

// Fenced safe highways connecting the 3 cities!
export const INTER_CITY_ROADS: Array<[number, number, number, number]> = [
  [0, 0, -660, 620], // Astarot <-> Valoria
  [0, 0, 660, 620], // Astarot <-> Ironhold
  [-660, 620, 660, 620], // Valoria <-> Ironhold
  [0, 0, -40, -760], // Astarot <-> North Glacier
  [0, 0, 560, 40], // Astarot <-> Whispering Woods
  [0, 0, -580, -120], // Astarot <-> Elderwood
];

// === TOWN NPCs STATIONED INSIDE OPEN-DOOR WALK-IN BUILDINGS ===
export const TOWN_NPCS: NpcDef[] = [
  {
    id: 'elder_kaelen',
    name: 'Elder Kaelen',
    title: 'Quest Master (Open Hall)',
    cityId: 'city_astarot',
    role: 'quest',
    x: 0,
    z: -32,
    rotationY: 0,
    robeColor: '#1e3a5f',
    accentColor: '#e0a943',
    greeting:
      'به آستاروت خوش آمدی قهرمان! به قصر پادشاه و بازار شهر سر بزن، گل‌های طلایی جنگل را بچین و دنیای تارتاروس را نجات بده.',
    shopItemIds: ['solar_crest_amulet', 'wolf_fang_amulet', 'golden_healing_flower'],
  },
  {
    id: 'blacksmith_garrick',
    name: 'Master Garrick',
    title: 'Royal Blacksmith Shop',
    cityId: 'city_astarot',
    role: 'weaponsmith',
    x: -36,
    z: -14,
    rotationY: Math.PI * 0.5,
    robeColor: '#4a2518',
    accentColor: '#d97706',
    greeting: 'وارد مغازه آهنگری شو و سلاح، زره و کلاه‌خود متعادل بخر!',
    shopItemIds: [
      'rusty_broadsword',
      'astarot_knight_blade',
      'crimson_ignis_sword',
      'sylvan_longbow',
      'iron_sallet',
      'vanguard_helm',
      'dragonscale_warhelm',
      'leather_brigandine',
      'astarot_steel_cuirass',
      'obsidian_tartaros_plate',
      'iron_gauntlets',
      'gilded_war_gauntlets',
      'leather_boots',
      'sovereign_greaves',
    ],
  },
  {
    id: 'alchemist_lyra',
    name: 'Alchemist Lyra',
    title: 'Mystic Apothecary Shop',
    cityId: 'city_astarot',
    role: 'alchemist',
    x: 36,
    z: -14,
    rotationY: -Math.PI * 0.5,
    robeColor: '#3b1d52',
    accentColor: '#a855f7',
    greeting: 'معجون‌ها، عصاها، حلقه‌های جادویی و شنل‌ها آماده خرید هستند.',
    shopItemIds: [
      'health_potion',
      'mana_elixir',
      'greater_sun_elixir',
      'golden_healing_flower',
      'soulreaper_staff',
      'ruby_signet_ring',
      'arcane_sapphire_ring',
      'traveler_mantle',
      'crimson_royal_cape',
      'shadow_dragon_cloak',
    ],
  },
  {
    id: 'merchant_vergil',
    name: 'Captain Vergil',
    title: 'Valoria Harbor Guild',
    cityId: 'city_valoria',
    role: 'weaponsmith',
    x: -660,
    z: 590,
    rotationY: 0,
    robeColor: '#164e63',
    accentColor: '#38bdf8',
    greeting: 'به شهر بندری والوریا خوش آمدید!',
    shopItemIds: [
      'astarot_knight_blade',
      'sylvan_longbow',
      'vanguard_helm',
      'astarot_steel_cuirass',
      'health_potion',
      'mana_elixir',
    ],
  },
  {
    id: 'forgemaster_torin',
    name: 'Forgemaster Torin',
    title: 'Ironhold Armory Shop',
    cityId: 'city_ironhold',
    role: 'weaponsmith',
    x: 660,
    z: 590,
    rotationY: 0,
    robeColor: '#3f3f46',
    accentColor: '#f59e0b',
    greeting: 'سلاح‌های سنگین آیرون‌هولد برای نبرد با باس‌های نهایی آماده است.',
    shopItemIds: [
      'crimson_ignis_sword',
      'soulreaper_staff',
      'dragonscale_warhelm',
      'obsidian_tartaros_plate',
      'greater_sun_elixir',
      'shadow_dragon_cloak',
    ],
  },
];

// === BALANCED 100 MOBS + 10 BOSSES ===
export function generateWorldEnemies(): EnemyState[] {
  const list: EnemyState[] = [];
  const seeded = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const spawnSpecs: Array<{
    regionId: string;
    count: number;
    kinds: MobKind[];
    baseLv: number;
  }> = [
    { regionId: 'forest_whispering', count: 28, kinds: ['wolf', 'goblin', 'boar', 'venom_spider', 'dark_fairy'], baseLv: 2 },
    { regionId: 'forest_elderwood', count: 28, kinds: ['wolf', 'skeleton', 'forest_troll', 'raven', 'corrupted_ent'], baseLv: 5 },
    { regionId: 'mountain_frostfang', count: 24, kinds: ['golem', 'stone_mite', 'frost_bat', 'ice_wolf', 'bandit'], baseLv: 7 },
    { regionId: 'mountain_granite', count: 24, kinds: ['golem', 'horned_beetle', 'crystal_hound', 'stone_mite', 'bandit'], baseLv: 9 },
    { regionId: 'snow_glacier', count: 22, kinds: ['yeti', 'wolf', 'frost_bat', 'ice_wolf'], baseLv: 11 },
    { regionId: 'lava_caldera', count: 24, kinds: ['imp', 'drake', 'fire_lizard', 'ember_hound', 'ash_golem', 'lava_serpent'], baseLv: 14 },
    { regionId: 'forest_whispering', count: 8, kinds: ['swamp_slime', 'cactus_beast', 'sand_wraith', 'thunder_harpy'], baseLv: 6 },
  ];

  let mobIdx = 1;
  spawnSpecs.forEach((spec) => {
    const reg = WORLD_REGIONS.find((r) => r.id === spec.regionId)!;
    for (let i = 0; i < spec.count; i++) {
      const kind = spec.kinds[i % spec.kinds.length];
      const isWolf = kind === 'wolf' || kind === 'ice_wolf';
      const packIndex = Math.floor(i / (isWolf ? 4 : 1));
      const packAngle = seeded((mobIdx + packIndex) * 3) * Math.PI * 2;
      const packDist = 34 + seeded((mobIdx + packIndex) * 5) * Math.max(20, reg.size - 55);
      const packCenterX = reg.x + Math.cos(packAngle) * packDist;
      const packCenterZ = reg.z + Math.sin(packAngle) * packDist;
      const memberAngle = seeded(mobIdx * 17) * Math.PI * 2;
      const memberDist = isWolf ? 4.5 + seeded(mobIdx * 19) * 4 : 0;
      const x = Math.round(packCenterX + Math.cos(memberAngle) * memberDist);
      const z = Math.round(packCenterZ + Math.sin(memberAngle) * memberDist);
      const lv = spec.baseLv + (i % 3);
      // Grounded balanced HP & ATK scaling
      const maxHp = 85 + lv * 18;
      const nameMap: Record<MobKind, string> = {
        wolf: 'Shadow Wolf',
        goblin: 'Forest Goblin',
        yeti: 'Frost Yeti',
        golem: 'Granite Golem',
        skeleton: 'Cursed Skeleton',
        imp: 'Magma Imp',
        drake: 'Flame Drake',
        orc_warlord: 'Orc Warlord',
        final_malakor: 'Malakor, Lord of Ash',
        final_tartaros: 'Tartaros, Fallen Sovereign',
        boar: 'Ironhide Boar',
        bandit: 'Road Bandit',
        swamp_slime: 'Mire Slime',
        horned_beetle: 'Horned Scarab',
        venom_spider: 'Venom Spider',
        stone_mite: 'Stone Mite',
        frost_bat: 'Frost Bat',
        ice_wolf: 'Glacier Wolf',
        fire_lizard: 'Ember Lizard',
        ember_hound: 'Ember Hound',
        ash_golem: 'Ash Golem',
        sand_wraith: 'Sand Wraith',
        cactus_beast: 'Cactus Beast',
        forest_troll: 'Forest Troll',
        dark_fairy: 'Dark Fairy',
        raven: 'Grim Raven',
        corrupted_ent: 'Corrupted Ent',
        crystal_hound: 'Crystal Hound',
        lava_serpent: 'Lava Serpent',
        thunder_harpy: 'Thunder Harpy',
      };

      list.push({
        id: `mob-${mobIdx}`,
        kind,
        name: nameMap[kind],
        level: lv,
        x,
        z,
        homeX: x,
        homeZ: z,
        hp: maxHp,
        maxHp,
        atk: 9 + lv * 2,
        def: 2 + Math.floor(lv * 0.5),
        speed: kind === 'wolf' || kind === 'imp' ? 5.2 : 4.0,
        xpReward: 24 + lv * 7,
        goldReward: 20 + lv * 5,
        dropChance: 0.34,
        dropPool:
          kind === 'wolf'
            ? ['wolf_tooth', 'health_potion', 'leather_boots', 'iron_gauntlets']
            : ['health_potion', 'mana_elixir', 'rusty_broadsword', 'iron_sallet', 'ruby_signet_ring'],
        isBoss: false,
        phase: 1,
        alive: true,
        respawnTimer: 0,
        state: 'idle',
        packId: (kind === 'wolf' || kind === 'ice_wolf') ? `pack-${spec.regionId}-${Math.floor(i / 4)}` : undefined,
      });
      mobIdx++;
    }
  });

  // 10 Balanced Bosses aligned to updated Map regions
  const bosses: Array<{
    id: string;
    kind: MobKind;
    name: string;
    level: number;
    x: number;
    z: number;
    hp: number;
    atk: number;
    hasPhases?: boolean;
    dropPool: string[];
  }> = [
    { id: 'boss-1', kind: 'orc_warlord', name: 'Orc Warlord', level: 7, x: 560, z: 60, hp: 520, atk: 24, dropPool: ['astarot_knight_blade', 'crimson_royal_cape', 'greater_sun_elixir'] },
    { id: 'boss-2', kind: 'goblin', name: 'Goblin Chieftain', level: 5, x: 470, z: -20, hp: 440, atk: 20, dropPool: ['sylvan_longbow', 'traveler_mantle', 'vanguard_helm'] },
    { id: 'boss-3', kind: 'wolf', name: 'Elderwood Alpha', level: 8, x: -580, z: -120, hp: 580, atk: 27, dropPool: ['wolf_fang_amulet', 'gilded_war_gauntlets'] },
    { id: 'boss-4', kind: 'skeleton', name: 'Dread Necro-Knight', level: 10, x: -510, z: -210, hp: 690, atk: 31, dropPool: ['soulreaper_staff', 'arcane_sapphire_ring'] },
    { id: 'boss-5', kind: 'golem', name: 'Frostfang Colossus', level: 12, x: -660, z: -620, hp: 820, atk: 34, dropPool: ['astarot_steel_cuirass', 'sovereign_greaves'] },
    { id: 'boss-6', kind: 'golem', name: 'Granite Titan', level: 13, x: 840, z: 220, hp: 900, atk: 36, dropPool: ['crimson_ignis_sword', 'vanguard_helm'] },
    { id: 'boss-7', kind: 'yeti', name: 'Blizzard Sovereign', level: 14, x: -40, z: -760, hp: 1020, atk: 40, dropPool: ['shadow_dragon_cloak', 'solar_crest_amulet'] },
    { id: 'boss-8', kind: 'drake', name: 'Pyre Wyvern', level: 16, x: 640, z: -560, hp: 1180, atk: 44, dropPool: ['obsidian_tartaros_plate', 'greater_sun_elixir'] },
    { id: 'boss-9', kind: 'final_malakor', name: 'Malakor, Lord of Ash [Phase Boss]', level: 18, x: 730, z: -610, hp: 1480, atk: 50, hasPhases: true, dropPool: ['dragonscale_warhelm', 'obsidian_tartaros_plate', 'crimson_ignis_sword'] },
    { id: 'boss-10', kind: 'final_tartaros', name: 'Tartaros, Fallen Sovereign [Final Boss]', level: 20, x: 780, z: -680, hp: 1850, atk: 56, hasPhases: true, dropPool: ['lost_sword_tartaros', 'shadow_dragon_cloak', 'dragonscale_warhelm'] },
  ];

  bosses.forEach((b) => {
    list.push({
      id: b.id,
      kind: b.kind,
      name: b.name,
      level: b.level,
      x: b.x,
      z: b.z,
      homeX: b.x,
      homeZ: b.z,
      hp: b.hp,
      maxHp: b.hp,
      atk: b.atk,
      def: 8 + Math.floor(b.level * 0.7),
      speed: 4.3,
      xpReward: 150 + b.level * 25,
      goldReward: 200 + b.level * 30,
      dropChance: 0.95,
      dropPool: b.dropPool,
      isBoss: true,
      hasPhases: b.hasPhases,
      phase: 1,
      alive: true,
      respawnTimer: 0,
      state: 'idle',
    });
  });

  return list;
}
