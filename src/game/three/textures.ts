import * as THREE from 'three';

let cachedSteelBump: THREE.CanvasTexture | null = null;
let cachedClothTexture: THREE.CanvasTexture | null = null;
let cachedGroundTexture: THREE.CanvasTexture | null = null;
let cachedCobbleTexture: THREE.CanvasTexture | null = null;
let cachedDirtTexture: THREE.CanvasTexture | null = null;
let cachedStoneTexture: THREE.CanvasTexture | null = null;
let cachedWaterTexture: THREE.CanvasTexture | null = null;

export function getDirtTerrainTexture(): THREE.CanvasTexture {
  if (cachedDirtTexture) return cachedDirtTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5a3d26'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const r = 0.8 + Math.random() * 3.8;
    const c = 70 + Math.floor(Math.random() * 35);
    ctx.fillStyle = `rgba(${c + 12}, ${c}, ${c - 8}, ${0.16 + Math.random() * 0.22})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  cachedDirtTexture = tex;
  return tex;
}

export function getStoneTexture(): THREE.CanvasTexture {
  if (cachedStoneTexture) return cachedStoneTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#64676b'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1100; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const r = 2 + Math.random() * 8;
    const shade = 70 + Math.floor(Math.random() * 75);
    ctx.fillStyle = `rgba(${shade},${shade + 2},${shade + 4},0.45)`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.65 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  cachedStoneTexture = tex;
  return tex;
}

export function getWaterTexture(): THREE.CanvasTexture {
  if (cachedWaterTexture) return cachedWaterTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2bb9e8'); grad.addColorStop(0.5, '#0e8ec4'); grad.addColorStop(1, '#075985');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 10) {
    ctx.strokeStyle = `rgba(210,245,255,${0.22 + Math.random() * 0.22})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 2.5);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 14);
  cachedWaterTexture = tex;
  return tex;
}


export function getBrushedMetalTexture(): THREE.CanvasTexture {
  if (cachedSteelBump) return cachedSteelBump;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++) {
    const v = 115 + Math.floor(Math.sin(y * 0.4) * 14 + Math.random() * 24);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, 256, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cachedSteelBump = tex;
  return tex;
}

export function getClothWeaveTexture(): THREE.CanvasTexture {
  if (cachedClothTexture) return cachedClothTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#909090';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) {
    for (let x = 0; x < 128; x += 4) {
      const shade = ((x + y) / 4) % 2 === 0 ? 155 : 120;
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  cachedClothTexture = tex;
  return tex;
}

export function getGrassTerrainTexture(): THREE.CanvasTexture {
  if (cachedGroundTexture) return cachedGroundTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2d4425';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 4;
    const g = 55 + Math.floor(Math.random() * 45);
    ctx.fillStyle = `rgba(${Math.floor(g * 0.65)}, ${g}, ${Math.floor(g * 0.45)}, 0.35)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  cachedGroundTexture = tex;
  return tex;
}

export function getCobblestoneTexture(): THREE.CanvasTexture {
  if (cachedCobbleTexture) return cachedCobbleTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3b3733';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 12;
  const cols = 12;
  const w = 512 / cols;
  const h = 512 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offset = r % 2 === 0 ? 0 : w * 0.5;
      const x = (c * w + offset) % 512;
      const y = r * h;
      const shade = 78 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${shade + 8}, ${shade + 2}, ${shade - 4})`;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 6);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  cachedCobbleTexture = tex;
  return tex;
}

export function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.65)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
