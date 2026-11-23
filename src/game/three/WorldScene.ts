import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio';
import {
  CLASSES,
  generateWorldEnemies,
  INTER_CITY_ROADS,
  ITEMS,
  TOWN_NPCS,
  WORLD_REGIONS,
} from '../data';
import {
  CameraViewMode,
  ClassId,
  ClassSkillDef,
  EnemyState,
  EquippedMap,
  FloatingDamage,
  GameSettings,
  Gender,
  GoldenFlower,
  HeroAnimAction,
  HeroStats,
  LootDrop,
  NpcDef,
  WeatherType,
  WorldRegion,
} from '../types';
import {
  createEnemyRig,
  createGoldenFlowerMesh,
  createLootDropMesh,
  createNpcRig,
  createTownAnimalRig,
  createTownCitizenRig,
  EnemyMeshRig,
} from './Actors';
import { createHeroRig, HeroRig } from './HeroModel';
import {
  createRadialShadowTexture,
  getCobblestoneTexture,
  getGrassTerrainTexture,
} from './textures';

export interface WorldCallbacks {
  onStatsChange: (updater: (prev: HeroStats) => HeroStats) => void;
  onPickupLoot: (drop: LootDrop) => void;
  onPickFlower: (flower: GoldenFlower) => void;
  onEnemyKilled: (enemy: EnemyState) => void;
  onHeroDied: () => void;
  onZoneChange: (region: WorldRegion) => void;
  onNearNpcChange: (npc: NpcDef | null) => void;
  onNearFlowerChange: (flower: GoldenFlower | null) => void;
  onNpcClicked: (npc: NpcDef) => void;
  onFloatingText: (item: Omit<FloatingDamage, 'id'>) => void;
  onHudTick: (snapshot: {
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
    cooldowns: number[];
    dodgeCooldown: number;
  }) => void;
}

export interface WorldController {
  setInputVector: (x: number, y: number) => void;
  startJumpCharge: () => void;
  releaseJump: () => void;
  triggerSkill: (slotIndex: number) => void;
  triggerDodge: () => void;
  pickNearbyFlower: () => void;
  updateEquipment: (equipped: EquippedMap) => void;
  applySettings: (settings: GameSettings) => void;
  setBattleSpeed: (speed: 1 | 2) => void;
  setZoomMode: (mode: CameraViewMode['zoomLevel']) => void;
  adjustZoom: (delta: number) => void;
  teleportTo: (x: number, z: number) => void;
  respawnInCity: () => void;
  syncStats: (stats: HeroStats) => void;
  syncSkillLevels: (levels: Record<string, number>) => void;
  getMapDots: () => Array<{ id: string; x: number; z: number; isBoss: boolean }>;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
}

interface ColliderCircle {
  x: number;
  z: number;
  radius: number;
}
interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
interface BurstParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}
interface ActiveProjectile {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  isCrit: boolean;
  life: number;
}

function pointToSegmentDist(px: number, pz: number, x1: number, z1: number, x2: number, z2: number) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / l2));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

function isInSafeZoneOrRoad(x: number, z: number): boolean {
  for (const r of WORLD_REGIONS) {
    if (r.biome === 'city' && Math.abs(x - r.x) < r.size && Math.abs(z - r.z) < r.size) {
      return true;
    }
  }
  for (const [x1, z1, x2, z2] of INTER_CITY_ROADS.slice(0, 3)) {
    if (pointToSegmentDist(x, z, x1, z1, x2, z2) < 9.5) return true;
  }
  return false;
}

