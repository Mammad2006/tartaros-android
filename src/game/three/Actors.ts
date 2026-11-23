import * as THREE from 'three';
import { LootDrop, MobKind, NpcDef } from '../types';

export interface EnemyMeshRig {
  root: THREE.Group;
  body: THREE.Group;
  weaponArm?: THREE.Group;
  hitRing: THREE.Mesh;
  phaseWings?: THREE.Group;
  animate: (elapsed: number, state: string, dt: number, phase?: 1 | 2) => void;
}

function enableShadows(obj: THREE.Object3D) {
  obj.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
}

export function createEnemyRig(kind: MobKind, isBoss = false): EnemyMeshRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  let weaponArm: THREE.Group | undefined;
  let phaseWings: THREE.Group | undefined;

  if (kind === 'wolf') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0x262933, roughness: 0.85 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 2 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.96), furMat);
    torso.position.y = 0.56;
    body.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.36), furMat);
    head.position.set(0, 0.74, 0.62);
    body.add(head);

    [-0.1, 0.1].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
      eye.position.set(x * 0.95, 0.78, 0.79);
      body.add(eye);
    });

    const legGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.45, 8);
    [[-0.16, 0.34], [0.16, 0.34], [-0.16, -0.34], [0.16, -0.34]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, furMat);
      leg.position.set(lx, 0.23, lz);
      body.add(leg);
    });
  } else if (kind === 'goblin' || kind === 'imp') {
    const skinColor = kind === 'imp' ? 0x991b1b : 0x4d7c43;
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3b2418, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.44, 10), leatherMat);
    torso.position.y = 0.76;
    body.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skinMat);
    head.position.set(0, 1.12, 0.04);
    body.add(head);

    [-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 4), skinMat);
      ear.position.set(s * 0.2, 1.14, 0);
      ear.rotation.z = s * -1.0;
      body.add(ear);

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.5, 8), skinMat);
      leg.position.set(s * 0.1, 0.26, 0);
      body.add(leg);
    });

    weaponArm = new THREE.Group();
    weaponArm.position.set(0.24, 0.9, 0);
    body.add(weaponArm);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.48, 4), metalMat);
    blade.rotation.x = Math.PI * 0.5;
    blade.position.set(0, -0.25, 0.24);
    weaponArm.add(blade);
  } else if (kind === 'yeti' || kind === 'golem') {
    const isYeti = kind === 'yeti';
    const mat = new THREE.MeshStandardMaterial({
      color: isYeti ? 0xdbeafe : 0x57534e,
      roughness: isYeti ? 0.85 : 0.92,
      flatShading: !isYeti,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: isYeti ? 0x38bdf8 : 0xf97316 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.82, 0.52), mat);
    torso.position.y = 1.12;
    body.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.36), mat);
    head.position.set(0, 1.72, 0.06);
    body.add(head);

    [-0.08, 0.08].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
      eye.position.set(ex, 1.75, 0.24);
      body.add(eye);
    });

    [-1, 1].forEach((s) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), mat);
      leg.position.set(s * 0.22, 0.36, 0);
      body.add(leg);
    });

    weaponArm = new THREE.Group();
    weaponArm.position.set(0.5, 1.38, 0);
    body.add(weaponArm);
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.76, 0.24), mat);
    armMesh.position.y = -0.35;
    weaponArm.add(armMesh);
  } else if (kind === 'skeleton') {
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.65 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x312e81, metalness: 0.6, roughness: 0.4 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.54, 8), armorMat);
    torso.position.y = 0.92;
    body.add(torso);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), boneMat);
    skull.position.y = 1.38;
    body.add(skull);

    [-1, 1].forEach((s) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.65, 6), boneMat);
      leg.position.set(s * 0.1, 0.32, 0);
      body.add(leg);
    });

    weaponArm = new THREE.Group();
    weaponArm.position.set(0.26, 1.1, 0);
    body.add(weaponArm);
    const scythe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.05), boneMat);
    scythe.rotation.x = Math.PI * 0.45;
    scythe.position.set(0, -0.2, 0.35);
    weaponArm.add(scythe);
  } else if (kind === 'drake') {
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.45, metalness: 0.25 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x450a0a, side: THREE.DoubleSide });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 1.25), scaleMat);
    torso.position.y = 0.9;
    body.add(torso);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 6), scaleMat);
    head.rotation.x = Math.PI * 0.5;
    head.position.set(0, 1.12, 0.82);
    body.add(head);
    [-1, 1].forEach((s) => {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.65), wingMat);
      wing.position.set(s * 0.72, 1.2, 0);
      wing.rotation.y = s * -0.4;
      wing.rotation.x = -0.5;
      body.add(wing);
    });
  } else {
    const isFinalTartaros = kind === 'final_tartaros';
    const isMalakor = kind === 'final_malakor';
    const skinMat = new THREE.MeshStandardMaterial({
      color: isFinalTartaros ? 0x1e1b26 : isMalakor ? 0x450a0a : 0x3f5e36,
      roughness: 0.6,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: isFinalTartaros ? 0x0f0d14 : isMalakor ? 0x2b1111 : 0x2c2426,
      metalness: 0.88,
      roughness: 0.28,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: isFinalTartaros ? 0xa855f7 : isMalakor ? 0xf97316 : 0xd99b38,
      emissive: isFinalTartaros ? 0x7e22ce : isMalakor ? 0xea580c : 0x78350f,
      emissiveIntensity: 0.9,
      metalness: 0.9,
    });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.28, 0.78, 12), armorMat);
    torso.position.y = 1.22;
    body.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), skinMat);
    head.position.set(0, 1.8, 0.05);
    body.add(head);

    [-1, 1].forEach((s) => {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), armorMat);
      pauldron.position.set(s * 0.48, 1.54, 0);
      body.add(pauldron);

      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34, 6), trimMat);
      horn.position.set(s * 0.2, 2.02, 0);
      horn.rotation.z = s * -0.45;
      body.add(horn);

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.095, 0.76, 10), armorMat);
      leg.position.set(s * 0.17, 0.38, 0);
      body.add(leg);
    });

    weaponArm = new THREE.Group();
    weaponArm.position.set(0.48, 1.44, 0);
    body.add(weaponArm);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 1.55), trimMat);
    blade.position.set(0, -0.42, 0.72);
    weaponArm.add(blade);

    if (isFinalTartaros || isMalakor) {
      phaseWings = new THREE.Group();
      phaseWings.position.set(0, 1.45, -0.22);
      phaseWings.visible = false;
      [-1, 1].forEach((s) => {
        const wing = new THREE.Mesh(
          new THREE.ConeGeometry(0.45, 1.65, 4),
          new THREE.MeshBasicMaterial({
            color: isFinalTartaros ? 0xa855f7 : 0xf97316,
            transparent: true,
            opacity: 0.75,
          })
        );
        wing.position.set(s * 0.85, 0.35, -0.15);
        wing.rotation.z = s * -1.1;
        phaseWings!.add(wing);
      });
      body.add(phaseWings);
    }
  }

  enableShadows(body);

  if (isBoss) {
    root.scale.setScalar(kind === 'final_tartaros' ? 1.85 : kind === 'final_malakor' ? 1.7 : 1.45);
  }

  const hitRing = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.82, 24),
    new THREE.MeshBasicMaterial({
      color: isBoss ? 0xef4444 : 0xd97706,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isBoss ? 0.65 : 0.38,
      depthWrite: false,
    })
  );
  hitRing.rotation.x = -Math.PI / 2;
  hitRing.position.y = 0.05;
  root.add(hitRing);

  const animate = (elapsed: number, state: string, dt: number, phase: 1 | 2 = 1) => {
    const damp = 1 - Math.exp(-10 * dt);
    if (phaseWings) {
      phaseWings.visible = phase === 2;
      if (phase === 2) phaseWings.rotation.x = Math.sin(elapsed * 5) * 0.12;
    }
    if (state === 'chase') {
      body.position.y = Math.abs(Math.sin(elapsed * 8)) * 0.09;
      body.rotation.z = Math.sin(elapsed * 8) * 0.05;
    } else if (state === 'windup') {
      body.position.y = 0.1;
      if (weaponArm) weaponArm.rotation.x = THREE.MathUtils.lerp(weaponArm.rotation.x, -1.75, damp);
    } else if (state === 'attack' || state === 'skill') {
      if (weaponArm) weaponArm.rotation.x = THREE.MathUtils.lerp(weaponArm.rotation.x, 0.95, damp * 1.6);
    } else {
      body.position.y = Math.sin(elapsed * 2.5) * 0.03;
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, damp);
      if (weaponArm) weaponArm.rotation.x = THREE.MathUtils.lerp(weaponArm.rotation.x, -0.25, damp);
    }
  };

  return { root, body, weaponArm, hitRing, phaseWings, animate };
}

