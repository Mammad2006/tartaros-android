import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Coins,
  Compass,
  Flame,
  Flower2,
  Gem,
  Heart,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Play,
  Settings,
  Shield,
  Skull,
  Smartphone,
  Snowflake,
  Sparkles,
  Sun,
  Swords,
  User,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { CharacterInventoryModal } from './components/CharacterInventoryModal';
import {
  ExitPauseModal,
  NpcShopModal,
  SettingsModal,
  SkillsQuestsModal,
} from './components/GameModals';
import {
  ClassSelectionScreen,
  CoolLoadingScreen,
  GenderScreen,
  IntroPresentation,
  UsernameScreen,
} from './components/IntroAndOnboarding';
import { MinimapWidget, WorldMapModal } from './components/MinimapAndWorldMap';
import { TouchJoystick } from './components/TouchJoystick';
import { soundEngine } from './game/audio';
import { DuelRequest, DuelState, DuelEndEvent } from './game/online';
import {
  CLASSES,
  createStarterInventory,
  INITIAL_QUESTS,
  ITEMS,
  STARTER_EMPTY_EQUIPPED,
  TOWN_NPCS,
  WORLD_REGIONS,
} from './game/data';
import { TRANSLATIONS } from './game/i18n';
import { mountWorldScene, WorldController } from './game/three/WorldScene';
import {
  AllocatedStats,
  ClassId,
  EnemyState,
  EquipSlot,
  EquippedMap,
  FloatingDamage,
  GameSettings,
  Gender,
  GoldenFlower,
  HeroStats,
  InventoryEntry,
  LootDrop,
  ModalTab,
  NpcDef,
  QuestDef,
  ScreenStage,
  WeatherType,
  WorldRegion,
} from './game/types';

const SAVE_STORAGE_KEY = 'tartaros_save_v2';

const DEFAULT_SETTINGS: GameSettings = {
  fpsCap: 60,
  graphics: 'medium',
  bgmVolume: 0.55,
  sfxVolume: 0.75,
  language: 'fa',
};

interface SavedGameData {
  username: string;
  gender: Gender;
  classId: ClassId;
  stats: HeroStats;
  equipped: EquippedMap;
  inventory: InventoryEntry[];
  quests: QuestDef[];
  allocatedStats: AllocatedStats;
  skillLevels: Record<string, number>;
  playerPos: { x: number; z: number };
  settings: GameSettings;
}

function loadSavedGame(): SavedGameData | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGameData>;
    if (!parsed || typeof parsed.username !== 'string' || parsed.username.trim().length < 3) {
      return null;
    }
    if (!parsed.classId || !CLASSES.some((c) => c.id === parsed.classId)) {
      return null;
    }
    return {
      username: parsed.username,
      gender: parsed.gender === 'female' ? 'female' : 'male',
      classId: parsed.classId,
      stats: parsed.stats || computeHeroStats(1, 0, 200, 10, STARTER_EMPTY_EQUIPPED, parsed.classId, { hp: 0, atk: 0, def: 0, spd: 0 }, 0, 0),
      equipped: { ...STARTER_EMPTY_EQUIPPED, ...(parsed.equipped || {}) },
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : createStarterInventory(CLASSES[0].starterWeaponId),
      quests: Array.isArray(parsed.quests) && parsed.quests.length > 0 ? parsed.quests : INITIAL_QUESTS,
      allocatedStats: parsed.allocatedStats || { hp: 0, atk: 0, def: 0, spd: 0 },
      skillLevels: parsed.skillLevels || {},
      playerPos:
        parsed.playerPos && typeof parsed.playerPos.x === 'number' && typeof parsed.playerPos.z === 'number'
          ? parsed.playerPos
          : { x: 0, z: 24 },
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return null;
  }
}

function computeHeroStats(
  level: number,
  xp: number,
  gold: number,
  gems: number,
  equipped: EquippedMap,
  classId: ClassId,
  allocated: AllocatedStats,
  statTokens: number,
  skillTokens: number,
  prevHp?: number,
  prevMp?: number
): HeroStats {
  const classDef = CLASSES.find((c) => c.id === classId) || CLASSES[0];
  let maxHp = classDef.baseHp + (level - 1) * 24 + allocated.hp * 25;
  let maxMp = classDef.baseMp + (level - 1) * 9;
  let atk = classDef.baseAtk + (level - 1) * 3 + allocated.atk * 4;
  let def = classDef.baseDef + (level - 1) * 2 + allocated.def * 3;
  let spd = classDef.baseSpd + allocated.spd * 2;

  (Object.keys(equipped) as EquipSlot[]).forEach((slot) => {
    const itemId = equipped[slot];
    if (!itemId) return;
    const item = ITEMS[itemId];
    if (!item) return;
    maxHp += item.stats.hp || 0;
    maxMp += item.stats.mp || 0;
    atk += item.stats.atk || 0;
    def += item.stats.def || 0;
    spd += item.stats.spd || 0;
  });

  return {
    level,
    xp,
    xpToNext: level * 120,
    hp: prevHp !== undefined ? Math.min(prevHp, maxHp) : maxHp,
    maxHp,
    mp: prevMp !== undefined ? Math.min(prevMp, maxMp) : maxMp,
    maxMp,
    atk,
    def,
    spd,
    gold,
    gems,
    statTokens,
    skillTokens,
  };
}