export function mountWorldScene(
  container: HTMLElement,
  gender: Gender,
  classId: ClassId,
  initialEquipped: EquippedMap,
  initialStats: HeroStats,
  initialSettings: GameSettings,
  initialSpawn: { x: number; z: number },
  callbacks: WorldCallbacks
): WorldController {
  const classDef = CLASSES.find((c) => c.id === classId) || CLASSES[0];

  const isSoftwareGl = (() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  })();

  const width = Math.max(container.clientWidth, 320);
  const height = Math.max(container.clientHeight, 240);

  const scene = new THREE.Scene();
  const skyColor = new THREE.Color(0x5b9bd5);
  scene.background = skyColor;
  const fog = new THREE.FogExp2(0x739fc7, 0.0028);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.3, 460);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl && initialSettings.graphics !== 'low',
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl && initialSettings.graphics !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight(0xcbe2ff, 0x3b2d22, 0.85);
  scene.add(hemi);

  const sunLight = new THREE.DirectionalLight(0xfff1d0, 2.0);
  sunLight.castShadow = !isSoftwareGl && initialSettings.graphics !== 'low';
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -48;
  sunLight.shadow.camera.right = 48;
  sunLight.shadow.camera.top = 48;
  sunLight.shadow.camera.bottom = -48;
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 160;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // === SKY: SUN, MOON, STARS & CLOUDS ===
  const skyGroup = new THREE.Group();
  scene.add(skyGroup);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(9, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  skyGroup.add(sunDisc);

  const moonDisc = new THREE.Mesh(
    new THREE.SphereGeometry(7, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
  );
  skyGroup.add(moonDisc);

  // Twinkling Night Stars
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.44;
    const r = 210;
    starPos[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
    starPos[i * 3 + 1] = Math.cos(phi) * r;
    starPos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, transparent: true, opacity: 0 });
  const stars = new THREE.Points(starGeo, starMat);
  skyGroup.add(stars);

  // Drifting Fluffy 3D Clouds
  const clouds: THREE.Group[] = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 18; i++) {
    const cg = new THREE.Group();
    for (let p = 0; p < 3; p++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(4.5 + p * 1.4, 8, 8), cloudMat);
      puff.scale.set(1.6, 0.65, 1.2);
      puff.position.set((p - 1) * 5.2, (p % 2) * 1.4, (p % 2) * 1.5);
      cg.add(puff);
    }
    cg.position.set((Math.random() - 0.5) * 260, 56 + (i % 4) * 5, (Math.random() - 0.5) * 260);
    skyGroup.add(cg);
    clouds.push(cg);
  }

  // === WORLD COLLIDERS ===
  const circleColliders: ColliderCircle[] = [];
  const boxColliders: ColliderBox[] = [];
  const snowableRoofMats: THREE.MeshStandardMaterial[] = [];
  const roofBaseColors: THREE.Color[] = [];

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // 1. Ocean & Continent
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(3400, 3400),
    new THREE.MeshStandardMaterial({ color: 0x0b3656, roughness: 0.25, metalness: 0.35 })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.85;
  worldGroup.add(ocean);

  const grassTex = getGrassTerrainTexture();
  grassTex.repeat.set(96, 96);
  const continentMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 });
  const continent = new THREE.Mesh(new THREE.BoxGeometry(2400, 1.4, 2400), continentMat);
  continent.position.y = -0.7;
  continent.receiveShadow = true;
  worldGroup.add(continent);

  // Snow Ground Blanket following player when Snowing!
  const snowFollowMat = new THREE.MeshStandardMaterial({
    color: 0xeef6ff,
    roughness: 0.85,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const snowFollowBlanket = new THREE.Mesh(new THREE.CircleGeometry(65, 28), snowFollowMat);
  snowFollowBlanket.rotation.x = -Math.PI / 2;
  snowFollowBlanket.position.y = 0.045;
  snowFollowBlanket.receiveShadow = true;
  scene.add(snowFollowBlanket);

  // 2. FENCED INTER-CITY HIGHWAYS (Safe from Enemies!)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x76644d, roughness: 0.9 });
  const fenceWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d24, roughness: 0.85 });
  const fencePostGeo = new THREE.BoxGeometry(0.45, 1.55, 0.45);

  INTER_CITY_ROADS.forEach(([x1, z1, x2, z2], rIdx) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(x2 - x1, z2 - z1);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(11, len), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = -angle;
    road.position.set((x1 + x2) / 2, 0.025, (z1 + z2) / 2);
    road.receiveShadow = true;
    worldGroup.add(road);

    // Build safety fences along the 3 inter-city highways
    if (rIdx < 3) {
      const nx = Math.cos(angle);
      const nz = -Math.sin(angle);
      const steps = Math.floor(len / 14);
      for (let s = 12; s < steps - 12; s++) {
        const t = s / steps;
        const px = x1 + (x2 - x1) * t;
        const pz = z1 + (z2 - z1) * t;
        // Skip fence inside cities
        if (
          WORLD_REGIONS.some(
            (reg) => reg.biome === 'city' && Math.abs(px - reg.x) < reg.size && Math.abs(pz - reg.z) < reg.size
          )
        ) {
          continue;
        }
        [-6.2, 6.2].forEach((side) => {
          const post = new THREE.Mesh(fencePostGeo, fenceWoodMat);
          post.position.set(px + nx * side, 0.78, pz + nz * side);
          post.castShadow = true;
          worldGroup.add(post);
        });
      }
      // Horizontal rails along each fenced highway
      [-6.2, 6.2].forEach((side) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, len * 0.55), fenceWoodMat);
        rail.position.set((x1 + x2) / 2 + nx * side, 1.15, (z1 + z2) / 2 + nz * side);
        rail.rotation.y = angle;
        worldGroup.add(rail);
      });
    }
  });

  // 3. BUILD 3 RICH MULTI-DISTRICT CITIES (Cobblestone, King Palace, Upper/Middle/Poor Districts, Open-Door Shops, Citizens & Animals)
  const cobbleTex = getCobblestoneTexture();
  cobbleTex.repeat.set(24, 24);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x67625d, roughness: 0.85 });
  const royalWallMat = new THREE.MeshStandardMaterial({ color: 0xe7dec8, roughness: 0.72 });
  const midWallMat = new THREE.MeshStandardMaterial({ color: 0xb9aa92, roughness: 0.84 });
  const poorWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.94 });
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x68533b, roughness: 0.96 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xe0a943, metalness: 0.88, roughness: 0.25 });

  const makeRoofMat = (hex: number) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.76 });
    snowableRoofMats.push(m);
    roofBaseColors.push(new THREE.Color(hex));
    return m;
  };
  const royalRoofMat = makeRoofMat(0x1e3a8a);
  const warmRoofMat = makeRoofMat(0x7c2d12);
  const slateRoofMat = makeRoofMat(0x475569);
  const slumRoofMat = makeRoofMat(0x4b3b2c);

  const cityCitizens: Array<{
    mesh: THREE.Group;
    centerX: number;
    centerZ: number;
    radius: number;
    angle: number;
    speed: number;
  }> = [];

  const cityAnimals: Array<{
    mesh: THREE.Group;
    centerX: number;
    centerZ: number;
    radius: number;
    angle: number;
    speed: number;
  }> = [];

  const lanternLights: THREE.PointLight[] = [];

  WORLD_REGIONS.filter((r) => r.biome === 'city').forEach((city, cIdx) => {
    const cx = city.x;
    const cz = city.z;
    const half = city.size; // 220 -> 440x440

    // Cobblestone Floor across ENTIRE city
    const cityFloorMat = new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.82 });
    const cityFloor = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), cityFloorMat);
    cityFloor.rotation.x = -Math.PI / 2;
    cityFloor.position.set(cx, 0.03, cz);
    cityFloor.receiveShadow = true;
    worldGroup.add(cityFloor);

    // Central Mana Fountain
    const fBase = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.2, 0.8, 20), stoneMat);
    fBase.position.set(cx, 0.4, cz);
    fBase.castShadow = true;
    fBase.receiveShadow = true;
    worldGroup.add(fBase);
    circleColliders.push({ x: cx, z: cz, radius: 4.8 });

    const fWater = new THREE.Mesh(
      new THREE.CylinderGeometry(4.0, 4.0, 0.15, 20),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.5 })
    );
    fWater.position.set(cx, 0.82, cz);
    worldGroup.add(fWater);

    // Perimeter City Walls with 44-unit wide cardinal gates
    const wallThick = 8;
    const wallHeight = 14;
    const segLen = half - 22;
    const addWall = (wx: number, wz: number, w: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), stoneMat);
      m.position.set(wx, wallHeight / 2, wz);
      m.castShadow = true;
      m.receiveShadow = true;
      worldGroup.add(m);
      boxColliders.push({
        minX: wx - w / 2 - 0.8,
        maxX: wx + w / 2 + 0.8,
        minZ: wz - d / 2 - 0.8,
        maxZ: wz + d / 2 + 0.8,
      });
    };
    [-1, 1].forEach((side) => {
      addWall(cx + side * (22 + segLen / 2), cz - half, segLen, wallThick);
      addWall(cx + side * (22 + segLen / 2), cz + half, segLen, wallThick);
      addWall(cx - half, cz + side * (22 + segLen / 2), wallThick, segLen);
      addWall(cx + half, cz + side * (22 + segLen / 2), wallThick, segLen);
    });

    // === 1) GRAND KING'S PALACE (UPPER ROYAL DISTRICT, North part of city: cz - 118) ===
    const px = cx;
    const pz = cz - 118;
    const palaceKeep = new THREE.Mesh(new THREE.BoxGeometry(48, 26, 36), royalWallMat);
    palaceKeep.position.set(px, 13, pz);
    palaceKeep.castShadow = true;
    palaceKeep.receiveShadow = true;
    worldGroup.add(palaceKeep);
    boxColliders.push({ minX: px - 24.8, maxX: px + 24.8, minZ: pz - 18.8, maxZ: pz + 18.8 });

    const centralSpire = new THREE.Mesh(new THREE.CylinderGeometry(10, 12, 18, 12), royalWallMat);
    centralSpire.position.set(px, 34, pz);
    centralSpire.castShadow = true;
    worldGroup.add(centralSpire);

    const centralDome = new THREE.Mesh(new THREE.ConeGeometry(12, 18, 12), goldTrimMat);
    centralDome.position.set(px, 50, pz);
    centralDome.castShadow = true;
    worldGroup.add(centralDome);

    [-22, 22].forEach((tx) => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 34, 10), royalWallMat);
      tower.position.set(px + tx, 17, pz + 12);
      tower.castShadow = true;
      worldGroup.add(tower);

      const spire = new THREE.Mesh(new THREE.ConeGeometry(6.5, 11, 10), royalRoofMat);
      spire.position.set(px + tx, 39, pz + 12);
      worldGroup.add(spire);
    });

    // Royal Red Carpet Walkway leading from Palace Gate
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 34),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(px, 0.045, pz + 35);
    worldGroup.add(carpet);

    // Luxury Villas in Upper District (Left & Right of Palace)
    [
      [-95, -95],
      [95, -95],
      [-130, -45],
      [130, -45],
    ].forEach(([ox, oz]) => {
      const vx = cx + ox;
      const vz = cz + oz;
      const villa = new THREE.Mesh(new THREE.BoxGeometry(20, 14, 16), royalWallMat);
      villa.position.set(vx, 7, vz);
      villa.castShadow = true;
      villa.receiveShadow = true;
      worldGroup.add(villa);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(15, 7, 4), royalRoofMat);
      roof.position.set(vx, 17.5, vz);
      roof.rotation.y = Math.PI * 0.25;
      roof.castShadow = true;
      worldGroup.add(roof);

      boxColliders.push({ minX: vx - 10.6, maxX: vx + 10.6, minZ: vz - 8.6, maxZ: vz + 8.6 });
    });

    // === 2) MIDDLE CLASS DISTRICT (Mid East & West) ===
    [
      [-95, 15],
      [95, 15],
      [-140, 35],
      [140, 35],
    ].forEach(([ox, oz], idx) => {
      const mx = cx + ox;
      const mz = cz + oz;
      const house = new THREE.Mesh(new THREE.BoxGeometry(15, 9.5, 13), midWallMat);
      house.position.set(mx, 4.75, mz);
      house.castShadow = true;
      house.receiveShadow = true;
      worldGroup.add(house);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(11.5, 5.5, 4),
        idx % 2 === 0 ? warmRoofMat : slateRoofMat
      );
      roof.position.set(mx, 12.2, mz);
      roof.rotation.y = Math.PI * 0.25;
      roof.castShadow = true;
      worldGroup.add(roof);

      boxColliders.push({ minX: mx - 8, maxX: mx + 8, minZ: mz - 7, maxZ: mz + 7 });
    });

    // === 3) POOR / SLUM DISTRICT (South edges: Dust, Wooden/Stone Shacks & Broken Ruins!) ===
    const dustPatch = new THREE.Mesh(new THREE.CircleGeometry(80, 20), dirtMat);
    dustPatch.rotation.x = -Math.PI / 2;
    dustPatch.position.set(cx + 85, 0.036, cz + 125);
    dustPatch.receiveShadow = true;
    worldGroup.add(dustPatch);

    [
      [60, 115, false],
      [95, 135, true],
      [130, 110, false],
      [-75, 125, true],
      [-115, 120, false],
    ].forEach(([ox, oz, isBroken]) => {
      const sx = cx + Number(ox);
      const sz = cz + Number(oz);
      if (isBroken) {
        // Broken / collapsed wooden & stone shack walls + rubble
        const wall1 = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 1.2), poorWoodMat);
        wall1.position.set(sx, 1.8, sz - 3);
        wall1.rotation.z = 0.08;
        wall1.castShadow = true;
        worldGroup.add(wall1);

        const wall2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 7), stoneMat);
        wall2.position.set(sx - 3.5, 1.4, sz);
        wall2.castShadow = true;
        worldGroup.add(wall2);

        const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), stoneMat);
        rubble.position.set(sx + 1.5, 0.7, sz + 1.2);
        worldGroup.add(rubble);
        boxColliders.push({ minX: sx - 4.5, maxX: sx + 4.5, minZ: sz - 4, maxZ: sz + 4 });
      } else {
        const shack = new THREE.Mesh(new THREE.BoxGeometry(9.5, 5.2, 8.5), poorWoodMat);
        shack.position.set(sx, 2.6, sz);
        shack.castShadow = true;
        shack.receiveShadow = true;
        worldGroup.add(shack);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.2, 4), slumRoofMat);
        roof.position.set(sx, 6.8, sz);
        roof.rotation.y = Math.PI * 0.25;
        roof.castShadow = true;
        worldGroup.add(roof);
        boxColliders.push({ minX: sx - 5.2, maxX: sx + 5.2, minZ: sz - 4.8, maxZ: sz + 4.8 });
      }
    });

    // Scattered Decorative City Trees, Flower Beds & Rocks inside each city
    for (let d = 0; d < 18; d++) {
      const ang = (d / 18) * Math.PI * 2 + cIdx;
      const rad = 28 + (d % 4) * 32;
      const dx = cx + Math.cos(ang) * rad;
      const dz = cz + Math.sin(ang) * rad;

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.34, 2.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x4b3321 })
      );
      trunk.position.set(dx, 1.1, dz);
      trunk.castShadow = true;
      worldGroup.add(trunk);

      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(1.35, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x2b6b33, roughness: 0.85 })
      );
      canopy.position.set(dx, 2.7, dz);
      canopy.castShadow = true;
      worldGroup.add(canopy);

      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 6, 6),
        new THREE.MeshBasicMaterial({ color: d % 2 === 0 ? 0xf43f5e : 0xfbbf24 })
      );
      flower.position.set(dx + 1.2, 0.25, dz + 0.8);
      worldGroup.add(flower);
    }

    // Living City Citizens (Men, Women, Elders, Children)
    const archetypes: Array<'man' | 'woman' | 'elder' | 'child'> = ['man', 'woman', 'elder', 'child'];
    const outfitColors = [0x334155, 0x7c2d12, 0x1e3a8a, 0x166534, 0x78350f, 0x581c87];
    for (let i = 0; i < 16; i++) {
      const rig = createTownCitizenRig(archetypes[i % 4], outfitColors[i % outfitColors.length]);
      const a = (i / 16) * Math.PI * 2;
      const rad = 16 + (i % 5) * 14;
      rig.position.set(cx + Math.cos(a) * rad, 0, cz + Math.sin(a) * rad);
      worldGroup.add(rig);
      cityCitizens.push({
        mesh: rig,
        centerX: cx + (i % 3 === 0 ? 0 : i % 2 === 0 ? -40 : 45),
        centerZ: cz + (i > 11 ? 105 : i < 4 ? -60 : 12),
        radius: 12 + (i % 4) * 6,
        angle: a,
        speed: 0.25 + (i % 3) * 0.12,
      });
    }

    // Town Animals (Dogs, Cats, Mice)
    const animalKinds: Array<'dog' | 'cat' | 'mouse'> = ['dog', 'cat', 'mouse'];
    for (let i = 0; i < 9; i++) {
      const rig = createTownAnimalRig(animalKinds[i % 3]);
      const a = (i / 9) * Math.PI * 2;
      rig.position.set(cx + Math.cos(a) * 20, 0, cz + Math.sin(a) * 20);
      worldGroup.add(rig);
      cityAnimals.push({
        mesh: rig,
        centerX: cx + ((i % 3) - 1) * 35,
        centerZ: cz + (i > 5 ? 95 : 15),
        radius: 10 + (i % 3) * 5,
        angle: a,
        speed: 0.45 + (i % 3) * 0.2,
      });
    }
  });

  // 4. OPEN-DOOR WALK-IN SHOPS & QUEST HALLS FOR TOWN NPCs!
  const npcInteractMeshes: THREE.Mesh[] = [];
  TOWN_NPCS.forEach((npc) => {
    worldGroup.add(createNpcRig(npc));

    // Build open-door walk-in shop/hall oriented toward npc.rotationY
    const shopGroup = new THREE.Group();
    shopGroup.position.set(npc.x, 0, npc.z);
    shopGroup.rotation.y = npc.rotationY;

    const shopWallMat = new THREE.MeshStandardMaterial({ color: 0x8b6f4e, roughness: 0.85 });
    const shopFloorMat = new THREE.MeshStandardMaterial({ color: 0x452f1d, roughness: 0.9 });
    const shopRoofMat = makeRoofMat(npc.role === 'alchemist' ? 0x4c1d95 : npc.role === 'quest' ? 0x1e3a8a : 0x7c2d12);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 12), shopFloorMat);
    floor.position.y = 0.08;
    floor.receiveShadow = true;
    shopGroup.add(floor);

    // Back wall (-Z local) & Side walls (-X, +X local) -> Front (+Z local) is WIDE OPEN DOOR!
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 6.2, 0.8), shopWallMat);
    backWall.position.set(0, 3.1, -5.6);
    backWall.castShadow = true;
    shopGroup.add(backWall);

    [-5.6, 5.6].forEach((sx) => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.2, 12), shopWallMat);
      sideWall.position.set(sx, 3.1, 0);
      sideWall.castShadow = true;
      shopGroup.add(sideWall);
    });

    // Front Door Frame Posts leaving wide 6.8m walk-in entrance
    [-4.2, 4.2].forEach((fx) => {
      const frontSeg = new THREE.Mesh(new THREE.BoxGeometry(3.4, 6.2, 0.8), shopWallMat);
      frontSeg.position.set(fx, 3.1, 5.6);
      frontSeg.castShadow = true;
      shopGroup.add(frontSeg);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(12, 1.4, 0.9), shopWallMat);
    lintel.position.set(0, 5.5, 5.6);
    shopGroup.add(lintel);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(9.6, 4.2, 4), shopRoofMat);
    roof.position.set(0, 8.3, 0);
    roof.rotation.y = Math.PI * 0.25;
    roof.castShadow = true;
    shopGroup.add(roof);

    // Shop interior prop: Wooden Counter / Anvil / Potion Table beside NPC
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x3b2214, roughness: 0.8 })
    );
    counter.position.set(0, 0.65, 2.0);
    shopGroup.add(counter);

    // Warm interior lantern (lights up especially at night!)
    const lantern = new THREE.PointLight(0xffb74d, 0, 18);
    lantern.position.set(0, 4.4, 1.0);
    shopGroup.add(lantern);
    lanternLights.push(lantern);

    worldGroup.add(shopGroup);

    // Click proxy
    const proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 2.8, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    proxy.position.set(npc.x, 1.4, npc.z);
    proxy.userData = { npc };
    worldGroup.add(proxy);
    npcInteractMeshes.push(proxy);
  });

  // 5. FLOWING MOUNTAIN RIVERS THROUGH BOTH FORESTS
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.45,
    roughness: 0.12,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
  });
  const rivers: Array<[number, number, number, number]> = [
    [-660, -620, -580, -120], // Frostfang Peaks -> Elderwood Wilds
    [840, 220, 560, 40], // Granite Ridge -> Whispering Woods
  ];
  rivers.forEach(([rx1, rz1, rx2, rz2]) => {
    const rLen = Math.hypot(rx2 - rx1, rz2 - rz1) + 90;
    const river = new THREE.Mesh(new THREE.PlaneGeometry(14, rLen), riverMat);
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = -Math.atan2(rx2 - rx1, rz2 - rz1);
    river.position.set((rx1 + rx2) / 2, 0.05, (rz1 + rz2) / 2);
    worldGroup.add(river);
  });

  // 6. LUSH FORESTS (Broadleaf + Pine Trees, Pebbles, Hay/Grass Tufts, Colorful Wildflowers)
  const pineCoords: Array<[number, number, number]> = [];
  const seeded = (n: number) => {
    const x = Math.sin(n * 91.7 + 17.3) * 43758.5453;
    return x - Math.floor(x);
  };
  WORLD_REGIONS.filter((r) => r.biome === 'forest').forEach((forest, fIdx) => {
    for (let i = 0; i < 190; i++) {
      const ang = seeded(i * 3 + fIdx * 500) * Math.PI * 2;
      const rad = 16 + seeded(i * 5 + fIdx * 500) * (forest.size - 16);
      const tx = forest.x + Math.cos(ang) * rad;
      const tz = forest.z + Math.sin(ang) * rad;
      pineCoords.push([tx, tz, 0.85 + seeded(i * 7) * 0.95]);
      circleColliders.push({ x: tx, z: tz, radius: 0.65 });
    }

    // Rocks, Pebbles, Hay/Grass Tufts & Colorful Flowers
    const flowerColors = [0xf43f5e, 0xfacc15, 0xa855f7, 0x38bdf8];
    const rockStoneMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.92, flatShading: true });
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xa1883c, roughness: 0.9 });
    for (let i = 0; i < 95; i++) {
      const ang = seeded(i * 19 + fIdx * 700) * Math.PI * 2;
      const rad = 14 + seeded(i * 23 + fIdx * 700) * (forest.size - 20);
      const gx = forest.x + Math.cos(ang) * rad;
      const gz = forest.z + Math.sin(ang) * rad;
      if (i % 4 === 0) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + (i % 3) * 0.35, 0), rockStoneMat);
        rock.position.set(gx, 0.35, gz);
        rock.castShadow = true;
        worldGroup.add(rock);
      } else if (i % 4 === 1) {
        const hay = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.7, 5), hayMat);
        hay.position.set(gx, 0.35, gz);
        worldGroup.add(hay);
      } else {
        const fl = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 6, 6),
          new THREE.MeshBasicMaterial({ color: flowerColors[i % flowerColors.length] })
        );
        fl.position.set(gx, 0.22, gz);
        worldGroup.add(fl);
      }
    }
  });

  const trunkInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.32, 0.52, 3.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x4b3321, roughness: 0.9 }),
    pineCoords.length
  );
  const foliageInst = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.6, 6.2, 7),
    new THREE.MeshStandardMaterial({ color: 0x245229, roughness: 0.85 }),
    pineCoords.length
  );
  trunkInst.castShadow = true;
  foliageInst.castShadow = true;
  const dummy = new THREE.Object3D();
  const cCol = new THREE.Color();
  pineCoords.forEach(([tx, tz, sc], i) => {
    dummy.position.set(tx, 1.8 * sc, tz);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);
    dummy.position.set(tx, 5.2 * sc, tz);
    dummy.updateMatrix();
    foliageInst.setMatrixAt(i, dummy.matrix);
    cCol.setHSL(i > 190 ? 0.74 : 0.3 + (i % 4) * 0.02, 0.45, 0.2 + (i % 5) * 0.03);
    foliageInst.setColorAt(i, cCol);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  foliageInst.instanceMatrix.needsUpdate = true;
  if (foliageInst.instanceColor) foliageInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  foliageInst.computeBoundingSphere();
  worldGroup.add(trunkInst);
  worldGroup.add(foliageInst);

  // 7. GOLDEN HEALING FLOWERS (20-MINUTE = 1200s RESPAWN TIMER!)
  const forestRegions = WORLD_REGIONS.filter((r) => r.biome === 'forest');
  const activeFlowers: Array<{ data: GoldenFlower; mesh: THREE.Group }> = [];
  const spawnRandomGoldenFlower = () => {
    const reg = forestRegions[Math.floor(Math.random() * forestRegions.length)];
    const a = Math.random() * Math.PI * 2;
    const d = 25 + Math.random() * (reg.size - 45);
    const fx = Math.round(reg.x + Math.cos(a) * d);
    const fz = Math.round(reg.z + Math.sin(a) * d);
    const data: GoldenFlower = {
      id: `flower-${Date.now()}-${Math.random()}`,
      x: fx,
      z: fz,
      life: 1200, // 20 minutes!
    };
    const mesh = createGoldenFlowerMesh();
    mesh.position.set(fx, 0, fz);
    scene.add(mesh);
    activeFlowers.push({ data, mesh });
  };
  for (let i = 0; i < 8; i++) spawnRandomGoldenFlower();

  // 8. MOUNTAINS (Impassable Colliders)
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.94, flatShading: true });
  const peakSnowMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72, flatShading: true });
  WORLD_REGIONS.filter((r) => r.biome === 'mountain').forEach((mReg, mIdx) => {
    const rockyFloor = new THREE.Mesh(
      new THREE.CircleGeometry(mReg.size, 32),
      new THREE.MeshStandardMaterial({ color: 0x3b3f47, roughness: 0.95 })
    );
    rockyFloor.rotation.x = -Math.PI / 2;
    rockyFloor.position.set(mReg.x, 0.03, mReg.z);
    rockyFloor.receiveShadow = true;
    worldGroup.add(rockyFloor);

    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + mIdx * 0.4;
      const dist = 50 + seeded(i * 11 + mIdx * 200) * (mReg.size - 70);
      const px = mReg.x + Math.cos(ang) * dist;
      const pz = mReg.z + Math.sin(ang) * dist;
      const rad = 16 + seeded(i * 13) * 14;
      const ht = 26 + seeded(i * 17) * 28;

      const peak = new THREE.Mesh(new THREE.ConeGeometry(rad, ht, 7), rockMat);
      peak.position.set(px, ht * 0.48, pz);
      peak.castShadow = true;
      peak.receiveShadow = true;
      worldGroup.add(peak);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.45, ht * 0.44, 7), peakSnowMat);
      cap.position.set(px, ht * 0.76, pz);
      worldGroup.add(cap);

      circleColliders.push({ x: px, z: pz, radius: rad * 0.85 });
    }
  });

  // 9. SNOWY TUNDRA REGION (-40, -760)
  const snowRegion = WORLD_REGIONS.find((r) => r.biome === 'snow')!;
  const snowGround = new THREE.Mesh(
    new THREE.CircleGeometry(snowRegion.size, 40),
    new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.78 })
  );
  snowGround.rotation.x = -Math.PI / 2;
  snowGround.position.set(snowRegion.x, 0.04, snowRegion.z);
  snowGround.receiveShadow = true;
  worldGroup.add(snowGround);

  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const ix = snowRegion.x + Math.cos(ang) * 145;
    const iz = snowRegion.z + Math.sin(ang) * 145;
    const iceSpire = new THREE.Mesh(
      new THREE.ConeGeometry(12, 26, 6),
      new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.3, metalness: 0.15 })
    );
    iceSpire.position.set(ix, 12, iz);
    iceSpire.castShadow = true;
    worldGroup.add(iceSpire);
    circleColliders.push({ x: ix, z: iz, radius: 10 });
  }

  // Dynamic Snowfall & Rain Particle Systems
  const snowCount = 380;
  const snowPos = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 52;
    snowPos[i * 3 + 1] = Math.random() * 26;
    snowPos[i * 3 + 2] = (Math.random() - 0.5) * 52;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowPoints = new THREE.Points(
    snowGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.36, transparent: true, opacity: 0.9 })
  );
  snowPoints.visible = false;
  scene.add(snowPoints);

  const rainCount = 420;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 48;
    rainPos[i * 3 + 1] = Math.random() * 26;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 48;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainPoints = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.2, transparent: true, opacity: 0.72 })
  );
  rainPoints.visible = false;
  scene.add(rainPoints);

  // 10. LAVA & VOLCANO REGION (740, -640)
  const lavaRegion = WORLD_REGIONS.find((r) => r.biome === 'lava')!;
  const obsidianGround = new THREE.Mesh(
    new THREE.CircleGeometry(lavaRegion.size, 40),
    new THREE.MeshStandardMaterial({ color: 0x1c1719, roughness: 0.92 })
  );
  obsidianGround.rotation.x = -Math.PI / 2;
  obsidianGround.position.set(lavaRegion.x, 0.04, lavaRegion.z);
  obsidianGround.receiveShadow = true;
  worldGroup.add(obsidianGround);

  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff4500,
    emissive: 0xea580c,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  [
    [680, -580, 24],
    [820, -620, 22],
    [690, -720, 24],
  ].forEach(([lx, lz, lr]) => {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(lr, 24), lavaMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(lx, 0.08, lz);
    worldGroup.add(pool);
  });

  const volcanoX = 870;
  const volcanoZ = -750;
  const volcanoMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 66, 74, 16),
    new THREE.MeshStandardMaterial({ color: 0x261a1a, roughness: 0.94, flatShading: true })
  );
  volcanoMesh.position.set(volcanoX, 36, volcanoZ);
  volcanoMesh.castShadow = true;
  worldGroup.add(volcanoMesh);
  circleColliders.push({ x: volcanoX, z: volcanoZ, radius: 58 });

  const volcanoCraterGlow = new THREE.Mesh(new THREE.CircleGeometry(17, 16), lavaMat);
  volcanoCraterGlow.rotation.x = -Math.PI / 2;
  volcanoCraterGlow.position.set(volcanoX, 73.2, volcanoZ);
  worldGroup.add(volcanoCraterGlow);

  // === HERO RIG ===
  const heroRig: HeroRig = createHeroRig(gender, classId);
  heroRig.applyEquipment(initialEquipped);
  heroRig.root.position.set(initialSpawn.x, 0, initialSpawn.z);
  scene.add(heroRig.root);

  const fallbackBlobShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.3),
    new THREE.MeshBasicMaterial({
      map: createRadialShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.4,
    })
  );
  fallbackBlobShadow.rotation.x = -Math.PI / 2;
  fallbackBlobShadow.position.y = 0.035;
  fallbackBlobShadow.visible = initialSettings.graphics === 'low';
  heroRig.root.add(fallbackBlobShadow);

  // === 100 MOBS + 10 BOSSES ===
  const enemyStates: EnemyState[] = generateWorldEnemies();
  const enemyRigs: EnemyMeshRig[] = enemyStates.map((e) => {
    const rig = createEnemyRig(e.kind, e.isBoss);
    rig.root.position.set(e.x, 0, e.z);
    rig.root.visible = false;
    scene.add(rig.root);
    return rig;
  });
  const enemyAttackTimers = enemyStates.map(() => 0);

  // === GROUND LOOT DROPS ===
  const lootDrops: Array<{ data: LootDrop; mesh: THREE.Group }> = [];
  const spawnGroundLoot = (drop: LootDrop) => {
    const mesh = createLootDropMesh(drop);
    scene.add(mesh);
    lootDrops.push({ data: drop, mesh });
  };

  // === PARTICLES & PROJECTILES ===
  const particles: BurstParticle[] = [];
  const projectiles: ActiveProjectile[] = [];
  const spawnBurst = (x: number, y: number, z: number, colorHex: number, count: number, speed = 5) => {
    const geo = new THREE.OctahedronGeometry(0.14, 0);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.4 + Math.random() * 0.8) * speed;
      particles.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: 1.8 + Math.random() * 3.8,
        vz: Math.sin(ang) * spd,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.3,
      });
    }
  };

  // === SIMULATION STATE ===
  let statsRef: HeroStats = { ...initialStats };
  let skillLevelsRef: Record<string, number> = {};
  let settingsRef: GameSettings = { ...initialSettings };
  let inputVec = { x: 0, y: 0 };
  const keysDown: Record<string, boolean> = {};
  let battleSpeed: 1 | 2 = 1;
  let paused = false;
  let isDead = false;
  let moveTarget: { x: number; z: number } | null = null;
  let currentRegionId = 'city_astarot';
  let nearestNpcId: string | null = null;
  let nearestFlowerId: string | null = null;

  // GTA Camera Orbit Angles!
  let camYaw = 0;
  let camPitch = 0.56;
  let cameraZoomScalar = 1.05;

  // Day/Night & Dynamic Weather
  let timeOfDay = 0.25; // Start bright morning
  let weatherState: WeatherType = 'clear';
  let weatherTimer = 38;
  let snowAccumulation = 0;

  // Jump Physics
  let heroY = 0;
  let heroVy = 0;
  let isGrounded = true;
  let isChargingJump = false;
  let jumpChargeTime = 0;

  let currentAction: HeroAnimAction = 'idle';
  let actionTimer = 0;
  let actionDuration = 0;
  let comboStep = 0;
  let invulnTimer = 0;
  let fountainHealTick = 0;

  const skillCooldowns = [0, 0, 0, 0, 0, 0];
  let dodgeCooldown = 0;

  const _projVec = new THREE.Vector3();
  const _camTarget = new THREE.Vector3();
  const _camDesired = new THREE.Vector3();

  const applySettings = (next: GameSettings) => {
    settingsRef = { ...next };
    const pr =
      next.graphics === 'high'
        ? Math.min(window.devicePixelRatio, 2)
        : next.graphics === 'medium'
        ? Math.min(window.devicePixelRatio, 1.35)
        : 0.85;
    renderer.setPixelRatio(isSoftwareGl ? 1 : pr);

    const shadowsOn = !isSoftwareGl && next.graphics !== 'low';
    renderer.shadowMap.enabled = shadowsOn;
    sunLight.castShadow = shadowsOn;
    fallbackBlobShadow.visible = !shadowsOn;
    if (shadowsOn) {
      const sz = next.graphics === 'high' ? 2048 : 1024;
      if (sunLight.shadow.mapSize.width !== sz) {
        sunLight.shadow.mapSize.set(sz, sz);
        sunLight.shadow.map?.dispose();
        sunLight.shadow.map = null;
      }
    }
  };
  applySettings(initialSettings);

  const projectToScreen = (wx: number, wy: number, wz: number) => {
    _projVec.set(wx, wy, wz).project(camera);
    const visible = _projVec.z < 1 && _projVec.z > -1;
    return {
      x: ((_projVec.x + 1) / 2) * renderer.domElement.clientWidth,
      y: ((-_projVec.y + 1) / 2) * renderer.domElement.clientHeight,
      visible,
    };
  };

  const resolveCollisions = (x: number, z: number): { x: number; z: number } => {
    let rx = THREE.MathUtils.clamp(x, -1160, 1160);
    let rz = THREE.MathUtils.clamp(z, -1160, 1160);
    const heroR = 0.85;

    for (let i = 0; i < circleColliders.length; i++) {
      const c = circleColliders[i];
      const dx = rx - c.x;
      const dz = rz - c.z;
      const minD = c.radius + heroR;
      const dSq = dx * dx + dz * dz;
      if (dSq < minD * minD && dSq > 0.0001) {
        const d = Math.sqrt(dSq);
        rx = c.x + (dx / d) * minD;
        rz = c.z + (dz / d) * minD;
      }
    }

    for (let i = 0; i < boxColliders.length; i++) {
      const b = boxColliders[i];
      if (rx > b.minX && rx < b.maxX && rz > b.minZ && rz < b.maxZ) {
        const dLeft = Math.abs(rx - b.minX);
        const dRight = Math.abs(b.maxX - rx);
        const dTop = Math.abs(rz - b.minZ);
        const dBot = Math.abs(b.maxZ - rz);
        const minPen = Math.min(dLeft, dRight, dTop, dBot);
        if (minPen === dLeft) rx = b.minX;
        else if (minPen === dRight) rx = b.maxX;
        else if (minPen === dTop) rz = b.minZ;
        else rz = b.maxZ;
      }
    }
    return { x: rx, z: rz };
  };

  const applyDamageToEnemy = (idx: number, dmg: number, isCrit: boolean, kx: number, kz: number) => {
    const enemy = enemyStates[idx];
    if (!enemy.alive) return;
    enemy.hp = Math.max(0, enemy.hp - dmg);
    enemy.state = 'stagger';
    if (!enemy.isBoss) {
      enemy.x += kx * 0.75;
      enemy.z += kz * 0.75;
    }

    if (enemy.hasPhases && enemy.phase === 1 && enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.5) {
      enemy.phase = 2;
      enemy.atk = Math.round(enemy.atk * 1.3);
      enemy.speed *= 1.18;
      spawnBurst(enemy.x, 2.0, enemy.z, 0xa855f7, 26, 9);
      const sc = projectToScreen(enemy.x, 4.0, enemy.z);
      if (sc.visible) callbacks.onFloatingText({ x: sc.x, y: sc.y, text: 'PHASE 2!', kind: 'crit' });
    }

    const screen = projectToScreen(enemy.x, enemy.isBoss ? 3.5 : 1.9, enemy.z);
    if (screen.visible) {
      callbacks.onFloatingText({
        x: screen.x,
        y: screen.y,
        text: isCrit ? `${dmg}!` : `${dmg}`,
        kind: isCrit ? 'crit' : 'damage',
      });
    }
    spawnBurst(enemy.x, 1.1, enemy.z, isCrit ? 0xfbbf24 : 0xff5a1f, isCrit ? 9 : 5);
    soundEngine.playHit();

    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.respawnTimer = enemy.isBoss ? 35 : 16;
      enemyRigs[idx].root.visible = false;
      spawnBurst(enemy.x, 1.4, enemy.z, 0xf59e0b, 16, 7);

      spawnGroundLoot({
        id: `loot-g-${Date.now()}-${Math.random()}`,
        x: enemy.x - 0.8 + Math.random() * 1.6,
        z: enemy.z - 0.8 + Math.random() * 1.6,
        kind: 'gold',
        goldAmount: enemy.goldReward,
        life: 60,
      });
      spawnGroundLoot({
        id: `loot-x-${Date.now()}-${Math.random()}`,
        x: enemy.x - 0.8 + Math.random() * 1.6,
        z: enemy.z - 0.8 + Math.random() * 1.6,
        kind: 'xp',
        xpAmount: enemy.xpReward,
        life: 60,
      });
      if (Math.random() <= enemy.dropChance && enemy.dropPool.length > 0) {
        const droppedId = enemy.dropPool[Math.floor(Math.random() * enemy.dropPool.length)];
        const itemDef = ITEMS[droppedId];
        spawnGroundLoot({
          id: `loot-i-${Date.now()}-${Math.random()}`,
          x: enemy.x + (Math.random() - 0.5) * 2.0,
          z: enemy.z + (Math.random() - 0.5) * 2.0,
          kind: 'item',
          itemId: droppedId,
          rarity: itemDef?.rarity || 'common',
          life: 90,
        });
      }

      callbacks.onEnemyKilled({ ...enemy });
    }
  };

  const triggerSkill = (slotIndex: number) => {
    if (paused || isDead) return;
    const skill: ClassSkillDef | undefined = classDef.skills[slotIndex];
    if (!skill) return;
    if (statsRef.level < skill.unlockLevel) {
      const s = projectToScreen(heroRig.root.position.x, 2.5, heroRig.root.position.z);
      callbacks.onFloatingText({ x: s.x, y: s.y, text: `Unlock Lv.${skill.unlockLevel}`, kind: 'enemyHit' });
      return;
    }
    if (skillCooldowns[slotIndex] > 0) return;

    if (statsRef.mp < skill.mpCost) {
      const s = projectToScreen(heroRig.root.position.x, 2.5, heroRig.root.position.z);
      callbacks.onFloatingText({ x: s.x, y: s.y, text: 'Low MP', kind: 'enemyHit' });
      return;
    }
    if (skill.mpCost > 0) {
      callbacks.onStatsChange((prev) => ({ ...prev, mp: Math.max(0, prev.mp - skill.mpCost) }));
    }
    skillCooldowns[slotIndex] = skill.cooldown;

    let bestIdx = -1;
    let bestDist = skill.range + 4;
    const px = heroRig.root.position.x;
    const pz = heroRig.root.position.z;
    for (let i = 0; i < enemyStates.length; i++) {
      const e = enemyStates[i];
      if (!e.alive) continue;
      const d = Math.hypot(e.x - px, e.z - pz);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1) {
      heroRig.root.rotation.y = Math.atan2(enemyStates[bestIdx].x - px, enemyStates[bestIdx].z - pz);
    }

    const fwdX = Math.sin(heroRig.root.rotation.y);
    const fwdZ = Math.cos(heroRig.root.rotation.y);
    const colorHex = new THREE.Color(skill.color).getHex();

    if (skill.effectKind === 'projectile') {
      currentAction = 'skill_shoot';
      actionDuration = 0.34;
      actionTimer = 0;
      soundEngine.playSlash(false);

      const projMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.24, 0),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      projMesh.position.set(px + fwdX * 0.8, 1.15, pz + fwdZ * 0.8);
      scene.add(projMesh);

      const rank = skillLevelsRef[skill.id] || 1;
      const effectiveMult = skill.damageMultiplier + (rank - 1) * 0.25;
      const isCrit = Math.random() < 0.22;
      const dmg = Math.round(statsRef.atk * effectiveMult * (isCrit ? 1.5 : 1));
      projectiles.push({
        mesh: projMesh,
        x: projMesh.position.x,
        z: projMesh.position.z,
        vx: fwdX * 26,
        vz: fwdZ * 26,
        damage: dmg,
        isCrit,
        life: 0.75,
      });
      return;
    }

    if (skill.effectKind === 'buff_heal') {
      currentAction = 'skill_nova';
      actionDuration = 0.5;
      actionTimer = 0;
      soundEngine.playPotion();
      const healAmt = Math.round(statsRef.maxHp * 0.22);
      callbacks.onStatsChange((prev) => ({
        ...prev,
        hp: Math.min(prev.maxHp, prev.hp + healAmt),
      }));
      const sc = projectToScreen(px, 2.4, pz);
      if (sc.visible) callbacks.onFloatingText({ x: sc.x, y: sc.y, text: `+${healAmt} HP`, kind: 'heal' });
      spawnBurst(px, 1.2, pz, colorHex, 16, 6);
    } else if (skill.effectKind === 'nova' || skill.effectKind === 'whirlwind') {
      currentAction = 'skill_nova';
      actionDuration = 0.52;
      actionTimer = 0;
      soundEngine.playArcaneNova();
      spawnBurst(px, 1.1, pz, colorHex, 20, 8);
    } else if (skill.effectKind === 'slam') {
      currentAction = 'skill_heavy';
      actionDuration = 0.5;
      actionTimer = 0;
      soundEngine.playFireCleave();
      spawnBurst(px + fwdX * 1.5, 1.0, pz + fwdZ * 1.5, colorHex, 18, 7);
    } else {
      comboStep = (comboStep + 1) % 2;
      currentAction = comboStep === 0 ? 'attack1' : 'attack2';
      actionDuration = 0.34;
      actionTimer = 0;
      soundEngine.playSlash(false);
    }

    // Only hits Enemy Mobs & Bosses (Town citizens & animals are completely safe!)
    for (let i = 0; i < enemyStates.length; i++) {
      const e = enemyStates[i];
      if (!e.alive) continue;
      const dx = e.x - px;
      const dz = e.z - pz;
      const dist = Math.hypot(dx, dz);
      const radius = skill.slotIndex === 0 ? skill.range : skill.aoeRadius;
      if (dist <= radius) {
        const rank = skillLevelsRef[skill.id] || 1;
        const effectiveMult = skill.damageMultiplier + (rank - 1) * 0.25;
        const isCrit = Math.random() < 0.22;
        const raw = statsRef.atk * effectiveMult * (isCrit ? 1.5 : 0.95 + Math.random() * 0.15);
        const finalDmg = Math.max(8, Math.round(raw - e.def * 0.3));
        const nx = dist > 0.01 ? dx / dist : fwdX;
        const nz = dist > 0.01 ? dz / dist : fwdZ;
        applyDamageToEnemy(i, finalDmg, isCrit, nx, nz);
      }
    }
  };

  const triggerDodge = () => {
    if (paused || isDead || dodgeCooldown > 0) return;
    dodgeCooldown = 2.4; // Increased dodge cooldown as requested
    currentAction = 'dodge';
    actionDuration = 0.28;
    actionTimer = 0;
    invulnTimer = 0.45;
    const nx = heroRig.root.position.x + Math.sin(heroRig.root.rotation.y) * 4.5;
    const nz = heroRig.root.position.z + Math.cos(heroRig.root.rotation.y) * 4.5;
    const resolved = resolveCollisions(nx, nz);
    heroRig.root.position.x = resolved.x;
    heroRig.root.position.z = resolved.z;
    spawnBurst(resolved.x, 0.8, resolved.z, 0x94a3b8, 8, 3);
    soundEngine.playSlash(false);
  };

  const startJumpCharge = () => {
    if (paused || isDead || !isGrounded) return;
    isChargingJump = true;
    jumpChargeTime = 0;
  };

  const releaseJump = () => {
    if (!isChargingJump) return;
    isChargingJump = false;
    if (!isGrounded || paused || isDead) return;
    const chargeRatio = Math.min(jumpChargeTime / 0.55, 1);
    heroVy = 8.5 + chargeRatio * 8.2;
    isGrounded = false;
    currentAction = 'jump';
    actionDuration = 0.4;
    actionTimer = 0;
  };

  const pickNearbyFlower = () => {
    if (!nearestFlowerId || paused || isDead) return;
    const idx = activeFlowers.findIndex((f) => f.data.id === nearestFlowerId);
    if (idx === -1) return;
    const picked = activeFlowers[idx];
    scene.remove(picked.mesh);
    activeFlowers.splice(idx, 1);
    nearestFlowerId = null;
    callbacks.onNearFlowerChange(null);
    callbacks.onPickFlower(picked.data);
    soundEngine.playPotion();
    // Spawn a fresh replacement flower somewhere in the forests
    spawnRandomGoldenFlower();
  };

  // Keyboard Listeners
  const onKeyDown = (e: KeyboardEvent) => {
    keysDown[e.code] = true;
    if (e.code === 'Space' && !e.repeat) startJumpCharge();
    if (e.code === 'Digit1') triggerSkill(0);
    if (e.code === 'Digit2') triggerSkill(1);
    if (e.code === 'Digit3') triggerSkill(2);
    if (e.code === 'Digit4') triggerSkill(3);
    if (e.code === 'Digit5') triggerSkill(4);
    if (e.code === 'Digit6') triggerSkill(5);
    if (e.code === 'ShiftLeft' || e.code === 'KeyQ') triggerDodge();
    if (e.code === 'KeyE') pickNearbyFlower();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keysDown[e.code] = false;
    if (e.code === 'Space') releaseJump();
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    cameraZoomScalar = THREE.MathUtils.clamp(cameraZoomScalar + e.deltaY * 0.0014, 0.55, 2.8);
  };
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

  // GTA-Style Free Camera Drag + Tap-to-Interact
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  const camDrag = {
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
  };

  const onPointerDown = (e: PointerEvent) => {
    if (paused || isDead) return;
    soundEngine.startBgm();
    if (!camDrag.active) {
      camDrag.active = true;
      camDrag.pointerId = e.pointerId;
      camDrag.startX = e.clientX;
      camDrag.startY = e.clientY;
      camDrag.lastX = e.clientX;
      camDrag.lastY = e.clientY;
      camDrag.moved = false;
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!camDrag.active || e.pointerId !== camDrag.pointerId) return;
    const dx = e.clientX - camDrag.lastX;
    const dy = e.clientY - camDrag.lastY;
    camDrag.lastX = e.clientX;
    camDrag.lastY = e.clientY;
    if (Math.hypot(e.clientX - camDrag.startX, e.clientY - camDrag.startY) > 6) {
      camDrag.moved = true;
    }
    // Look around 360° horizontally and up/down (ground <-> sky/sun/clouds)
    camYaw -= dx * 0.0065;
    camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.005, -0.14, 1.22);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!camDrag.active || e.pointerId !== camDrag.pointerId) return;
    const wasTap = !camDrag.moved;
    camDrag.active = false;
    camDrag.pointerId = -1;

    if (!wasTap || paused || isDead) return;

    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNdc, camera);
    const npcHits = raycaster.intersectObjects(npcInteractMeshes, false);
    if (npcHits.length > 0) {
      const npc = npcHits[0].object.userData.npc as NpcDef;
      if (npc) {
        const d = Math.hypot(npc.x - heroRig.root.position.x, npc.z - heroRig.root.position.z);
        if (d < 8.0) callbacks.onNpcClicked(npc);
        else moveTarget = { x: npc.x, z: npc.z + 2.5 };
        return;
      }
    }
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      moveTarget = { x: hitPoint.x, z: hitPoint.z };
    }
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  if (!isSoftwareGl) renderer.compile(scene, camera);

  // === GAME LOOP WITH FPS CAP SUPPORT ===
  const clock = new THREE.Clock();
  let frameId = 0;
  let disposed = false;
  let hudAccumulator = 0;
  let lastRenderTime = performance.now();

  const scheduleNext = (cb: () => void) => {
    if (isSoftwareGl) {
      frameId = window.setTimeout(cb, 60);
    } else {
      frameId = requestAnimationFrame(cb);
    }
  };

  const tick = () => {
    if (disposed) return;

    const now = performance.now();
    const minFrameMs = 1000 / settingsRef.fpsCap;
    if (!isSoftwareGl && now - lastRenderTime < minFrameMs * 0.92) {
      frameId = requestAnimationFrame(tick);
      return;
    }
    lastRenderTime = now;

    const rawDt = Math.min(clock.getDelta(), 0.05);
    const dt = paused ? 0 : rawDt * battleSpeed;
    const elapsed = clock.getElapsedTime();

    if (!paused) {
      for (let i = 0; i < skillCooldowns.length; i++) {
        if (skillCooldowns[i] > 0) skillCooldowns[i] = Math.max(0, skillCooldowns[i] - dt);
      }
      if (dodgeCooldown > 0) dodgeCooldown = Math.max(0, dodgeCooldown - dt);
      if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);
      if (isChargingJump) jumpChargeTime = Math.min(0.6, jumpChargeTime + rawDt);

      if (actionTimer < actionDuration && !isDead) {
        actionTimer += dt;
        if (actionTimer >= actionDuration) currentAction = isGrounded ? 'idle' : 'jump';
      }

      // Day / Night Cycle (150s full cycle)
      timeOfDay = (timeOfDay + dt / 150) % 1;
      const sunAngle = timeOfDay * Math.PI * 2;
      const sunElev = Math.sin(sunAngle); // >0 day, <0 night
      const dayFactor = THREE.MathUtils.clamp((sunElev + 0.15) / 0.55, 0, 1);

      const px = heroRig.root.position.x;
      const pz = heroRig.root.position.z;

      // Sky Colors & Sun/Moon Position
      skyGroup.position.set(px, 0, pz);
      sunDisc.position.set(Math.cos(sunAngle) * 180, Math.sin(sunAngle) * 160, -60);
      moonDisc.position.set(-Math.cos(sunAngle) * 180, -Math.sin(sunAngle) * 160, 60);
      sunDisc.visible = sunElev > -0.15;
      moonDisc.visible = sunElev < 0.15;
      starMat.opacity = Math.max(0, 1 - dayFactor * 1.6);

      // Drift Clouds across sky
      clouds.forEach((c, idx) => {
        c.position.x += dt * (2.2 + (idx % 3) * 0.6);
        if (c.position.x > 140) c.position.x = -140;
      });

      const dayCol = new THREE.Color(0x63a4de);
      const duskCol = new THREE.Color(0xc26a48);
      const nightCol = new THREE.Color(0x0a1020);
      if (sunElev > 0.2) skyColor.copy(dayCol);
      else if (sunElev > -0.15) {
        const tDusk = (sunElev + 0.15) / 0.35;
        skyColor.lerpColors(nightCol, duskCol, tDusk);
      } else {
        skyColor.copy(nightCol);
      }
      fog.color.copy(skyColor);

      sunLight.intensity = 0.45 + dayFactor * 1.85;
      sunLight.color.setHex(dayFactor > 0.35 ? 0xfff1d0 : 0x7aa2f7);
      hemi.intensity = 0.32 + dayFactor * 0.65;
      const lightAngle = sunElev >= 0 ? sunAngle : sunAngle + Math.PI;
      sunLight.position.set(
        px + Math.cos(lightAngle) * 55,
        Math.max(18, Math.abs(Math.sin(lightAngle)) * 68),
        pz + 28
      );
      sunLight.target.position.set(px, 0, pz);

      // Town shop lanterns illuminate at night!
      const lanternI = dayFactor < 0.4 ? 2.4 * (1 - dayFactor * 2) : 0;
      for (let i = 0; i < lanternLights.length; i++) lanternLights[i].intensity = lanternI;

      // Dynamic Weather (Clear / Rain / Snow)
      weatherTimer -= dt;
      if (weatherTimer <= 0) {
        weatherTimer = 35 + Math.random() * 25;
        const r = Math.random();
        weatherState = r < 0.55 ? 'clear' : r < 0.78 ? 'rain' : 'snow';
      }

      // Vertical Jump & Gravity
      if (!isGrounded) {
        heroVy -= 26 * dt;
        heroY += heroVy * dt;
        if (heroY <= 0) {
          heroY = 0;
          heroVy = 0;
          isGrounded = true;
          if (!isDead && currentAction === 'jump') currentAction = 'idle';
        }
        heroRig.root.position.y = heroY;
      }

      // City Mana Fountain & Passive MP Regen
      fountainHealTick += dt;
      if (fountainHealTick >= 1.0 && !isDead) {
        fountainHealTick = 0;
        const nearCityFountain = WORLD_REGIONS.some(
          (r) => r.biome === 'city' && Math.hypot(px - r.x, pz - r.z) < 12
        );
        if (nearCityFountain) {
          callbacks.onStatsChange((prev) => ({
            ...prev,
            hp: Math.min(prev.maxHp, prev.hp + 35),
            mp: Math.min(prev.maxMp, prev.mp + 20),
          }));
        } else if (statsRef.mp < statsRef.maxMp) {
          callbacks.onStatsChange((prev) => ({
            ...prev,
            mp: Math.min(prev.maxMp, prev.mp + 4),
          }));
        }
      }

      // Camera-Relative Multi-Touch Movement (simultaneous run + jump + attack!)
      let rawX = 0;
      let rawZ = 0;
      if (!isDead) {
        rawX = inputVec.x;
        rawZ = inputVec.y;
        if (keysDown['KeyW'] || keysDown['ArrowUp']) rawZ -= 1;
        if (keysDown['KeyS'] || keysDown['ArrowDown']) rawZ += 1;
        if (keysDown['KeyA'] || keysDown['ArrowLeft']) rawX -= 1;
        if (keysDown['KeyD'] || keysDown['ArrowRight']) rawX += 1;
      }

      let mx = 0;
      let mz = 0;
      const rawLen = Math.hypot(rawX, rawZ);
      if (rawLen > 0.05) {
        moveTarget = null;
        const cosY = Math.cos(camYaw);
        const sinY = Math.sin(camYaw);
        // Transform screen-joystick direction into world direction relative to camera Yaw!
        mx = rawX * cosY + rawZ * sinY;
        mz = -rawX * sinY + rawZ * cosY;
      } else if (moveTarget && !isDead) {
        const dx = moveTarget.x - px;
        const dz = moveTarget.z - pz;
        const d = Math.hypot(dx, dz);
        if (d > 0.5) {
          mx = dx / d;
          mz = dz / d;
        } else {
          moveTarget = null;
        }
      }

      const len = Math.hypot(mx, mz);
      let moveRatio = 0;
      // Allow moving smoothly even while jumping or weaving skills!
      if (len > 0.05 && !isDead && currentAction !== 'dodge') {
        const nx = mx / Math.max(len, 1);
        const nz = mz / Math.max(len, 1);
        moveRatio = Math.min(len, 1);
        const moveSpeed = 7.8 + statsRef.spd * 0.16;
        const resolved = resolveCollisions(px + nx * moveSpeed * dt, pz + nz * moveSpeed * dt);
        heroRig.root.position.x = resolved.x;
        heroRig.root.position.z = resolved.z;

        const targetAngle = Math.atan2(nx, nz);
        let diff = targetAngle - heroRig.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        heroRig.root.rotation.y += diff * Math.min(1, 14 * dt);
      }

      const actionProg = actionDuration > 0 ? Math.min(1, actionTimer / actionDuration) : 0;
      heroRig.updateAnimation(dt, elapsed, moveRatio, isDead ? 'dead' : currentAction, actionProg, heroVy);

      // Animate City Citizens & Town Animals gently strolling
      for (let i = 0; i < cityCitizens.length; i++) {
        const c = cityCitizens[i];
        c.angle += c.speed * dt;
        const nx = c.centerX + Math.cos(c.angle) * c.radius;
        const nz = c.centerZ + Math.sin(c.angle) * c.radius;
        c.mesh.rotation.y = Math.atan2(nx - c.mesh.position.x, nz - c.mesh.position.z);
        c.mesh.position.set(nx, Math.abs(Math.sin(elapsed * 5 + i)) * 0.04, nz);
      }
      for (let i = 0; i < cityAnimals.length; i++) {
        const a = cityAnimals[i];
        a.angle += a.speed * dt;
        const nx = a.centerX + Math.cos(a.angle) * a.radius;
        const nz = a.centerZ + Math.sin(a.angle) * a.radius;
        a.mesh.rotation.y = Math.atan2(nx - a.mesh.position.x, nz - a.mesh.position.z);
        a.mesh.position.set(nx, Math.abs(Math.sin(elapsed * 7 + i)) * 0.04, nz);
      }

      // Region Check
      let activeRegion = WORLD_REGIONS[0];
      let bestDist = 9999;
      for (const r of WORLD_REGIONS) {
        const d = Math.hypot(heroRig.root.position.x - r.x, heroRig.root.position.z - r.z);
        if (d < r.size + 30 && d < bestDist) {
          bestDist = d;
          activeRegion = r;
        }
      }
      if (activeRegion.id !== currentRegionId) {
        currentRegionId = activeRegion.id;
        callbacks.onZoneChange(activeRegion);
      }

      // Snowfall & Snow Accumulation on Ground + Roofs!
      const effectiveWeather: WeatherType = activeRegion.biome === 'snow' ? 'snow' : weatherState;
      const isSnowing = effectiveWeather === 'snow';
      const isRaining = effectiveWeather === 'rain';

      snowPoints.visible = isSnowing;
      rainPoints.visible = isRaining;
      if (isSnowing) {
        snowPoints.position.set(heroRig.root.position.x, 0, heroRig.root.position.z);
        const sAttr = snowGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < snowCount; i++) {
          let sy = sAttr.getY(i) - dt * 5.2;
          if (sy < 0) sy = 26;
          sAttr.setY(i, sy);
        }
        sAttr.needsUpdate = true;
        snowAccumulation = Math.min(1, snowAccumulation + dt * 0.16);
      } else {
        snowAccumulation = Math.max(0, snowAccumulation - dt * 0.08);
      }

      // Snow ground blanket & white snow-covered roofs!
      snowFollowBlanket.position.set(heroRig.root.position.x, 0.045, heroRig.root.position.z);
      snowFollowMat.opacity = snowAccumulation * 0.72;
      for (let i = 0; i < snowableRoofMats.length; i++) {
        snowableRoofMats[i].color.copy(roofBaseColors[i]).lerp(new THREE.Color(0xf1f5f9), snowAccumulation * 0.85);
      }

      if (isRaining) {
        rainPoints.position.set(heroRig.root.position.x, 0, heroRig.root.position.z);
        const rAttr = rainGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < rainCount; i++) {
          let ry = rAttr.getY(i) - dt * 22;
          if (ry < 0) ry = 26;
          rAttr.setY(i, ry);
        }
        rAttr.needsUpdate = true;
      }

      // Golden Flowers 20-Minute Timer & Proximity
      let foundFlower: GoldenFlower | null = null;
      for (let i = activeFlowers.length - 1; i >= 0; i--) {
        const f = activeFlowers[i];
        f.data.life -= dt;
        f.mesh.rotation.y += dt * 1.1;
        if (f.data.life <= 0) {
          scene.remove(f.mesh);
          activeFlowers.splice(i, 1);
          spawnRandomGoldenFlower();
          continue;
        }
        const d = Math.hypot(f.data.x - heroRig.root.position.x, f.data.z - heroRig.root.position.z);
        if (d < 4.2 && !foundFlower) foundFlower = f.data;
      }
      if ((foundFlower?.id || null) !== nearestFlowerId) {
        nearestFlowerId = foundFlower?.id || null;
        callbacks.onNearFlowerChange(foundFlower);
      }

      // Nearby NPC Detection
      let foundNpc: NpcDef | null = null;
      let bestNpcDist = 6.5;
      for (const npc of TOWN_NPCS) {
        const d = Math.hypot(npc.x - heroRig.root.position.x, npc.z - heroRig.root.position.z);
        if (d < bestNpcDist) {
          bestNpcDist = d;
          foundNpc = npc;
        }
      }
      if ((foundNpc?.id || null) !== nearestNpcId) {
        nearestNpcId = foundNpc?.id || null;
        callbacks.onNearNpcChange(foundNpc);
      }

      // Ground Loot Drop Magnet & Pickup
      for (let i = lootDrops.length - 1; i >= 0; i--) {
        const entry = lootDrops[i];
        entry.data.life -= dt;
        entry.mesh.rotation.y += dt * 2.2;
        entry.mesh.position.y = Math.sin(elapsed * 4 + i) * 0.12;
        const dx = heroRig.root.position.x - entry.data.x;
        const dz = heroRig.root.position.z - entry.data.z;
        const d = Math.hypot(dx, dz);
        if (d < 4.5 && !isDead) {
          entry.data.x += (dx / (d || 1)) * 10 * dt;
          entry.data.z += (dz / (d || 1)) * 10 * dt;
          entry.mesh.position.x = entry.data.x;
          entry.mesh.position.z = entry.data.z;
        }
        if ((d < 1.5 && !isDead) || entry.data.life <= 0) {
          if (d < 1.5 && !isDead) {
            callbacks.onPickupLoot(entry.data);
            soundEngine.playCoin();
          }
          scene.remove(entry.mesh);
          lootDrops.splice(i, 1);
        }
      }

      // Projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.mesh.position.set(p.x, 1.15, p.z);
        p.mesh.rotation.y += dt * 10;

        let hit = false;
        for (let eIdx = 0; eIdx < enemyStates.length; eIdx++) {
          const e = enemyStates[eIdx];
          if (!e.alive) continue;
          if (Math.hypot(e.x - p.x, e.z - p.z) < (e.isBoss ? 2.4 : 1.5)) {
            const finalDmg = Math.max(8, Math.round(p.damage - e.def * 0.3));
            applyDamageToEnemy(eIdx, finalDmg, p.isCrit, p.vx * 0.04, p.vz * 0.04);
            hit = true;
            break;
          }
        }
        if (hit || p.life <= 0) {
          scene.remove(p.mesh);
          (p.mesh.material as THREE.Material).dispose();
          projectiles.splice(i, 1);
        }
      }

      // Enemies AI (Respects Fenced Highways & Cities Safe Zones!)
      const hxPos = heroRig.root.position.x;
      const hzPos = heroRig.root.position.z;
      const heroInSafeZone = isInSafeZoneOrRoad(hxPos, hzPos);

      for (let idx = 0; idx < enemyStates.length; idx++) {
        const e = enemyStates[idx];
        const rig = enemyRigs[idx];
        if (!e.alive) {
          rig.root.visible = false;
          e.respawnTimer -= dt;
          if (e.respawnTimer <= 0) {
            e.alive = true;
            e.hp = e.maxHp;
            e.phase = 1;
            e.x = e.homeX;
            e.z = e.homeZ;
            e.state = 'idle';
          }
          continue;
        }

        const dx = hxPos - e.x;
        const dz = hzPos - e.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 76) {
          rig.root.visible = false;
          continue;
        }
        rig.root.visible = true;

        const atkRange = e.isBoss ? 3.3 : 2.2;
        if (!isDead && !heroInSafeZone && dist < 19 && dist > atkRange) {
          const nextEx = e.x + (dx / dist) * e.speed * dt;
          const nextEz = e.z + (dz / dist) * e.speed * dt;
          if (!isInSafeZoneOrRoad(nextEx, nextEz)) {
            e.state = 'chase';
            e.x = nextEx;
            e.z = nextEz;
            rig.root.rotation.y = Math.atan2(dx, dz);
          } else {
            e.state = 'idle';
          }
        } else if (!isDead && !heroInSafeZone && dist <= atkRange) {
          rig.root.rotation.y = Math.atan2(dx, dz);
          enemyAttackTimers[idx] += dt;
          if (enemyAttackTimers[idx] < 0.72) {
            e.state = 'windup';
          } else if (enemyAttackTimers[idx] >= (e.phase === 2 ? 0.95 : 1.22)) {
            enemyAttackTimers[idx] = 0;
            const useBossSkill = e.isBoss && Math.random() < 0.42;
            e.state = useBossSkill ? 'skill' : 'attack';
            if (useBossSkill) {
              spawnBurst(e.x, 1.0, e.z, e.phase === 2 ? 0xa855f7 : 0xf97316, 14, 7);
            }
            if (invulnTimer <= 0) {
              const rawAtk = useBossSkill ? e.atk * 1.4 : e.atk;
              const dmg = Math.max(4, Math.round(rawAtk - statsRef.def * 0.45));
              const nextHp = Math.max(0, statsRef.hp - dmg);
              callbacks.onStatsChange((prev) => ({
                ...prev,
                hp: Math.max(0, prev.hp - dmg),
              }));
              const sc = projectToScreen(hxPos, 2.4, hzPos);
              if (sc.visible) {
                callbacks.onFloatingText({ x: sc.x, y: sc.y, text: `-${dmg}`, kind: 'enemyHit' });
              }
              spawnBurst(hxPos, 1.0, hzPos, 0xdc2626, 6);
              if (nextHp <= 0 && !isDead) {
                isDead = true;
                currentAction = 'dead';
                callbacks.onHeroDied();
              }
            }
          }
        } else {
          const hx = e.homeX - e.x;
          const hz = e.homeZ - e.z;
          const hd = Math.hypot(hx, hz);
          if (hd > 1.5) {
            e.state = 'chase';
            e.x += (hx / hd) * e.speed * 0.6 * dt;
            e.z += (hz / hd) * e.speed * 0.6 * dt;
            rig.root.rotation.y = Math.atan2(hx, hz);
          } else {
            e.state = 'idle';
          }
        }

        rig.root.position.set(e.x, 0, e.z);
        rig.animate(elapsed + idx, e.state, dt, e.phase);
      }

      // Burst Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          scene.remove(p.mesh);
          (p.mesh.material as THREE.Material).dispose();
          particles.splice(i, 1);
        } else {
          p.vy -= 9.5 * dt;
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - p.life / p.maxLife;
        }
      }
    }

    // GTA-Style Spherical Camera Orbit Tracking!
    const px = heroRig.root.position.x;
    const pz = heroRig.root.position.z;
    const camDist = 14.5 * cameraZoomScalar;
    const cosP = Math.cos(camPitch);
    const sinP = Math.sin(camPitch);
    _camDesired.set(
      px + Math.sin(camYaw) * cosP * camDist,
      Math.max(0.65, 1.6 + heroY * 0.7 + sinP * camDist),
      pz + Math.cos(camYaw) * cosP * camDist
    );
    _camTarget.set(px, 1.35 + heroY * 0.6, pz);
    const camDamp = 1 - Math.exp(-12 * Math.max(rawDt, 0.016));
    camera.position.lerp(_camDesired, camDamp);
    camera.lookAt(_camTarget);

    // HUD Snapshot (~20Hz)
    hudAccumulator += rawDt;
    if (hudAccumulator >= 0.05) {
      hudAccumulator = 0;
      const heroScreen = projectToScreen(px, 2.55 + heroY, pz);
      const enemiesHud = enemyStates
        .filter((e) => e.alive && Math.hypot(e.x - px, e.z - pz) < 42)
        .map((e) => {
          const s = projectToScreen(e.x, e.isBoss ? 3.5 : 2.0, e.z);
          return {
            id: e.id,
            name: e.name,
            level: e.level,
            hp: e.hp,
            maxHp: e.maxHp,
            x: e.x,
            z: e.z,
            isBoss: e.isBoss,
            phase: e.phase,
            alive: e.alive,
            screenX: s.x,
            screenY: s.y,
            visible: s.visible,
          };
        });

      const npcsHud = TOWN_NPCS.filter((n) => Math.hypot(n.x - px, n.z - pz) < 45).map((n) => {
        const s = projectToScreen(n.x, 2.4, n.z);
        return {
          id: n.id,
          name: n.name,
          title: n.title,
          role: n.role,
          screenX: s.x,
          screenY: s.y,
          visible: s.visible,
        };
      });

      const sunElevNow = Math.sin(timeOfDay * Math.PI * 2);
      const activeReg = WORLD_REGIONS.find((r) => r.id === currentRegionId) || WORLD_REGIONS[0];
      callbacks.onHudTick({
        playerX: px,
        playerZ: pz,
        playerRotY: heroRig.root.rotation.y,
        heroScreenX: heroScreen.x,
        heroScreenY: heroScreen.y,
        heroScreenVisible: heroScreen.visible,
        jumpCharge: isChargingJump ? Math.min(jumpChargeTime / 0.55, 1) : 0,
        isNight: sunElevNow < 0,
        weather: activeReg.biome === 'snow' ? 'snow' : weatherState,
        enemies: enemiesHud,
        npcs: npcsHud,
        cooldowns: [...skillCooldowns],
        dodgeCooldown,
      });
    }

    renderer.render(scene, camera);
    scheduleNext(tick);
  };
  tick();

  const onResize = () => {
    if (disposed) return;
    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 240);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  return {
    setInputVector: (x, y) => {
      inputVec = { x, y };
    },
    startJumpCharge,
    releaseJump,
    triggerSkill,
    triggerDodge,
    pickNearbyFlower,
    updateEquipment: (equipped) => heroRig.applyEquipment(equipped),
    applySettings,
    setBattleSpeed: (speed) => {
      battleSpeed = speed;
    },
    setZoomMode: (mode) => {
      cameraZoomScalar = mode === 'close' ? 0.65 : mode === 'overview' ? 2.4 : 1.05;
    },
    adjustZoom: (delta) => {
      cameraZoomScalar = THREE.MathUtils.clamp(cameraZoomScalar + delta, 0.55, 2.8);
    },
    teleportTo: (x, z) => {
      const r = resolveCollisions(x, z);
      heroRig.root.position.set(r.x, 0, r.z);
      moveTarget = null;
    },
    respawnInCity: () => {
      isDead = false;
      currentAction = 'idle';
      heroRig.root.position.set(0, 0, 12);
      heroY = 0;
      heroVy = 0;
      isGrounded = true;
      moveTarget = null;
      invulnTimer = 2.0;
    },
    syncStats: (stats) => {
      statsRef = { ...stats };
    },
    syncSkillLevels: (levels) => {
      skillLevelsRef = { ...levels };
    },
    getMapDots: () =>
      enemyStates
        .filter((e) => e.alive)
        .map((e) => ({ id: e.id, x: e.x, z: e.z, isBoss: e.isBoss })),
    setPaused: (isPaused) => {
      paused = isPaused;
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      heroRig.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