export function createNpcRig(npc: NpcDef): THREE.Group {
  const group = new THREE.Group();
  const robeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(npc.robeColor), roughness: 0.78 });
  const trimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(npc.accentColor), metalness: 0.8, roughness: 0.25 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xdab092, roughness: 0.65 });

  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.25, 14), robeMat);
  robe.position.y = 0.64;
  group.add(robe);

  const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.22, 12), trimMat);
  shoulders.position.y = 1.24;
  group.add(shoulders);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), skinMat);
  head.position.y = 1.52;
  group.add(head);

  enableShadows(group);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.82, 28),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(npc.accentColor),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.05;
  group.add(halo);

  group.position.set(npc.x, 0, npc.z);
  group.rotation.y = npc.rotationY;
  return group;
}

// === LIVING TOWN CITIZENS (MEN, WOMEN, ELDERS, CHILDREN) ===
export function createTownCitizenRig(
  archetype: 'man' | 'woman' | 'elder' | 'child',
  colorHex: number
): THREE.Group {
  const g = new THREE.Group();
  const clothMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.82 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfb294, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({
    color: archetype === 'elder' ? 0xe5e7eb : 0x3b2618,
    roughness: 0.7,
  });

  const scale = archetype === 'child' ? 0.65 : archetype === 'elder' ? 0.94 : 1.0;

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.65, 6), clothMat);
  legL.position.set(-0.1, 0.32, 0);
  const legR = legL.clone();
  legR.position.x = 0.1;
  g.add(legL, legR);

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(
      archetype === 'woman' ? 0.17 : 0.21,
      archetype === 'woman' ? 0.28 : 0.17,
      0.66,
      10
    ),
    clothMat
  );
  torso.position.y = 0.94;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 10), skinMat);
  head.position.y = 1.44;
  g.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.155, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hair.position.set(0, 1.46, -0.01);
  g.add(hair);

  g.scale.setScalar(scale);
  enableShadows(g);
  return g;
}

