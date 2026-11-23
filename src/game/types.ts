export type ScreenStage =
  | 'intro'
  | 'loading'
  | 'username'
  | 'gender'
  | 'classSelect'
  | 'playing';

export type Gender = 'male' | 'female';
export type ClassId = 'berserker' | 'archer' | 'knight' | 'necromancer';
export type Language = 'fa' | 'en';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type FpsCap = 30 | 60 | 120;
export type WeatherType = 'clear' | 'rain' | 'snow';

export interface GameSettings {
  fpsCap: FpsCap;
  graphics: GraphicsQuality;
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
  language: Language;
}

export type ModalTab =
  | 'none'
  | 'character'
  | 'inventory'
  | 'skills'
  | 'quests'
  | 'map'
  | 'shop'
  | 'settings';

export type EquipSlot =
  | 'helmet'
  | 'armor'
  | 'gauntlets'
  | 'ring'
  | 'cloak'
  | 'weapon'
  | 'boots'
  | 'amulet';

export type ItemCategory = EquipSlot | 'consumable' | 'quest';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type VisualTier = 'rustic' | 'steel' | 'crimson' | 'tartaros';

export interface ItemStats {
  hp?: number;
  mp?: number;
  atk?: number;
  def?: number;
  spd?: number;
  healHp?: number;
  healMp?: number;
}

export interface GameItem {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  description: string;
  stats: ItemStats;
  price: number;
  sellPrice: number;
  visualTier?: VisualTier;
  primaryColor?: string;
  accentColor?: string;
  glowColor?: string;
  weaponKind?: 'sword' | 'greataxe' | 'bow' | 'staff';
  iconKey: string;
  stackable?: boolean;
}

export interface InventoryEntry {
  uid: string;
  itemId: string;
  quantity: number;
}

export type EquippedMap = Record<EquipSlot, string | null>;

export interface AllocatedStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface HeroStats {
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  gold: number;
  gems: number;
  statTokens: number;
  skillTokens: number;
}

export interface ClassSkillDef {
  id: string;
  slotIndex: number;
  name: string;
  persianName: string;
  mpCost: number;
  cooldown: number;
  damageMultiplier: number;
  range: number;
  aoeRadius: number;
  unlockLevel: number;
  description: string;
  color: string;
  effectKind: 'melee' | 'whirlwind' | 'slam' | 'projectile' | 'nova' | 'buff_heal';
}

export interface ClassDef {
  id: ClassId;
  name: string;
  persianName: string;
  subtitle: string;
  description: string;
  baseHp: number;
  baseMp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  accentColor: string;
  starterWeaponId: string;
  skills: ClassSkillDef[];
}

export interface QuestDef {
  id: 'main_lost_sword' | 'side_wolf_teeth' | 'boss_slayer';
  type: 'Main Quest' | 'Side Quest';
  title: string;
  description: string;
  goalText: string;
  current: number;
  target: number;
  completed: boolean;
  rewardGold: number;
  rewardGems: number;
  rewardXp: number;
  rewardItemId?: string;
}

export type BiomeType = 'city' | 'forest' | 'mountain' | 'snow' | 'lava';

export interface WorldRegion {
  id: string;
  name: string;
  persianName: string;
  subtitle: string;
  biome: BiomeType;
  x: number;
  z: number;
  size: number;
  recommendedLevel: number;
  description: string;
  color: string;
}

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  cityId: string;
  role: 'quest' | 'weaponsmith' | 'alchemist';
  x: number;
  z: number;
  rotationY: number;
  robeColor: string;
  accentColor: string;
  greeting: string;
  shopItemIds: string[];
}

export type MobKind =
  | 'wolf'
  | 'goblin'
  | 'yeti'
  | 'golem'
  | 'skeleton'
  | 'imp'
  | 'drake'
  | 'orc_warlord'
  | 'final_malakor'
  | 'final_tartaros'
  | 'boar'
  | 'bandit'
  | 'swamp_slime'
  | 'horned_beetle'
  | 'venom_spider'
  | 'stone_mite'
  | 'frost_bat'
  | 'ice_wolf'
  | 'fire_lizard'
  | 'ember_hound'
  | 'ash_golem'
  | 'sand_wraith'
  | 'cactus_beast'
  | 'forest_troll'
  | 'dark_fairy'
  | 'raven'
  | 'corrupted_ent'
  | 'crystal_hound'
  | 'lava_serpent'
  | 'thunder_harpy';

export interface EnemyState {
  id: string;
  kind: MobKind;
  name: string;
  level: number;
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  xpReward: number;
  goldReward: number;
  dropChance: number;
  difficulty?: 'normal' | 'hard' | 'nightmare' | 'hell';
  dropPool: string[];
  isBoss: boolean;
  hasPhases?: boolean;
  phase: 1 | 2;
  alive: boolean;
  respawnTimer: number;
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'skill' | 'stagger';
  packId?: string;
}

export interface LootDrop {
  id: string;
  x: number;
  z: number;
  kind: 'gold' | 'xp' | 'item';
  goldAmount?: number;
  xpAmount?: number;
  itemId?: string;
  rarity?: ItemRarity;
  life: number;
}

export interface GoldenFlower {
  id: string;
  x: number;
  z: number;
  life: number; // 1200s (20 minutes)
}

export interface FloatingDamage {
  id: string;
  x: number;
  y: number;
  text: string;
  kind: 'damage' | 'crit' | 'heal' | 'enemyHit' | 'loot';
}

export type HeroAnimAction =
  | 'idle'
  | 'run'
  | 'jump'
  | 'attack1'
  | 'attack2'
  | 'skill_heavy'
  | 'skill_nova'
  | 'skill_shoot'
  | 'dodge'
  | 'hit'
  | 'dead';

export interface CameraViewMode {
  zoomLevel: 'close' | 'adventure' | 'overview';
}
