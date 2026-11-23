import * as THREE from 'three';
import { ITEMS } from '../data';
import { ClassId, EquippedMap, Gender, HeroAnimAction } from '../types';
import { getBrushedMetalTexture, getClothWeaveTexture } from './textures';

export interface HeroRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  hairGroup: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  rightHandMount: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  capePivot: THREE.Group;
  slashArcMesh: THREE.Mesh;
  auraRingMesh: THREE.Mesh;
  slots: {
    helmet: THREE.Group;
    armor: THREE.Group;
    leftPauldron: THREE.Group;
    rightPauldron: THREE.Group;
    leftGauntlet: THREE.Group;
    rightGauntlet: THREE.Group;
    leftBoot: THREE.Group;
    rightBoot: THREE.Group;
    weapon: THREE.Group;
    cloak: THREE.Group;
    ring: THREE.Group;
    amulet: THREE.Group;
  };
  applyEquipment: (equipped: EquippedMap) => void;
  updateAnimation: (
    dt: number,
    elapsed: number,
    moveSpeedRatio: number,
    action: HeroAnimAction,
    actionProgress: number,
    verticalVelocity?: number
  ) => void;
  dispose: () => void;
}

function clearGroup(g: THREE.Group) {
  while (g.children.length > 0) {
    const child = g.children[0];
    g.remove(child);
    child.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }
}

function setShadowRecursive(obj: THREE.Object3D) {
  obj.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
}