// === TOWN ANIMALS (DOGS, CATS, MICE) ===
export function createTownAnimalRig(kind: 'dog' | 'cat' | 'mouse'): THREE.Group {
  const g = new THREE.Group();
  const color = kind === 'dog' ? 0x926239 : kind === 'cat' ? 0xf59e0b : 0x9ca3af;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

  const s = kind === 'mouse' ? 0.36 : kind === 'cat' ? 0.62 : 0.88;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.58), mat);
  body.position.y = 0.32;
  g.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.24), mat);
  head.position.set(0, 0.44, 0.34);
  g.add(head);

  [-0.08, 0.08].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), mat);
    ear.position.set(ex, 0.58, 0.34);
    g.add(ear);
  });

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.32, 6), mat);
  tail.position.set(0, 0.38, -0.35);
  tail.rotation.x = -0.8;
  g.add(tail);

  [[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.2], [0.1, -0.2]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.24, 6), mat);
    leg.position.set(lx, 0.12, lz);
    g.add(leg);
  });

  g.scale.setScalar(s);
  enableShadows(g);
  return g;
}

// === GOLDEN HEALING FLOWER IN FORESTS ===
export function createGoldenFlowerMesh(): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.55, 6),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 })
  );
  stem.position.y = 0.28;
  g.add(stem);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  for (let i = 0; i < 6; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), goldMat);
    petal.scale.set(1, 0.4, 1.4);
    const a = (i / 6) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.18, 0.58, Math.sin(a) * 0.18);
    petal.rotation.y = -a;
    g.add(petal);
  }
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.12, 0),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  core.position.y = 0.62;
  g.add(core);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.6, 20),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);

  return g;
}

export function createLootDropMesh(drop: LootDrop): THREE.Group {
  const g = new THREE.Group();
  if (drop.kind === 'gold') {
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xb45309,
      emissiveIntensity: 0.65,
      metalness: 0.9,
      roughness: 0.2,
    });
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), coinMat);
    coin.rotation.x = Math.PI * 0.5;
    coin.position.y = 0.38;
    g.add(coin);
  } else if (drop.kind === 'xp') {
    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.8,
      })
    );
    orb.position.y = 0.42;
    g.add(orb);
  } else {
    const rarityHex =
      drop.rarity === 'legendary'
        ? 0xf59e0b
        : drop.rarity === 'epic'
        ? 0xc084fc
        : drop.rarity === 'rare'
        ? 0x38bdf8
        : 0xd6cfc2;
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.32, 0.34),
      new THREE.MeshStandardMaterial({
        color: rarityHex,
        emissive: rarityHex,
        emissiveIntensity: 0.85,
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    chest.position.y = 0.36;
    g.add(chest);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.16, 1.8, 8),
      new THREE.MeshBasicMaterial({
        color: rarityHex,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
    );
    beam.position.y = 1.1;
    g.add(beam);
  }
  g.position.set(drop.x, 0, drop.z);
  return g;
}
