import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ClassId, EquippedMap, Gender } from '../types';
import { createHeroRig, HeroRig } from './HeroModel';
import { createRadialShadowTexture } from './textures';

export interface CharacterPreviewController {
  updateHero: (gender: Gender, classId: ClassId, equipped: EquippedMap) => void;
  updateEquipment: (equipped: EquippedMap) => void;
  dispose: () => void;
}

export function mountCharacterPreview(
  container: HTMLElement,
  initialGender: Gender,
  initialClassId: ClassId,
  initialEquipped: EquippedMap
): CharacterPreviewController {
  const isSoftwareGl = (() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  })();

  const width = Math.max(container.clientWidth, 240);
  const height = Math.max(container.clientHeight, 280);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0b10);
  scene.fog = new THREE.FogExp2(0x0c0b10, 0.075);

  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
  camera.position.set(0.35, 1.48, 3.9);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0x8fa8d8, 0x3b2316, 0.8));

  const keyLight = new THREE.DirectionalLight(0xffe1b0, 2.2);
  keyLight.position.set(3.2, 4.5, 3.8);
  keyLight.castShadow = !isSoftwareGl;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xd97706, 1.6);
  rimLight.position.set(-3.0, 3.2, -3.5);
  scene.add(rimLight);

  const pedestalGroup = new THREE.Group();
  const baseDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.18, 0.14, 32),
    new THREE.MeshStandardMaterial({ color: 0x17151c, metalness: 0.7, roughness: 0.35 })
  );
  baseDisc.position.y = -0.07;
  baseDisc.receiveShadow = true;
  pedestalGroup.add(baseDisc);

  const goldRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.03, 0.025, 10, 48),
    new THREE.MeshStandardMaterial({ color: 0xe0a943, metalness: 0.92, roughness: 0.18 })
  );
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.01;
  pedestalGroup.add(goldRing);

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.8),
    new THREE.MeshBasicMaterial({
      map: createRadialShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.015;
  pedestalGroup.add(contactShadow);
  scene.add(pedestalGroup);

  let heroRig: HeroRig = createHeroRig(initialGender, initialClassId);
  heroRig.applyEquipment(initialEquipped);
  scene.add(heroRig.root);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.05, 0);
  controls.enablePan = false;
  controls.minDistance = 2.1;
  controls.maxDistance = 5.4;
  controls.minPolarAngle = Math.PI * 0.2;
  controls.maxPolarAngle = Math.PI * 0.54;
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.07;
  controls.update();

  if (!isSoftwareGl) renderer.compile(scene, camera);

  const clock = new THREE.Clock();
  let frameId = 0;
  let disposed = false;

  const afterDraw = (cb: () => void) => {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  };

  const tick = () => {
    if (disposed) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();
    heroRig.updateAnimation(dt, elapsed, 0, 'idle', 0);
    controls.update();
    renderer.render(scene, camera);
    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);
  };
  tick();

  const onResize = () => {
    if (disposed) return;
    const w = Math.max(container.clientWidth, 240);
    const h = Math.max(container.clientHeight, 280);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  return {
    updateHero: (gender: Gender, classId: ClassId, equipped: EquippedMap) => {
      scene.remove(heroRig.root);
      heroRig.dispose();
      heroRig = createHeroRig(gender, classId);
      heroRig.applyEquipment(equipped);
      scene.add(heroRig.root);
    },
    updateEquipment: (equipped: EquippedMap) => {
      heroRig.applyEquipment(equipped);
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.dispose();
      heroRig.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