export default function App() {
  const initialSave = useMemo(() => loadSavedGame(), []);

  const [hasSave, setHasSave] = useState<boolean>(Boolean(initialSave));
  const [stage, setStage] = useState<ScreenStage>('intro');
  const [username, setUsername] = useState(initialSave?.username || 'Hero');
  const [gender, setGender] = useState<Gender>(initialSave?.gender || 'male');
  const [classId, setClassId] = useState<ClassId>(initialSave?.classId || 'berserker');

  const [settings, setSettings] = useState<GameSettings>(
    initialSave?.settings || DEFAULT_SETTINGS
  );

  const [modalTab, setModalTab] = useState<ModalTab>('none');
  const [activeNpc, setActiveNpc] = useState<NpcDef | null>(null);
  const [nearNpc, setNearNpc] = useState<NpcDef | null>(null);
  const [nearFlower, setNearFlower] = useState<GoldenFlower | null>(null);
  const [skillsDrawerOpen, setSkillsDrawerOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [isManualPaused, setIsManualPaused] = useState(false);

  const [equipped, setEquipped] = useState<EquippedMap>(
    initialSave?.equipped || STARTER_EMPTY_EQUIPPED
  );
  const [inventory, setInventory] = useState<InventoryEntry[]>(() =>
    initialSave?.inventory || createStarterInventory('crimson_ignis_sword')
  );
  const [quests, setQuests] = useState<QuestDef[]>(
    initialSave?.quests || INITIAL_QUESTS
  );
  const [allocatedStats, setAllocatedStats] = useState<AllocatedStats>(
    initialSave?.allocatedStats || { hp: 0, atk: 0, def: 0, spd: 0 }
  );
  const [skillLevels, setSkillLevels] = useState<Record<string, number>>(
    initialSave?.skillLevels || {}
  );

  const [stats, setStats] = useState<HeroStats>(() => {
    if (initialSave) return initialSave.stats;
    return computeHeroStats(
      1,
      0,
      200,
      10,
      STARTER_EMPTY_EQUIPPED,
      'berserker',
      { hp: 0, atk: 0, def: 0, spd: 0 },
      0,
      0
    );
  });

  const spawnPosRef = useRef<{ x: number; z: number }>(
    initialSave?.playerPos || { x: 0, z: 24 }
  );

  const [currentRegion, setCurrentRegion] = useState<WorldRegion>(WORLD_REGIONS[0]);
  const [muted, setMuted] = useState(false);
  const [isHeroDead, setIsHeroDead] = useState(false);
  const [deathPenaltyInfo, setDeathPenaltyInfo] = useState({ goldLost: 0, xpLost: 0 });
  const [floatingTexts, setFloatingTexts] = useState<FloatingDamage[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [portraitWarnDismissed, setPortraitWarnDismissed] = useState(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [duelRequest, setDuelRequest] = useState<DuelRequest | null>(null);
  const [duelState, setDuelState] = useState<DuelState | null>(null);

  const [hudSnapshot, setHudSnapshot] = useState<{
    playerX: number;
    playerZ: number;
    playerRotY: number;
    heroScreenX: number;
    heroScreenY: number;
    heroScreenVisible: boolean;
    jumpCharge: number;
    isNight: boolean;
    weather: WeatherType;
    enemies: Array<{
      id: string;
      name: string;
      level: number;
      hp: number;
      maxHp: number;
      x: number;
      z: number;
      isBoss: boolean;
      phase: 1 | 2;
      alive: boolean;
      screenX: number;
      screenY: number;
      visible: boolean;
    }>;
    npcs: Array<{
      id: string;
      name: string;
      title: string;
      role: NpcDef['role'];
      screenX: number;
      screenY: number;
      visible: boolean;
    }>;
    onlinePlayers: Array<{
      id: string;
      username: string;
      level: number;
      hp: number;
      maxHp: number;
      x: number;
      z: number;
      distance: number;
      screenX: number;
      screenY: number;
      visible: boolean;
      duelId?: string | null;
    }>;
    cooldowns: number[];
    dodgeCooldown: number;
  }>({
    playerX: spawnPosRef.current.x,
    playerZ: spawnPosRef.current.z,
    playerRotY: 0,
    heroScreenX: 0,
    heroScreenY: 0,
    heroScreenVisible: false,
    jumpCharge: 0,
    isNight: false,
    weather: 'clear',
    enemies: [],
    npcs: [],
    onlinePlayers: [],
    cooldowns: [0, 0, 0, 0, 0, 0],
    dodgeCooldown: 0,
  });

  const worldMountRef = useRef<HTMLDivElement>(null);
  const worldCtrlRef = useRef<WorldController | null>(null);

  const equippedRef = useRef(equipped);
  equippedRef.current = equipped;
  const classIdRef = useRef(classId);
  classIdRef.current = classId;
  const allocatedRef = useRef(allocatedStats);
  allocatedRef.current = allocatedStats;
  const playerPosRef = useRef({ x: hudSnapshot.playerX, z: hudSnapshot.playerZ });
  playerPosRef.current = { x: hudSnapshot.playerX, z: hudSnapshot.playerZ };

  const t = TRANSLATIONS[settings.language];

  // Apply Audio & Scene Settings whenever changed
  useEffect(() => {
    soundEngine.setBgmVolume(settings.bgmVolume);
    soundEngine.setSfxVolume(settings.sfxVolume);
    worldCtrlRef.current?.applySettings(settings);
  }, [settings]);

  // Persist save automatically in localStorage when playing
  const persistGameState = useCallback(() => {
    if (stage !== 'playing') return;
    try {
      const payload: SavedGameData = {
        username,
        gender,
        classId,
        stats,
        equipped,
        inventory,
        quests,
        allocatedStats,
        skillLevels,
        playerPos: playerPosRef.current,
        settings,
      };
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
      setHasSave(true);
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [
    stage,
    username,
    gender,
    classId,
    stats,
    equipped,
    inventory,
    quests,
    allocatedStats,
    skillLevels,
    settings,
  ]);

  useEffect(() => {
    persistGameState();
  }, [persistGameState]);

  useEffect(() => {
    if (stage !== 'playing') return;
    const iv = window.setInterval(persistGameState, 4000);
    window.addEventListener('beforeunload', persistGameState);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('beforeunload', persistGameState);
    };
  }, [stage, persistGameState]);

  // Android/Capacitor: force the game into landscape.
  // The native Android manifest is also locked by the GitHub Actions build,
  // while this runtime lock keeps the WebView in landscape when supported.
  useEffect(() => {
    const lockLandscape = async () => {
      try {
        await ScreenOrientation.lock({ orientation: 'landscape' });
      } catch {
        // Browser previews and some WebViews may not expose the API.
        // The native Android manifest remains the authoritative lock.
      }
    };

    lockLandscape();

    const checkOrientation = () => {
      setIsPortraitMobile(window.innerHeight > window.innerWidth && window.innerWidth < 820);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 2800);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  const addFloatingText = useCallback((item: Omit<FloatingDamage, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setFloatingTexts((prev) => [...prev.slice(-14), { ...item, id }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((f) => f.id !== id));
    }, 950);
  }, []);

  const addItemToInventory = useCallback((itemId: string, qty = 1) => {
    const def = ITEMS[itemId];
    if (!def) return;
    setInventory((prev) => {
      if (def.stackable) {
        const existing = prev.find((e) => e.itemId === itemId);
        if (existing) {
          return prev.map((e) =>
            e.uid === existing.uid ? { ...e, quantity: e.quantity + qty } : e
          );
        }
      }
      return [...prev, { uid: `inv-${Date.now()}-${Math.random()}`, itemId, quantity: qty }];
    });
  }, []);

  const grantRewards = useCallback(
    (xpGain: number, goldGain: number, gemsGain = 0) => {
      setStats((prev) => {
        let newXp = prev.xp + xpGain;
        let newLevel = prev.level;
        let statTokens = prev.statTokens;
        let skillTokens = prev.skillTokens;
        let leveledUp = false;
        let earnedTokenLevels = 0;

        while (newXp >= newLevel * 120) {
          newXp -= newLevel * 120;
          newLevel += 1;
          leveledUp = true;
          if (newLevel % 3 === 0) {
            statTokens += 3;
            skillTokens += 1;
            earnedTokenLevels += 1;
          }
        }

        if (leveledUp) {
          soundEngine.playLevelUp();
          if (earnedTokenLevels > 0) {
            showToast(
              settings.language === 'fa'
                ? `سطح ${newLevel}! +${earnedTokenLevels * 3} توکن آمار و +${earnedTokenLevels} توکن مهارت`
                : `Level ${newLevel}! +${earnedTokenLevels * 3} Stat & +${earnedTokenLevels} Skill Tokens!`
            );
          } else {
            showToast(
              settings.language === 'fa'
                ? `ارتقا سطح! شما به لول ${newLevel} رسیدید`
                : `Level Up! You reached Lv.${newLevel}!`
            );
          }
        }

        return computeHeroStats(
          newLevel,
          newXp,
          prev.gold + goldGain,
          prev.gems + gemsGain,
          equippedRef.current,
          classIdRef.current,
          allocatedRef.current,
          statTokens,
          skillTokens,
          leveledUp ? 99999 : prev.hp,
          leveledUp ? 99999 : prev.mp
        );
      });
    },
    [settings.language, showToast]
  );

  // Sync equipment / allocated stats changes to stats & 3D Hero
  useEffect(() => {
    setStats((prev) =>
      computeHeroStats(
        prev.level,
        prev.xp,
        prev.gold,
        prev.gems,
        equipped,
        classId,
        allocatedStats,
        prev.statTokens,
        prev.skillTokens,
        prev.hp,
        prev.mp
      )
    );
    worldCtrlRef.current?.updateEquipment(equipped);
  }, [equipped, classId, allocatedStats]);

  useEffect(() => {
    worldCtrlRef.current?.syncStats(stats);
  }, [stats]);

  useEffect(() => {
    worldCtrlRef.current?.syncSkillLevels(skillLevels);
  }, [skillLevels]);

  useEffect(() => {
    worldCtrlRef.current?.setPaused(
      modalTab !== 'none' || activeNpc !== null || isHeroDead || exitModalOpen || isManualPaused
    );
  }, [modalTab, activeNpc, isHeroDead, exitModalOpen, isManualPaused]);

  const handlePickupLoot = useCallback(
    (drop: LootDrop) => {
      if (drop.kind === 'gold' && drop.goldAmount) {
        grantRewards(0, drop.goldAmount, 0);
        addFloatingText({
          x: hudSnapshot.heroScreenX || window.innerWidth / 2,
          y: Math.max(80, (hudSnapshot.heroScreenY || window.innerHeight / 2) - 20),
          text: `+${drop.goldAmount} G`,
          kind: 'loot',
        });
      } else if (drop.kind === 'xp' && drop.xpAmount) {
        grantRewards(drop.xpAmount, 0, 0);
        addFloatingText({
          x: hudSnapshot.heroScreenX || window.innerWidth / 2,
          y: Math.max(80, (hudSnapshot.heroScreenY || window.innerHeight / 2) - 42),
          text: `+${drop.xpAmount} XP`,
          kind: 'loot',
        });
      } else if (drop.kind === 'item' && drop.itemId) {
        const itemDef = ITEMS[drop.itemId];
        addItemToInventory(drop.itemId, 1);
        if (drop.itemId === 'wolf_tooth') {
          setQuests((prev) =>
            prev.map((q) =>
              q.id === 'side_wolf_teeth' && !q.completed
                ? { ...q, current: Math.min(q.target, q.current + 1) }
                : q
            )
          );
        }
        if (itemDef) {
          showToast(
            settings.language === 'fa'
              ? `آیتم دریافت شد: ${itemDef.name}`
              : `Looted: ${itemDef.name}`
          );
          addFloatingText({
            x: hudSnapshot.heroScreenX || window.innerWidth / 2,
            y: Math.max(80, (hudSnapshot.heroScreenY || window.innerHeight / 2) - 60),
            text: `+1 ${itemDef.name}`,
            kind: 'crit',
          });
        }
      }
    },
    [
      addFloatingText,
      addItemToInventory,
      grantRewards,
      hudSnapshot.heroScreenX,
      hudSnapshot.heroScreenY,
      settings.language,
      showToast,
    ]
  );

  const pickupRef = useRef(handlePickupLoot);
  pickupRef.current = handlePickupLoot;

  const handlePickFlower = useCallback(
    (_flower: GoldenFlower) => {
      addItemToInventory('golden_healing_flower', 1);
      setStats((prev) => ({
        ...prev,
        hp: Math.min(prev.maxHp, prev.hp + Math.round(prev.maxHp * 0.15)),
        mp: Math.min(prev.maxMp, prev.mp + Math.round(prev.maxMp * 0.15)),
      }));
      soundEngine.playPotion();
      showToast(
        settings.language === 'fa'
          ? 'گل درمانی طلایی چیده شد! (۲۰ دقیقه بعد دوباره می‌روید)'
          : 'Picked Golden Sunbloom Herb! (Respawns in 20 min)'
      );
    },
    [addItemToInventory, settings.language, showToast]
  );

  const pickFlowerRef = useRef(handlePickFlower);
  pickFlowerRef.current = handlePickFlower;

  const handleEnemyKilled = useCallback(
    (enemy: EnemyState) => {
      if (enemy.isBoss) {
        grantRewards(0, 0, enemy.hasPhases ? 25 : 10);
        setQuests((prev) =>
          prev.map((q) => {
            if (q.id === 'main_lost_sword' && (enemy.id === 'boss-1' || enemy.id === 'boss-10')) {
              return { ...q, current: 1 };
            }
            if (q.id === 'boss_slayer' && !q.completed) {
              return { ...q, current: Math.min(q.target, q.current + 1) };
            }
            return q;
          })
        );
        showToast(
          settings.language === 'fa'
            ? `${enemy.name} شکست خورد! لوت را بردارید.`
            : `${enemy.name} defeated! Collect your loot.`
        );
      }
    },
    [grantRewards, settings.language, showToast]
  );

  const handleHeroDied = useCallback(() => {
    setStats((prev) => {
      const goldLost = Math.floor(prev.gold * 0.1);
      const xpLost = Math.floor(prev.xp * 0.15);
      setDeathPenaltyInfo({ goldLost, xpLost });
      return {
        ...prev,
        hp: 0,
        gold: Math.max(0, prev.gold - goldLost),
        xp: Math.max(0, prev.xp - xpLost),
      };
    });
    setIsHeroDead(true);
  }, []);

  const handleRespawnInCity = () => {
    worldCtrlRef.current?.respawnInCity();
    setStats((prev) => ({
      ...prev,
      hp: prev.maxHp,
      mp: prev.maxMp,
    }));
    setIsHeroDead(false);
    setCurrentRegion(WORLD_REGIONS[0]);
    showToast(settings.language === 'fa' ? 'در شهر آستاروت احیا شدید!' : 'Respawned in Astarot Capital!');
  };

  const handleConfirmClass = (chosenId: ClassId) => {
    const cDef = CLASSES.find((c) => c.id === chosenId) || CLASSES[0];
    const zeroAlloc: AllocatedStats = { hp: 0, atk: 0, def: 0, spd: 0 };
    const initSkills: Record<string, number> = {};
    cDef.skills.forEach((sk) => {
      initSkills[sk.id] = 1;
    });

    spawnPosRef.current = { x: 0, z: 24 };
    setClassId(chosenId);
    setEquipped(STARTER_EMPTY_EQUIPPED);
    setInventory(createStarterInventory(cDef.starterWeaponId));
    setAllocatedStats(zeroAlloc);
    setSkillLevels(initSkills);
    setQuests(INITIAL_QUESTS);
    setIsHeroDead(false);
    setIsManualPaused(false);
    setCurrentRegion(WORLD_REGIONS[0]);
    setStats(
      computeHeroStats(
        1,
        0,
        200,
        10,
        STARTER_EMPTY_EQUIPPED,
        chosenId,
        zeroAlloc,
        0,
        0
      )
    );
    setStage('playing');
    soundEngine.startBgm();
  };

  // Mount 3D World Scene
  useEffect(() => {
    if (stage !== 'playing') return;
    const el = worldMountRef.current;
    if (!el) return;

    const ctrl = mountWorldScene(
      el,
      gender,
      classId,
      equippedRef.current,
      stats,
      settings,
      spawnPosRef.current,
      {
        onStatsChange: (updater) => setStats(updater),
        onPickupLoot: (drop) => pickupRef.current(drop),
        onPickFlower: (flower) => pickFlowerRef.current(flower),
        onEnemyKilled: handleEnemyKilled,
        onHeroDied: handleHeroDied,
        onZoneChange: (region) => setCurrentRegion(region),
        onNearNpcChange: (n) => setNearNpc(n),
        onNearFlowerChange: (f) => setNearFlower(f),
        onNpcClicked: (n) => setActiveNpc(n),
        onFloatingText: addFloatingText,
        onDuelRequest: (request) => setDuelRequest(request),
        onDuelState: (state) => setDuelState(state),
        onDuelDamage: () => {},
        onDuelNotice: (message) => showToast(message),
        onDuelEnd: (event, localWon) => {
          setDuelState(null);
          worldCtrlRef.current?.respawnInCity();
          setStats((prev) => ({
            ...prev,
            hp: prev.maxHp,
            mp: prev.maxMp,
            gold: localWon ? event.winnerGold : event.loserGold,
          }));
          showToast(localWon
            ? `🏆 پیروز شدید! ${event.transferredGold.toLocaleString()} سکه دریافت کردید.`
            : `💀 شکست خوردید! ${event.transferredGold.toLocaleString()} سکه از دست دادید.`);
        },
        onHudTick: (snap) => setHudSnapshot(snap),
      },
      { username, level: stats.level }
    );

    ctrl.syncSkillLevels(skillLevels);
    worldCtrlRef.current = ctrl;
    return () => {
      ctrl.dispose();
      worldCtrlRef.current = null;
    };
  }, [stage, gender, classId]);

  const handleEquipItem = (uid: string) => {
    const entry = inventory.find((e) => e.uid === uid);
    if (!entry) return;
    const item = ITEMS[entry.itemId];
    if (!item || item.category === 'consumable' || item.category === 'quest') return;

    const slot = item.category as EquipSlot;
    const previouslyEquippedId = equipped[slot];

    setEquipped((prev) => ({ ...prev, [slot]: item.id }));
    setInventory((prev) => {
      const next = prev.filter((e) => e.uid !== uid);
      if (previouslyEquippedId) {
        next.push({
          uid: `inv-${Date.now()}-${Math.random()}`,
          itemId: previouslyEquippedId,
          quantity: 1,
        });
      }
      return next;
    });

    soundEngine.playEquip();
    showToast(
      settings.language === 'fa'
        ? `${item.name} تجهیز شد!`
        : `${item.name} equipped!`
    );
  };

  const handleUnequipSlot = (slot: EquipSlot) => {
    const itemId = equipped[slot];
    if (!itemId) return;
    setEquipped((prev) => ({ ...prev, [slot]: null }));
    addItemToInventory(itemId, 1);
    soundEngine.playEquip();
    showToast(
      settings.language === 'fa' ? 'آیتم غیرتجهیز شد.' : 'Item unequipped.'
    );
  };

  const handleUseConsumable = (uid: string) => {
    const entry = inventory.find((e) => e.uid === uid);
    if (!entry) return;
    const item = ITEMS[entry.itemId];
    if (!item || item.category !== 'consumable') return;

    setStats((prev) => ({
      ...prev,
      hp: Math.min(prev.maxHp, prev.hp + (item.stats.healHp || 0)),
      mp: Math.min(prev.maxMp, prev.mp + (item.stats.healMp || 0)),
    }));
    setInventory((prev) =>
      prev
        .map((e) => (e.uid === uid ? { ...e, quantity: e.quantity - 1 } : e))
        .filter((e) => e.quantity > 0)
    );
    soundEngine.playPotion();
    showToast(`${item.name}`);
  };

  const handleQuickHeal = () => {
    const vial = inventory.find(
      (e) =>
        e.itemId === 'health_potion' ||
        e.itemId === 'greater_sun_elixir' ||
        e.itemId === 'golden_healing_flower'
    );
    if (vial) {
      handleUseConsumable(vial.uid);
    } else {
      showToast(
        settings.language === 'fa'
          ? 'معجون یا گل درمانی ندارید!'
          : 'No healing potions or herbs!'
      );
    }
  };

  const handleAllocateStat = (statKey: keyof AllocatedStats) => {
    if (stats.statTokens <= 0) return;
    setAllocatedStats((prev) => ({ ...prev, [statKey]: prev[statKey] + 1 }));
    setStats((prev) => ({
      ...prev,
      statTokens: Math.max(0, prev.statTokens - 1),
    }));
    soundEngine.playLevelUp();
  };

  const handleUpgradeSkill = (skillId: string) => {
    if (stats.skillTokens <= 0) return;
    setSkillLevels((prev) => ({ ...prev, [skillId]: (prev[skillId] || 1) + 1 }));
    setStats((prev) => ({
      ...prev,
      skillTokens: Math.max(0, prev.skillTokens - 1),
    }));
    soundEngine.playLevelUp();
  };

  const handleBuyItem = (itemId: string) => {
    const item = ITEMS[itemId];
    if (!item || stats.gold < item.price) return;
    setStats((prev) => ({ ...prev, gold: prev.gold - item.price }));
    addItemToInventory(itemId, 1);
    soundEngine.playCoin();
    showToast(`${item.name}`);
  };

  const handleSellItem = (uid: string) => {
    const entry = inventory.find((e) => e.uid === uid);
    if (!entry) return;
    const item = ITEMS[entry.itemId];
    if (!item) return;

    setStats((prev) => ({ ...prev, gold: prev.gold + item.sellPrice }));
    setInventory((prev) =>
      prev
        .map((e) => (e.uid === uid ? { ...e, quantity: e.quantity - 1 } : e))
        .filter((e) => e.quantity > 0)
    );
    soundEngine.playCoin();
  };

  const handleTurnInQuest = (questId: QuestDef['id']) => {
    const q = quests.find((item) => item.id === questId);
    if (!q || q.completed || q.current < q.target) return;

    setQuests((prev) =>
      prev.map((item) => (item.id === questId ? { ...item, completed: true } : item))
    );
    grantRewards(q.rewardXp, q.rewardGold, q.rewardGems);
    if (q.rewardItemId) {
      addItemToInventory(q.rewardItemId, 1);
    }
    soundEngine.playLevelUp();
    showToast(`${q.title}`);
  };

  const handleResetSave = () => {
    try {
      localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setHasSave(false);
    setModalTab('none');
    setActiveNpc(null);
    setExitModalOpen(false);
    setIsManualPaused(false);
    spawnPosRef.current = { x: 0, z: 24 };
    setEquipped(STARTER_EMPTY_EQUIPPED);
    setInventory(createStarterInventory('crimson_ignis_sword'));
    setQuests(INITIAL_QUESTS);
    setAllocatedStats({ hp: 0, atk: 0, def: 0, spd: 0 });
    setSkillLevels({});
    setStage('username');
  };

  const currentClassDef = useMemo(
    () => CLASSES.find((c) => c.id === classId) || CLASSES[0],
    [classId]
  );

  const potionCount = useMemo(
    () =>
      inventory
        .filter(
          (e) =>
            e.itemId === 'health_potion' ||
            e.itemId === 'greater_sun_elixir' ||
            e.itemId === 'golden_healing_flower'
        )
        .reduce((acc, e) => acc + e.quantity, 0),
    [inventory]
  );

  const fullMapMarkers = useMemo(() => {
    if (modalTab !== 'map') return hudSnapshot.enemies;
    return worldCtrlRef.current?.getMapDots() || hudSnapshot.enemies;
  }, [modalTab, hudSnapshot.enemies]);

  const requestLandscapeFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    orientation?.lock?.('landscape').catch(() => {});
  };

  const renderPortraitGuard = () =>
    isPortraitMobile ? (
      <div className="fixed inset-0 z-[100] bg-[#09080c]/95 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Smartphone className="w-14 h-14 text-[#e0a943] rotate-90" />
        <h2 className="font-display text-xl font-bold text-[#fde68a]">
          بازی فقط در حالت افقی (Landscape) اجرا می‌شود
        </h2>
        <p className="text-sm text-[#d6cfc2] max-w-xs">
          تارتاروس برای نمایش صحیح رابط کاربری و دنیای سه‌بعدی باید در حالت افقی اجرا شود.
        </p>
        <button
          onClick={requestLandscapeFullscreen}
          className="py-2.5 px-4 rounded-lg bg-gradient-to-b from-[#e0a943] to-[#a36c1b] text-[#120d06] font-bold text-sm cursor-pointer"
        >
          تلاش دوباره برای حالت افقی
        </button>
      </div>
    ) : null;

  if (stage === 'intro') {
    return (
      <>
        {renderPortraitGuard()}
        <IntroPresentation onDone={() => setStage('loading')} />
      </>
    );
  }
  if (stage === 'loading') {
    return (
      <>
        {renderPortraitGuard()}
        <CoolLoadingScreen
          hasSave={hasSave}
          savedName={hasSave ? username : undefined}
          onEnter={() => {
            soundEngine.startBgm();
            setStage(hasSave ? 'playing' : 'username');
          }}
        />
      </>
    );
  }
  if (stage === 'username') {
    return (
      <>
        {renderPortraitGuard()}
        <UsernameScreen
          onConfirm={(name) => {
            setUsername(name);
            setStage('gender');
          }}
        />
      </>
    );
  }
  if (stage === 'gender') {
    return (
      <>
        {renderPortraitGuard()}
        <GenderScreen
          onSelectGender={(g) => {
            setGender(g);
            setStage('classSelect');
          }}
        />
      </>
    );
  }
  if (stage === 'classSelect') {
    return (
      <>
        {renderPortraitGuard()}
        <ClassSelectionScreen gender={gender} onConfirmClass={handleConfirmClass} />
      </>
    );
  }

  const weatherLabel =
    hudSnapshot.weather === 'rain'
      ? t.rainWeather
      : hudSnapshot.weather === 'snow'
      ? t.snowWeather
      : t.clearWeather;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#090a0d] select-none">
      {renderPortraitGuard()}

      {/* 100% UNOBSTRUCTED 3D WORLD VIEWPORT (Swipe anywhere to orbit GTA-style!) */}
      <div ref={worldMountRef} className="absolute inset-0 w-full h-full" />

      {/* WORLD-TO-SCREEN PROJECTED HERO NAMEPLATE, ENEMY HP BARS & NPC TAGS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {hudSnapshot.heroScreenVisible && !isHeroDead && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
            style={{ left: hudSnapshot.heroScreenX, top: hudSnapshot.heroScreenY }}
          >
            <span className="px-2 py-0.5 rounded bg-black/75 border border-[#e0a943]/65 text-[11px] font-bold text-[#fde68a] shadow whitespace-nowrap">
              {username}{' '}
              <span className="font-mono-num text-[10px] text-[#7dd3fc]">
                Lv.{stats.level}
              </span>
            </span>
          </div>
        )}

        {hudSnapshot.enemies.map((e) =>
          e.visible ? (
            <div
              key={e.id}
              className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
              style={{ left: e.screenX, top: e.screenY }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono-num text-[10px] font-bold px-1 rounded bg-black/80 border border-[#c4984a]/60 text-[#fde68a]">
                  {e.level}
                </span>
                <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] whitespace-nowrap">
                  {e.name}
                  {e.phase === 2 ? ' [P2]' : ''}
                </span>
              </div>
              <div
                className={`${
                  e.isBoss ? 'w-32 h-2.5' : 'w-16 h-1.5'
                } rounded-full bg-black/80 border border-white/20 overflow-hidden`}
              >
                <div
                  className={`h-full transition-all duration-100 ${
                    e.phase === 2
                      ? 'bg-gradient-to-r from-purple-700 to-fuchsia-500'
                      : 'bg-gradient-to-r from-red-700 to-red-500'
                  }`}
                  style={{ width: `${(e.hp / e.maxHp) * 100}%` }}
                />
              </div>
            </div>
          ) : null
        )}

        {hudSnapshot.npcs.map((n) =>
          n.visible ? (
            <button
              key={n.id}
              onClick={() => {
                const found = TOWN_NPCS.find((item) => item.id === n.id);
                if (found) setActiveNpc(found);
              }}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full flex flex-col items-center group cursor-pointer"
              style={{ left: n.screenX, top: n.screenY }}
            >
              <span className="px-2 py-0.5 rounded bg-[#121016]/90 border border-[#e0a943]/70 text-[11px] font-semibold text-[#fde68a] shadow group-hover:bg-[#2a2216] whitespace-nowrap">
                {n.name}
              </span>
              <span className="text-[9px] text-[#d6cfc2] bg-black/65 px-1.5 rounded mt-0.5 whitespace-nowrap">
                {n.title}
              </span>
            </button>
          ) : null
        )}

        {floatingTexts.map((ft) => (
          <div
            key={ft.id}
            className={`damage-float absolute font-mono-num font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] whitespace-nowrap ${
              ft.kind === 'crit'
                ? 'text-xl text-[#fbbf24]'
                : ft.kind === 'enemyHit'
                ? 'text-sm text-red-400'
                : ft.kind === 'heal'
                ? 'text-sm text-emerald-400'
                : ft.kind === 'loot'
                ? 'text-sm text-amber-300'
                : 'text-base text-white'
            }`}
            style={{ left: ft.x, top: ft.y }}
          >
            {ft.text}
          </div>
        ))}
      </div>

      {/* TOP-LEFT HUD: CLICKABLE HERO PROFILE BAR + DAY/NIGHT WEATHER + QUESTS */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 flex flex-col gap-1.5 pointer-events-none max-w-[255px]">
        <button
          onClick={() => setModalTab('character')}
          className="pointer-events-auto flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-[#110f15]/92 border border-[#c4984a]/60 shadow-lg hover:border-[#fbbf24] text-left cursor-pointer"
          title={t.character}
        >
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-[#e0a943] bg-gradient-to-b from-[#33271e] to-[#161318] flex items-center justify-center shrink-0">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#fde68a]" />
            <span className="absolute -bottom-1 -right-1 px-1 rounded bg-[#141217] border border-[#e0a943] font-mono-num text-[9px] font-bold text-[#fde68a]">
              {stats.level}
            </span>
          </div>

          <div className="flex-1 min-w-[130px] space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-display font-bold text-[#fde68a] truncate max-w-[85px]">
                {username}
              </span>
              <span className="font-mono-num text-[10px] text-[#fecaca]">
                {stats.hp}/{stats.maxHp}
              </span>
            </div>
            <div className="w-full h-1.5 sm:h-2 rounded-full bg-black/80 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#991b1b] to-[#ef4444] transition-all duration-150"
                style={{ width: `${(stats.hp / Math.max(1, stats.maxHp)) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#93c5fd]">{currentClassDef.persianName}</span>
              <span className="font-mono-num text-[#bfdbfe]">
                {stats.mp}/{stats.maxMp}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-black/80 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1d4ed8] to-[#38bdf8] transition-all duration-150"
                style={{ width: `${(stats.mp / Math.max(1, stats.maxMp)) * 100}%` }}
              />
            </div>
            <div className="w-full h-1 rounded-full bg-black/80 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-150"
                style={{ width: `${Math.min(100, (stats.xp / Math.max(1, stats.xpToNext)) * 100)}%` }}
              />
            </div>
          </div>
        </button>

        {/* Time of Day & Weather Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#100e14]/82 border border-white/10 text-[10px] text-[#e7decb] w-fit">
          {hudSnapshot.isNight ? (
            <Moon className="w-3 h-3 text-indigo-300" />
          ) : (
            <Sun className="w-3 h-3 text-amber-300" />
          )}
          <span>{hudSnapshot.isNight ? t.night : t.day}</span>
          <span className="text-white/30">|</span>
          {hudSnapshot.weather === 'rain' ? (
            <CloudRain className="w-3 h-3 text-sky-300" />
          ) : hudSnapshot.weather === 'snow' ? (
            <Snowflake className="w-3 h-3 text-cyan-200" />
          ) : null}
          <span>{weatherLabel}</span>
        </div>

        {(stats.statTokens > 0 || stats.skillTokens > 0) && (
          <div className="pointer-events-auto flex items-center gap-1.5">
            {stats.statTokens > 0 && (
              <button
                onClick={() => setModalTab('character')}
                className="px-2 py-0.5 rounded-lg bg-emerald-700/90 border border-emerald-400 text-[10px] font-bold text-white cursor-pointer shadow"
              >
                +{stats.statTokens} {t.statTokens}
              </button>
            )}
            {stats.skillTokens > 0 && (
              <button
                onClick={() => setModalTab('skills')}
                className="px-2 py-0.5 rounded-lg bg-amber-700/90 border border-amber-400 text-[10px] font-bold text-white cursor-pointer shadow"
              >
                +{stats.skillTokens} {t.skillTokens}
              </button>
            )}
          </div>
        )}

        <div className="pointer-events-auto hidden md:flex flex-col gap-1 p-2 rounded-xl bg-[#100e14]/82 border border-[#c4984a]/35">
          {quests.slice(0, 2).map((q) => (
            <button
              key={q.id}
              onClick={() => setModalTab('quests')}
              className="text-left group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#fde68a]">
                <Compass className="w-3 h-3 text-[#e0a943] shrink-0" />
                <span>{q.type}</span>
              </div>
              <div className="text-[11px] text-[#ece3d3] group-hover:text-white pl-4">
                {q.title}{' '}
                {q.target > 1 ? (
                  <span className="font-mono-num text-[#c7b99e]">
                    ({q.current}/{q.target})
                  </span>
                ) : q.completed ? (
                  <span className="text-emerald-400">(Done)</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* TOP-RIGHT HUD: CURRENCIES + AUDIO + SETTINGS + EXIT + MINIMAP */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-xl bg-[#110f15]/92 border border-[#c4984a]/50 shadow-lg">
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

          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              soundEngine.setMuted(next);
            }}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#d6cfc2] cursor-pointer"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setModalTab('settings')}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 border border-[#c4984a]/40 flex items-center justify-center text-[#fde68a] cursor-pointer"
            title={t.settings}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setExitModalOpen(true)}
            className="w-7 h-7 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 flex items-center justify-center text-red-200 cursor-pointer"
            title={t.exitBtn}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        <MinimapWidget
          region={currentRegion}
          playerX={hudSnapshot.playerX}
          playerZ={hudSnapshot.playerZ}
          playerRotY={hudSnapshot.playerRotY}
          enemies={hudSnapshot.enemies}
          onOpenFullMap={() => setModalTab('map')}
          onAdjustZoom={(delta) => worldCtrlRef.current?.adjustZoom(delta)}
        />
      </div>

      {/* ONLINE PLAYERS: name + level above every nearby live player */}
      <div className="absolute inset-0 z-15 pointer-events-none overflow-hidden">
        {hudSnapshot.onlinePlayers.map((p) => p.visible && (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5 pointer-events-none"
            style={{ left: p.screenX, top: p.screenY }}
          >
            <div className="px-2 py-0.5 rounded-md bg-black/80 border border-sky-400/60 text-[10px] font-bold text-white whitespace-nowrap shadow-lg">
              {p.username} <span className="text-sky-300">Lv.{p.level}</span>
            </div>
            <div className="w-16 h-1 rounded-full bg-black/80 overflow-hidden border border-white/10">
              <div className="h-full bg-red-500" style={{ width: `${Math.max(0, Math.min(100, (p.hp / Math.max(1, p.maxHp)) * 100))}%` }} />
            </div>
            {p.distance <= 9 && !p.duelId && !duelState && (
              <button
                onClick={() => worldCtrlRef.current?.requestDuel(p.id)}
                className="pointer-events-auto mt-1 px-2.5 py-1 rounded-lg bg-red-900/95 border border-red-400 text-red-100 text-[9px] font-bold shadow-lg active:scale-95 cursor-pointer"
              >
                ⚔ درخواست دوئل
              </button>
            )}
          </div>
        ))}
      </div>

      {/* INCOMING DUEL REQUEST */}
      {duelRequest && duelRequest.expiresAt > Date.now() && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[min(92vw,360px)] p-4 rounded-2xl bg-[#100d12]/97 border-2 border-red-500/70 shadow-2xl pointer-events-auto">
          <div className="text-center space-y-2">
            <div className="text-red-300 text-xl font-black">⚔ درخواست دوئل</div>
            <div className="text-white font-bold">{duelRequest.from.username}</div>
            <div className="text-xs text-slate-300">Lv.{duelRequest.from.level} شما را به مبارزه در کولوسئوم دعوت کرده است.</div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { worldCtrlRef.current?.respondDuel(duelRequest.requestId, true); setDuelRequest(null); }} className="flex-1 py-2 rounded-xl bg-emerald-700 border border-emerald-400 text-white font-bold cursor-pointer">تأیید</button>
              <button onClick={() => { worldCtrlRef.current?.respondDuel(duelRequest.requestId, false); setDuelRequest(null); }} className="flex-1 py-2 rounded-xl bg-red-950 border border-red-500 text-red-200 font-bold cursor-pointer">رد</button>
            </div>
          </div>
        </div>
      )}

      {/* DUEL HUD */}
      {duelState && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-red-950/90 border border-red-500/80 shadow-xl pointer-events-none text-center">
          <div className="text-[10px] text-red-300 font-bold">⚔ COLOSSEUM DUEL ⚔</div>
          <div className="text-xs text-white font-black">{duelState.opponent.username} · Lv.{duelState.opponent.level}</div>
        </div>
      )}

      {/* TOAST BANNER */}
      {toastMsg && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-lg bg-[#16131a]/95 border border-[#e0a943]/80 text-xs sm:text-sm font-semibold text-[#fde68a] shadow-xl pointer-events-none whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      {/* MANUAL PAUSE BANNER */}
      {isManualPaused && !exitModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/65 flex flex-col items-center justify-center p-4 space-y-3">
          <div className="tartaros-panel rounded-xl px-6 py-4 text-center space-y-3">
            <h2 className="font-display text-xl font-bold text-[#fde68a]">
              {t.pausedOverlay}
            </h2>
            <button
              onClick={() => setIsManualPaused(false)}
              className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 mx-auto cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>{t.resumeBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM-LEFT: JOYSTICK + CHARACTER BUTTON + CONTEXTUAL TALK / PICK FLOWER */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 flex items-end gap-2.5">
        <TouchJoystick onVectorChange={(x, y) => worldCtrlRef.current?.setInputVector(x, y)} />

        <div className="flex flex-col items-start gap-2">
          {nearFlower && (
            <button
              onClick={() => worldCtrlRef.current?.pickNearbyFlower()}
              className="px-3 py-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-[#120d06] font-bold text-xs shadow-lg flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
            >
              <Flower2 className="w-4 h-4" />
              <span>{t.pickFlower}</span>
            </button>
          )}

          {nearNpc && (
            <button
              onClick={() => setActiveNpc(nearNpc)}
              className="px-3 py-2 rounded-xl bg-gradient-to-b from-[#e0a943] to-[#a36c1b] text-[#120d06] font-bold text-xs shadow-lg flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4" />
              <span>
                {t.talk}: {nearNpc.name}
              </span>
            </button>
          )}

          {/* Single Bottom-Left Character Button (leads to Bag, Shop, Map, Skills, Quests, Settings) */}
          <button
            onClick={() => setModalTab('character')}
            className="relative px-3 py-2 rounded-xl bg-[#131117]/92 border border-[#e0a943]/70 text-[#fde68a] font-bold text-xs shadow-lg flex items-center gap-1.5 hover:bg-[#1e1a24] active:scale-95 transition-transform cursor-pointer"
          >
            <User className="w-4 h-4 text-[#e0a943]" />
            <span>{t.character}</span>
            {(stats.statTokens > 0 || stats.skillTokens > 0) && (
              <span className="px-1 rounded bg-emerald-600 text-[9px] font-mono-num text-white">
                {stats.statTokens + stats.skillTokens}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* BOTTOM-RIGHT: POTION / DODGE / VARIABLE JUMP + COLLAPSIBLE SKILLS DRAWER + PRIMARY ATTACK */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 flex flex-col items-end gap-2">
        {/* Collapsible Skills Drawer (All 6 Class Skills) */}
        {skillsDrawerOpen && (
          <div className="p-2 rounded-xl bg-[#121017]/95 border border-[#c4984a]/65 shadow-2xl grid grid-cols-3 gap-1.5">
            {currentClassDef.skills.map((skill) => {
              const unlocked = stats.level >= skill.unlockLevel;
              const cd = hudSnapshot.cooldowns[skill.slotIndex] || 0;
              const SkillIcon =
                skill.effectKind === 'buff_heal'
                  ? Shield
                  : skill.effectKind === 'slam'
                  ? Flame
                  : skill.effectKind === 'projectile'
                  ? Zap
                  : skill.slotIndex === 0
                  ? Swords
                  : Sparkles;
              return (
                <button
                  key={skill.id}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    worldCtrlRef.current?.triggerSkill(skill.slotIndex);
                  }}
                  className={`relative w-14 h-12 rounded-lg border flex flex-col items-center justify-center px-1 transition-transform active:scale-95 cursor-pointer touch-none ${
                    unlocked
                      ? 'bg-[#1a1622] hover:brightness-110'
                      : 'bg-[#0d0c10] border-white/15 opacity-55'
                  }`}
                  style={{ borderColor: unlocked ? skill.color : undefined }}
                  title={`${skill.persianName} (${skill.mpCost} MP)`}
                >
                  {unlocked ? (
                    <>
                      <SkillIcon className="w-4 h-4" style={{ color: skill.color }} />
                      <span className="text-[8px] font-semibold text-[#fde68a] truncate w-full text-center mt-0.5">
                        {settings.language === 'fa' ? skill.persianName : skill.name}
                      </span>
                      {cd > 0 && (
                        <span className="absolute inset-0 rounded-lg bg-black/80 flex items-center justify-center font-mono-num text-xs font-bold text-white">
                          {cd.toFixed(1)}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-[#9ca3af]">
                      <Lock className="w-3 h-3" />
                      <span className="font-mono-num text-[8px]">Lv.{skill.unlockLevel}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Utility Row: Potion, Dodge, Variable Jump (Multi-touch enabled via onPointerDown) */}
        <div className="flex items-center gap-1.5">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              handleQuickHeal();
            }}
            className="h-9 px-2.5 rounded-xl bg-[#141218]/92 border border-red-500/55 text-red-200 flex items-center gap-1 text-xs font-semibold hover:bg-red-950/60 cursor-pointer touch-none"
          >
            <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
            <span className="font-mono-num">{potionCount}</span>
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              worldCtrlRef.current?.triggerDodge();
            }}
            className="relative h-9 px-2.5 rounded-xl tartaros-slot flex items-center gap-1 text-xs font-semibold text-[#cbd5e1] hover:border-[#e0a943] cursor-pointer touch-none"
          >
            <Wind className="w-3.5 h-3.5" />
            <span>{t.dodge}</span>
            {hudSnapshot.dodgeCooldown > 0 && (
              <span className="absolute inset-0 rounded-xl bg-black/80 flex items-center justify-center font-mono-num text-[10px] font-bold text-white">
                {hudSnapshot.dodgeCooldown.toFixed(1)}
              </span>
            )}
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              worldCtrlRef.current?.startJumpCharge();
            }}
            onPointerUp={() => worldCtrlRef.current?.releaseJump()}
            onPointerLeave={() => worldCtrlRef.current?.releaseJump()}
            onPointerCancel={() => worldCtrlRef.current?.releaseJump()}
            className="relative h-9 px-3 rounded-xl border border-sky-400/75 bg-[#0e2236] flex items-center gap-1 text-xs font-bold text-sky-200 overflow-hidden active:scale-95 transition-transform cursor-pointer touch-none"
          >
            <div
              className="absolute inset-y-0 left-0 bg-sky-400/45 transition-none pointer-events-none"
              style={{ width: `${hudSnapshot.jumpCharge * 100}%` }}
            />
            <ArrowUp className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">{t.jump}</span>
          </button>
        </div>

        {/* Main Combat Cluster: Collapsible Skills Drawer Toggle + Primary Attack */}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setSkillsDrawerOpen((o) => !o)}
            className={`h-12 px-3 rounded-xl border-2 flex items-center gap-1.5 text-xs font-bold shadow-lg active:scale-95 transition-transform cursor-pointer ${
              skillsDrawerOpen
                ? 'border-[#fbbf24] bg-[#292012] text-[#fde68a]'
                : 'border-[#c4984a]/70 bg-[#15131a]/95 text-[#e7decb]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#e0a943]" />
            <span>{t.skills}</span>
            {skillsDrawerOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              worldCtrlRef.current?.triggerSkill(0);
            }}
            className="relative w-16 h-16 rounded-2xl border-2 border-[#f3c669] bg-gradient-to-b from-[#a36319] to-[#422308] flex flex-col items-center justify-center shadow-[0_8px_24px_rgba(234,88,12,0.4)] active:scale-95 transition-transform cursor-pointer touch-none"
          >
            <Swords className="w-7 h-7 text-[#fff4d4]" />
            <span className="text-[11px] font-bold text-[#fde68a]">{t.attack}</span>
            {(hudSnapshot.cooldowns[0] || 0) > 0 && (
              <span className="absolute inset-0 rounded-2xl bg-black/65 flex items-center justify-center font-mono-num text-xs font-bold text-white">
                {hudSnapshot.cooldowns[0].toFixed(1)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* === DEATH & RESPAWN OVERLAY === */}
      {isHeroDead && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="tartaros-panel max-w-md w-full rounded-xl p-6 text-center space-y-4 border-red-500/60">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center">
              <Skull className="w-9 h-9 text-red-400" />
            </div>
            <h2 className="font-display text-2xl font-extrabold text-red-400">{t.youDied}</h2>
            <p className="text-sm text-[#d6cfc2]">{t.youDiedDesc}</p>
            <div className="p-3 rounded-lg bg-black/50 border border-white/10 text-xs text-[#fca5a5] space-y-1 font-mono-num">
              <div>Gold: -{deathPenaltyInfo.goldLost}</div>
              <div>XP: -{deathPenaltyInfo.xpLost}</div>
            </div>
            <button
              onClick={handleRespawnInCity}
              className="w-full py-3 rounded-lg bg-gradient-to-b from-[#e0a943] to-[#a36c1b] text-[#120d06] font-bold text-sm hover:brightness-110 cursor-pointer"
            >
              {t.respawnBtn}
            </button>
          </div>
        </div>
      )}

      {/* === MODALS === */}
      {(modalTab === 'character' || modalTab === 'inventory') && (
        <CharacterInventoryModal
          activeTab={modalTab}
          language={settings.language}
          username={username}
          gender={gender}
          classId={classId}
          stats={stats}
          equipped={equipped}
          inventory={inventory}
          onSwitchTab={(nextTab) => {
            if (nextTab === 'shop') {
              setModalTab('none');
              setActiveNpc(TOWN_NPCS[1]);
            } else {
              setModalTab(nextTab);
            }
          }}
          onEquipItem={handleEquipItem}
          onUnequipSlot={handleUnequipSlot}
          onUseConsumable={handleUseConsumable}
          onAllocateStat={handleAllocateStat}
          onClose={() => setModalTab('none')}
        />
      )}

      {(modalTab === 'skills' || modalTab === 'quests') && (
        <SkillsQuestsModal
          tab={modalTab}
          language={settings.language}
          classId={classId}
          stats={stats}
          skillLevels={skillLevels}
          quests={quests}
          onUpgradeSkill={handleUpgradeSkill}
          onClose={() => setModalTab('none')}
        />
      )}

      {modalTab === 'map' && (
        <WorldMapModal
          playerX={hudSnapshot.playerX}
          playerZ={hudSnapshot.playerZ}
          playerRotY={hudSnapshot.playerRotY}
          enemies={fullMapMarkers}
          onClose={() => setModalTab('none')}
          onTravelTo={(x, z, zoomLevel, openNpc) => {
            worldCtrlRef.current?.teleportTo(x, z);
            worldCtrlRef.current?.setZoomMode(zoomLevel);
            setModalTab('none');
            if (openNpc) {
              setActiveNpc(openNpc);
            }
          }}
        />
      )}

      {modalTab === 'settings' && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onResetSave={handleResetSave}
          onClose={() => setModalTab('none')}
        />
      )}

      {exitModalOpen && (
        <ExitPauseModal
          language={settings.language}
          isPaused={isManualPaused}
          onTogglePause={() => {
            setIsManualPaused((p) => !p);
            setExitModalOpen(false);
          }}
          onExitGame={async () => {
            // Save first, then close the native Android app completely.
            persistGameState();
            setExitModalOpen(false);
            setIsManualPaused(false);

            try {
              await CapacitorApp.exitApp();
            } catch {
              // Browser/dev fallback: return to the intro screen.
              setStage('intro');
            }
          }}
          onClose={() => setExitModalOpen(false)}
        />
      )}

      {activeNpc && (
        <NpcShopModal
          npc={activeNpc}
          language={settings.language}
          stats={stats}
          inventory={inventory}
          quests={quests}
          onBuyItem={handleBuyItem}
          onSellItem={handleSellItem}
          onTurnInQuest={handleTurnInQuest}
          onClose={() => setActiveNpc(null)}
        />
      )}
    </div>
  );
}