export function createHeroRig(gender: Gender = 'male', classId: ClassId = 'knight'): HeroRig {
  const metalBump = getBrushedMetalTexture();
  const clothBump = getClothWeaveTexture();

  const root = new THREE.Group();
  const isFemale = gender === 'female';
  const isBerserker = classId === 'berserker';
  const isArcher = classId === 'archer';
  const isNecro = classId === 'necromancer';

  // Class Physique Scale Proportions
  const widthScale = isBerserker ? (isFemale ? 1.06 : 1.2) : isFemale ? 0.88 : isArcher ? 0.94 : 1.0;
  const heightScale = isBerserker ? 1.08 : isFemale ? 0.96 : 1.0;

  const hips = new THREE.Group();
  hips.position.y = 0.96 * heightScale;
  hips.scale.set(widthScale, heightScale, widthScale);
  root.add(hips);

  // Skin & Starter Underwear Materials (Shown when naked/unequipped!)
  const skinMat = new THREE.MeshStandardMaterial({
    color: isNecro ? 0xc4b8c8 : isFemale ? 0xe0b59c : 0xd6a283,
    roughness: 0.62,
    metalness: 0.04,
  });

  const underwearMat = new THREE.MeshStandardMaterial({
    color: isArcher ? 0x26412b : isNecro ? 0x2d1b3b : 0x2a2426,
    roughness: 0.85,
    bumpMap: clothBump,
    bumpScale: 0.015,
  });

  const hairColor = isArcher ? 0xb47b38 : isNecro ? 0xe2e8f0 : isBerserker ? 0x3b1812 : 0x281914;
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.52,
    metalness: 0.08,
  });

  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
  const eyeColor = isNecro ? 0xc084fc : isArcher ? 0x4ade80 : isBerserker ? 0xef4444 : 0xf59e0b;
  const eyeIrisMat = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 0.8,
    roughness: 0.15,
  });

  // Pelvis / Starter Briefs-Loincloth (always visible under armor or when unequipped)
  const pelvisMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(isFemale ? 0.17 : 0.18, isFemale ? 0.18 : 0.16, 0.22, 14),
    underwearMat
  );
  pelvisMesh.scale.set(1.15, 1, 0.85);
  hips.add(pelvisMesh);

  // Torso (Bare skin chest/midriff with starter chest wrap for female so unequipped looks clean & distinct!)
  const torso = new THREE.Group();
  torso.position.y = 0.12;
  hips.add(torso);

  const chestTopR = isFemale ? 0.205 : isBerserker ? 0.28 : 0.245;
  const chestBotR = isFemale ? 0.145 : isBerserker ? 0.19 : 0.17;
  const chestMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(chestTopR, chestBotR, 0.46, 16),
    skinMat
  );
  chestMesh.position.y = 0.23;
  chestMesh.scale.set(1.16, 1, 0.84);
  torso.add(chestMesh);

  if (isFemale) {
    // Modest athletic starter chest-band when unequipped
    const chestWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.212, 0.188, 0.16, 16),
      underwearMat
    );
    chestWrap.position.y = 0.31;
    chestWrap.scale.set(1.17, 1, 0.86);
    torso.add(chestWrap);
  }

  // Class-specific subtle base markings (Berserker war-paint, Necro floating sigil, Archer quiver)
  if (isBerserker) {
    const scarMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });
    const warStripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.02), scarMat);
    warStripe.position.set(0, 0.32, 0.19);
    warStripe.rotation.z = -0.35;
    torso.add(warStripe);
  } else if (isArcher) {
    const quiver = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.045, 0.42, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 })
    );
    quiver.position.set(-0.14, 0.28, -0.18);
    quiver.rotation.z = -0.32;
    torso.add(quiver);
  }

  const armorSlot = new THREE.Group();
  armorSlot.position.y = 0.22;
  torso.add(armorSlot);

  const amuletSlot = new THREE.Group();
  amuletSlot.position.set(0, 0.41, 0.19);
  torso.add(amuletSlot);

  // Neck & Sculpted Head
  const neck = new THREE.Group();
  neck.position.y = 0.47;
  torso.add(neck);

  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(isFemale ? 0.058 : 0.072, isFemale ? 0.068 : 0.088, 0.12, 12),
    skinMat
  );
  neckMesh.position.y = 0.04;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.y = 0.18;
  neck.add(head);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.142, 20, 18), skinMat);
  cranium.scale.set(isFemale ? 0.88 : 0.94, 1.06, 0.96);
  head.add(cranium);

  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(isFemale ? 0.125 : 0.165, 0.1, 0.14),
    skinMat
  );
  jaw.position.set(0, -0.075, 0.032);
  head.add(jaw);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.021, 0.06, 5), skinMat);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, -0.01, 0.135);
  head.add(nose);

  [-0.046, 0.046].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), eyeWhiteMat);
    eye.position.set(ex, 0.015, 0.122);
    eye.scale.set(1.2, 0.72, 0.6);
    head.add(eye);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), eyeIrisMat);
    iris.position.set(ex, 0.015, 0.132);
    head.add(iris);
  });

  // Gender-Distinct Sculpted Hair
  const hairGroup = new THREE.Group();
  head.add(hairGroup);
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.152, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairCap.position.set(0, 0.02, -0.015);
  hairCap.rotation.x = -0.22;
  hairGroup.add(hairCap);

  if (isFemale) {
    // Long flowing ponytail + side framing locks
    const ponytail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 8), hairMat);
    ponytail.position.set(0, -0.05, -0.17);
    ponytail.rotation.x = 2.75;
    hairGroup.add(ponytail);

    [-0.12, 0.12].forEach((lx) => {
      const sideLock = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.26, 6), hairMat);
      sideLock.position.set(lx, -0.04, 0.03);
      sideLock.rotation.x = Math.PI;
      hairGroup.add(sideLock);
    });
  } else {
    for (let i = -3; i <= 3; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 6), hairMat);
      spike.position.set(i * 0.034, 0.11 - Math.abs(i) * 0.012, 0.07 - Math.abs(i) * 0.015);
      spike.rotation.x = -0.55;
      spike.rotation.z = -i * 0.15;
      hairGroup.add(spike);
    }
  }

  const helmetSlot = new THREE.Group();
  head.add(helmetSlot);

  // Cape Pivot
  const capePivot = new THREE.Group();
  capePivot.position.set(0, 0.44, -0.18);
  torso.add(capePivot);
  const capeLower = new THREE.Group();
  capeLower.position.set(0, -0.42, 0);
  capePivot.add(capeLower);
  const cloakSlot = new THREE.Group();
  capePivot.add(cloakSlot);

  // Arms (Bare skin arms when unequipped!)
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * (isFemale ? 0.265 : 0.31), 0.41, 0);
    torso.add(shoulder);

    const pauldronSlot = new THREE.Group();
    shoulder.add(pauldronSlot);

    const armR = isFemale ? 0.054 : isBerserker ? 0.078 : 0.066;
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(armR, armR * 0.85, 0.3, 12), skinMat);
    upperArm.position.y = -0.15;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(armR * 0.84, armR * 0.72, 0.28, 12),
      skinMat
    );
    forearm.position.y = -0.14;
    elbow.add(forearm);

    const gauntletSlot = new THREE.Group();
    gauntletSlot.position.y = -0.15;
    elbow.add(gauntletSlot);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(armR * 0.74, 10, 10), skinMat);
    hand.position.y = -0.3;
    elbow.add(hand);

    return { shoulder, pauldronSlot, elbow, gauntletSlot };
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  const rightHandMount = new THREE.Group();
  rightHandMount.position.set(0, -0.3, 0.02);
  rightArm.elbow.add(rightHandMount);

  const weaponSlot = new THREE.Group();
  rightHandMount.add(weaponSlot);

  const ringSlot = new THREE.Group();
  ringSlot.position.set(0, -0.28, 0.02);
  leftArm.elbow.add(ringSlot);

  // Legs (Bare skin legs when unequipped!)
  const makeLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * (isFemale ? 0.1 : 0.115), -0.06, 0);
    hips.add(hip);

    const thighR = isFemale ? 0.078 : isBerserker ? 0.098 : 0.086;
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(thighR, thighR * 0.8, 0.42, 12), skinMat);
    thigh.position.y = -0.21;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.43;
    hip.add(knee);

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(thighR * 0.78, thighR * 0.62, 0.42, 12),
      skinMat
    );
    shin.position.y = -0.21;
    knee.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.075, 0.2), skinMat);
    foot.position.set(0, -0.43, 0.035);
    knee.add(foot);

    const bootSlot = new THREE.Group();
    bootSlot.position.y = -0.24;
    knee.add(bootSlot);

    return { hip, knee, bootSlot };
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // Combat Slash Arc & Class Aura Ring
  const slashGeo = new THREE.RingGeometry(1.1, 2.1, 28, 1, -Math.PI * 0.45, Math.PI * 0.95);
  const slashMat = new THREE.MeshBasicMaterial({
    color: 0xff8a2b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const slashArcMesh = new THREE.Mesh(slashGeo, slashMat);
  slashArcMesh.rotation.x = -Math.PI / 2;
  slashArcMesh.position.y = 1.1;
  root.add(slashArcMesh);

  const auraGeo = new THREE.RingGeometry(0.6, 1.0, 32);
  const auraMat = new THREE.MeshBasicMaterial({
    color: isNecro ? 0xa855f7 : isArcher ? 0x22c55e : 0xd97706,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: isNecro ? 0.35 : 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const auraRingMesh = new THREE.Mesh(auraGeo, auraMat);
  auraRingMesh.rotation.x = -Math.PI / 2;
  auraRingMesh.position.y = 0.04;
  root.add(auraRingMesh);

  setShadowRecursive(root);

  const slots = {
    helmet: helmetSlot,
    armor: armorSlot,
    leftPauldron: leftArm.pauldronSlot,
    rightPauldron: rightArm.pauldronSlot,
    leftGauntlet: leftArm.gauntletSlot,
    rightGauntlet: rightArm.gauntletSlot,
    leftBoot: leftLeg.bootSlot,
    rightBoot: rightLeg.bootSlot,
    weapon: weaponSlot,
    cloak: cloakSlot,
    ring: ringSlot,
    amulet: amuletSlot,
  };

  // === DYNAMIC VISUAL EQUIPMENT BUILDER ===
  const applyEquipment = (equipped: EquippedMap) => {
    Object.values(slots).forEach(clearGroup);

    // 1. WEAPON (Sword, Greataxe, Bow, or Necro Staff)
    if (equipped.weapon && ITEMS[equipped.weapon]) {
      const item = ITEMS[equipped.weapon];
      const wGroup = new THREE.Group();
      const primMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(item.primaryColor || '#cbd5e1'),
        metalness: item.weaponKind === 'bow' ? 0.25 : 0.92,
        roughness: item.weaponKind === 'bow' ? 0.55 : 0.18,
        clearcoat: 0.65,
        bumpMap: metalBump,
        bumpScale: 0.008,
      });
      const accMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.accentColor || '#d4a243'),
        metalness: 0.9,
        roughness: 0.22,
      });

      if (item.weaponKind === 'bow') {
        // Woodland Recurve Bow held vertically
        wGroup.rotation.x = Math.PI * 0.5;
        const arc = new THREE.Mesh(
          new THREE.TorusGeometry(0.55, 0.025, 8, 22, Math.PI * 1.15),
          primMat
        );
        arc.rotation.z = -Math.PI * 0.57;
        arc.position.z = 0.18;
        wGroup.add(arc);

        const stringGeo = new THREE.CylinderGeometry(0.006, 0.006, 1.05, 6);
        const stringMesh = new THREE.Mesh(stringGeo, new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
        stringMesh.position.z = -0.08;
        wGroup.add(stringMesh);

        if (item.glowColor) {
          const tip = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.04, 0),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(item.glowColor) })
          );
          tip.position.set(0, 0.54, 0.02);
          wGroup.add(tip);
        }
      } else if (item.weaponKind === 'staff') {
        // Necromancer / Mystic Soul Staff
        wGroup.rotation.x = Math.PI * 0.32;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 1.65, 8), primMat);
        shaft.position.y = 0.45;
        wGroup.add(shaft);

        const crown = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 16), accMat);
        crown.position.y = 1.32;
        wGroup.add(crown);

        const orbMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(item.glowColor || '#a855f7'),
          emissive: new THREE.Color(item.glowColor || '#a855f7'),
          emissiveIntensity: 2.5,
        });
        const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), orbMat);
        orb.position.y = 1.32;
        wGroup.add(orb);
      } else if (item.weaponKind === 'greataxe') {
        // Massive Berserker Cleaver / Greataxe
        wGroup.rotation.x = Math.PI * 0.45;
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.025, 1.32, 8),
          new THREE.MeshStandardMaterial({ color: 0x3b2214 })
        );
        shaft.position.y = 0.52;
        wGroup.add(shaft);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.045), primMat);
        head.position.y = 1.04;
        wGroup.add(head);

        if (item.glowColor) {
          const edge = new THREE.Mesh(
            new THREE.BoxGeometry(0.44, 0.06, 0.052),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(item.glowColor) })
          );
          edge.position.y = 1.04;
          wGroup.add(edge);
        }
      } else {
        // Knight / Tartaros Greatsword
        wGroup.rotation.x = Math.PI * 0.45;
        const grip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.024, 0.24, 8),
          new THREE.MeshStandardMaterial({ color: 0x2b1a14, roughness: 0.8 })
        );
        wGroup.add(grip);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.042, 0.06), accMat);
        guard.position.y = 0.12;
        wGroup.add(guard);

        const bladeLen = item.visualTier === 'tartaros' ? 1.18 : 0.98;
        const bladeGeo = new THREE.ConeGeometry(0.075, bladeLen, 4);
        bladeGeo.scale(1, 1, 0.26);
        const blade = new THREE.Mesh(bladeGeo, primMat);
        blade.position.y = 0.14 + bladeLen * 0.5;
        wGroup.add(blade);

        if (item.glowColor) {
          const runeStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.022, bladeLen * 0.65, 0.028),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(item.glowColor) })
          );
          runeStrip.position.y = 0.18 + bladeLen * 0.36;
          wGroup.add(runeStrip);
        }
      }

      setShadowRecursive(wGroup);
      slots.weapon.add(wGroup);
    }

    // 2. HELMET
    if (equipped.helmet && ITEMS[equipped.helmet]) {
      const item = ITEMS[equipped.helmet];
      hairGroup.visible = false;
      const helmMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.primaryColor || '#64748b'),
        metalness: 0.88,
        roughness: 0.26,
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.accentColor || '#d4a243'),
        metalness: 0.92,
        roughness: 0.2,
      });
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.165, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.65),
        helmMat
      );
      dome.position.y = 0.02;
      slots.helmet.add(dome);
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.08, 0.26), trimMat);
      ridge.position.set(0, 0.16, -0.01);
      slots.helmet.add(ridge);

      if (item.visualTier === 'tartaros') {
        [-1, 1].forEach((s) => {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.24, 8), trimMat);
          horn.position.set(s * 0.16, 0.14, 0.02);
          horn.rotation.z = s * -0.58;
          slots.helmet.add(horn);
        });
      }
      setShadowRecursive(slots.helmet);
    } else {
      hairGroup.visible = true;
    }

    // 3. ARMOR + PAULDRONS + TASSETS
    if (equipped.armor && ITEMS[equipped.armor]) {
      const item = ITEMS[equipped.armor];
      const plateMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.primaryColor || '#334155'),
        metalness: item.visualTier === 'rustic' ? 0.25 : 0.85,
        roughness: item.visualTier === 'rustic' ? 0.65 : 0.26,
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.accentColor || '#dfa642'),
        metalness: 0.92,
        roughness: 0.2,
      });

      const breastplate = new THREE.Mesh(
        new THREE.CylinderGeometry(chestTopR + 0.03, chestBotR + 0.028, 0.44, 16),
        plateMat
      );
      breastplate.scale.set(1.2, 1, 0.88);
      slots.armor.add(breastplate);

      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.024, 8, 18), trimMat);
      collar.rotation.x = Math.PI * 0.5;
      collar.position.y = 0.21;
      slots.armor.add(collar);

      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.075, 16), trimMat);
      belt.scale.set(1.18, 1, 0.88);
      belt.position.y = -0.21;
      slots.armor.add(belt);

      if (item.glowColor) {
        const chestGem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.045, 0),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(item.glowColor) })
        );
        chestGem.position.set(0, 0.07, 0.23);
        slots.armor.add(chestGem);
      }

      const buildPauldron = (side: -1 | 1, target: THREE.Group) => {
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.135, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
          plateMat
        );
        dome.position.set(side * 0.03, 0.02, 0);
        dome.rotation.z = side * -0.45;
        target.add(dome);
      };
      buildPauldron(-1, slots.leftPauldron);
      buildPauldron(1, slots.rightPauldron);
      setShadowRecursive(slots.armor);
    }

    // 4. CLOAK
    if (equipped.cloak && ITEMS[equipped.cloak]) {
      const item = ITEMS[equipped.cloak];
      const capeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.primaryColor || '#8b161e'),
        roughness: 0.72,
        side: THREE.DoubleSide,
      });
      const upperCape = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.55, 0.03), capeMat);
      upperCape.position.set(0, -0.26, -0.02);
      upperCape.rotation.x = 0.08;
      slots.cloak.add(upperCape);

      const lowerCape = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 0.025), capeMat);
      lowerCape.position.set(0, -0.78, -0.08);
      lowerCape.rotation.x = 0.16;
      slots.cloak.add(lowerCape);
      setShadowRecursive(slots.cloak);
    }

    // 5. GAUNTLETS
    if (equipped.gauntlets && ITEMS[equipped.gauntlets]) {
      const item = ITEMS[equipped.gauntlets];
      const gMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.primaryColor || '#334155'),
        metalness: 0.85,
        roughness: 0.26,
      });
      [slots.leftGauntlet, slots.rightGauntlet].forEach((slot) => {
        slot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.24, 12), gMat));
      });
    }

    // 6. BOOTS
    if (equipped.boots && ITEMS[equipped.boots]) {
      const item = ITEMS[equipped.boots];
      const bMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.primaryColor || '#27272a'),
        metalness: item.visualTier === 'rustic' ? 0.18 : 0.82,
        roughness: 0.32,
      });
      [slots.leftBoot, slots.rightBoot].forEach((slot) => {
        slot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.064, 0.36, 12), bMat));
        const sabaton = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.09, 0.24), bMat);
        sabaton.position.set(0, -0.19, 0.04);
        slot.add(sabaton);
      });
    }

    // 7. RING & AMULET
    if (equipped.ring && ITEMS[equipped.ring]) {
      const item = ITEMS[equipped.ring];
      slots.ring.add(
        new THREE.Mesh(
          new THREE.TorusGeometry(0.055, 0.014, 8, 16),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(item.glowColor || '#ef4444') })
        )
      );
    }
    if (equipped.amulet && ITEMS[equipped.amulet]) {
      const item = ITEMS[equipped.amulet];
      slots.amulet.add(
        new THREE.Mesh(
          new THREE.OctahedronGeometry(0.042, 0),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(item.glowColor || '#fbbf24') })
        )
      );
    }
  };

  // === FLUID PROCEDURAL CHARACTER ANIMATION ===
  const updateAnimation = (
    dt: number,
    elapsed: number,
    moveSpeedRatio: number,
    action: HeroAnimAction,
    actionProgress: number,
    verticalVelocity = 0
  ) => {
    const damp = 1 - Math.exp(-14 * dt);

    let targetRootRotX = 0;
    let targetHipY = (0.96 + Math.sin(elapsed * 2.4) * 0.015) * heightScale;
    let targetTorsoX = 0.04;
    let targetTorsoY = Math.sin(elapsed * 1.2) * 0.04;
    let targetLShoulderX = 0.08 + Math.sin(elapsed * 2.4) * 0.03;
    let targetLShoulderZ = 0.18;
    let targetLElbowX = -0.28;
    let targetRShoulderX = -0.14 - Math.sin(elapsed * 2.4) * 0.03;
    let targetRShoulderZ = -0.22;
    let targetRElbowX = -0.45;
    let targetLHipX = 0;
    let targetRHipX = 0;
    let targetLKneeX = 0.05;
    let targetRKneeX = 0.05;
    let targetCapeX = 0.08 + Math.sin(elapsed * 2.8) * 0.05;

    if (action === 'dead') {
      targetRootRotX = -Math.PI * 0.48;
      targetHipY = 0.25;
    } else if (action === 'jump') {
      targetTorsoX = verticalVelocity > 0 ? -0.12 : 0.16;
      targetLShoulderX = -0.9;
      targetRShoulderX = -0.8;
      targetLHipX = -0.45;
      targetLKneeX = 0.75;
      targetRHipX = 0.25;
      targetRKneeX = 0.35;
      targetCapeX = 0.65;
    } else if (moveSpeedRatio > 0.05) {
      const stride = elapsed * (9.5 + moveSpeedRatio * 2.5);
      const amp = Math.min(moveSpeedRatio, 1);
      targetHipY = (0.95 + Math.abs(Math.sin(stride)) * 0.075 * amp) * heightScale;
      targetTorsoX = 0.22 * amp;
      targetTorsoY = Math.sin(stride) * 0.14 * amp;
      targetLHipX = Math.sin(stride) * 0.85 * amp;
      targetRHipX = -Math.sin(stride) * 0.85 * amp;
      targetLKneeX = Math.max(0.05, -Math.cos(stride) * 0.85 * amp);
      targetRKneeX = Math.max(0.05, Math.cos(stride) * 0.85 * amp);
      targetLShoulderX = -Math.sin(stride) * 0.72 * amp;
      targetRShoulderX = Math.sin(stride) * 0.55 * amp - 0.2;
      targetLElbowX = -0.65 * amp - 0.2;
      targetRElbowX = -0.55;
      targetCapeX = 0.42 * amp + Math.sin(elapsed * 9) * 0.12 * amp;
    }

    const slashMatRef = slashArcMesh.material as THREE.MeshBasicMaterial;
    const auraMatRef = auraRingMesh.material as THREE.MeshBasicMaterial;
    slashMatRef.opacity = THREE.MathUtils.lerp(slashMatRef.opacity, 0, damp);
    auraMatRef.opacity = THREE.MathUtils.lerp(auraMatRef.opacity, isNecro ? 0.35 : 0, damp);

    if (action === 'attack1' || action === 'attack2') {
      const p = actionProgress;
      const swing =
        action === 'attack1'
          ? THREE.MathUtils.lerp(-0.9, 1.35, Math.min(p * 2, 1))
          : THREE.MathUtils.lerp(1.3, -1.35, Math.min(p * 2, 1));
      targetTorsoY = swing * 0.75;
      targetRShoulderX = -1.35;
      targetRShoulderZ = -swing * 1.15;
      slashMatRef.color.setHex(isBerserker ? 0xff4500 : 0xffe0a3);
      slashMatRef.opacity = p > 0.1 && p < 0.65 ? 0.9 : 0;
      slashArcMesh.rotation.z = swing * 0.8;
    } else if (action === 'skill_heavy') {
      const p = actionProgress;
      targetHipY += Math.sin(p * Math.PI) * 0.55;
      targetTorsoX = THREE.MathUtils.lerp(-0.4, 0.6, p);
      targetRShoulderX = THREE.MathUtils.lerp(-2.5, 0.5, p);
      targetLShoulderX = THREE.MathUtils.lerp(-2.1, 0.2, p);
      slashMatRef.color.setHex(0xff5500);
      slashMatRef.opacity = p > 0.3 ? 0.95 : 0;
      auraMatRef.opacity = 1 - p;
      auraRingMesh.scale.setScalar(1 + p * 3.5);
    } else if (action === 'skill_nova') {
      const p = actionProgress;
      targetHipY += Math.sin(p * Math.PI) * 0.45;
      targetLShoulderX = -1.8;
      targetRShoulderX = -1.8;
      targetLShoulderZ = 0.9;
      targetRShoulderZ = -0.9;
      auraMatRef.opacity = (1 - p) * 1.3;
      auraRingMesh.scale.setScalar(0.8 + p * 4.5);
    } else if (action === 'skill_shoot') {
      targetTorsoY = -0.6;
      targetLShoulderX = -1.45;
      targetRShoulderX = -1.35;
      targetRShoulderZ = -0.4;
      auraMatRef.opacity = 0.5;
    } else if (action === 'dodge') {
      targetTorsoX = 0.62;
      targetHipY = 0.75;
    }

    hips.rotation.x = THREE.MathUtils.lerp(hips.rotation.x, targetRootRotX, damp);
    hips.position.y = THREE.MathUtils.lerp(hips.position.y, targetHipY, damp);
    torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, targetTorsoX, damp);
    torso.rotation.y = THREE.MathUtils.lerp(torso.rotation.y, targetTorsoY, damp);
    leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(leftArm.shoulder.rotation.x, targetLShoulderX, damp);
    leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(leftArm.shoulder.rotation.z, targetLShoulderZ, damp);
    leftArm.elbow.rotation.x = THREE.MathUtils.lerp(leftArm.elbow.rotation.x, targetLElbowX, damp);
    rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(rightArm.shoulder.rotation.x, targetRShoulderX, damp);
    rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(rightArm.shoulder.rotation.z, targetRShoulderZ, damp);
    rightArm.elbow.rotation.x = THREE.MathUtils.lerp(rightArm.elbow.rotation.x, targetRElbowX, damp);
    leftLeg.hip.rotation.x = THREE.MathUtils.lerp(leftLeg.hip.rotation.x, targetLHipX, damp);
    rightLeg.hip.rotation.x = THREE.MathUtils.lerp(rightLeg.hip.rotation.x, targetRHipX, damp);
    leftLeg.knee.rotation.x = THREE.MathUtils.lerp(leftLeg.knee.rotation.x, targetLKneeX, damp);
    rightLeg.knee.rotation.x = THREE.MathUtils.lerp(rightLeg.knee.rotation.x, targetRKneeX, damp);
    capePivot.rotation.x = THREE.MathUtils.lerp(capePivot.rotation.x, targetCapeX, damp);
  };

  return {
    root,
    hips,
    torso,
    neck,
    head,
    hairGroup,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    rightHandMount,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    capePivot,
    slashArcMesh,
    auraRingMesh,
    slots,
    applyEquipment,
    updateAnimation,
    dispose: () => clearGroup(root),
  };
}
