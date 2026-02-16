/**
 * Three.js 3D planet renderer for the planet detail modal.
 * Renders a textured sphere with atmosphere, rings, asteroid belt, moons,
 * and orbit controls for drag-to-rotate in all directions.
 */
import * as THREE from 'three';
import {
  generateProceduralPlanetTexture,
  type PlanetPaletteName,
} from './proceduralPlanetTexture.js';

const SPHERE_SEGMENTS = 64;
const TEXTURE_SIZE = 512;

/* ── helpers ─────────────────────────────────────── */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getProceduralPalette(typeName: string): PlanetPaletteName {
  const map: Record<string, PlanetPaletteName> = {
    rocky: 'earth', desert: 'desert', ice: 'ice', volcanic: 'lava', gas: 'gas',
  };
  return map[typeName] ?? 'earth';
}

function getPlanetNoiseParams(planetName: string, typeName: string) {
  const h  = hashStr(planetName + typeName);
  const h2 = hashStr(planetName + typeName + 'x');
  const h3 = hashStr(planetName + typeName + 'y');
  const h4 = hashStr(planetName + typeName + 'remap');
  return {
    scale: 0.022 + (h % 1000) / 1000 * 0.058,
    octaves: 3 + (h % 3),
    lacunarity: 1.9 + (h2 % 25) / 100,
    persistence: 0.45 + (h3 % 25) / 100,
    remapPower: 0.6 + (h4 % 41) / 100,
  };
}

type PlanetExtra = 'none' | 'rings' | 'belt' | 'rings_and_belt';

function getPlanetExtra(name: string): PlanetExtra {
  const v = hashStr(name + 'extra') % 10;
  if (v < 2) return 'rings';
  if (v < 4) return 'belt';
  if (v < 5) return 'rings_and_belt';
  return 'none';
}

function getMoonCount(name: string): number {
  return hashStr(name + 'moon') % 3;
}

/* ── atmosphere color per type ───────────────────── */

const ATM_COLORS: Record<string, number> = {
  rocky: 0xa0a296, desert: 0xd4b896, ice: 0xbae6fd,
  volcanic: 0xfecaca, gas: 0xfef08a,
};

const RING_COLORS: Record<string, { inner: number; outer: number }> = {
  rocky:    { inner: 0xc8c0b0, outer: 0x8a8478 },
  desert:   { inner: 0xe8dcc8, outer: 0xa08060 },
  ice:      { inner: 0xcffafe, outer: 0x67e8f9 },
  volcanic: { inner: 0xfca5a5, outer: 0x7f1d1d },
  gas:      { inner: 0xfde68a, outer: 0x92400e },
};

/* ── atmosphere fresnel shader ──────────────────── */

const atmosphereVertex = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragment = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    float glow = pow(rim, 2.8) * uIntensity;
    gl_FragColor = vec4(uColor, glow * 0.65);
  }
`;

/* ── ring shader (transparent center fade) ───────── */

const ringVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragment = `
  uniform vec3 uColorInner;
  uniform vec3 uColorOuter;
  uniform float uOpacity;
  varying vec2 vUv;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    float t = vUv.x;
    vec3 col = mix(uColorInner, uColorOuter, t);
    float noise = rand(vUv * 40.0) * 0.15;
    float alpha = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.85, t);
    float bands = 0.7 + 0.3 * sin(t * 60.0 + noise * 10.0);
    alpha *= bands * uOpacity + noise * 0.1;
    gl_FragColor = vec4(col, alpha);
  }
`;

/* ── main API ──────────────────────────────────── */

export type PlanetScene = {
  /** Call every frame or on resize. */
  resize: (w: number, h: number) => void;
  /** Dispose of all resources. */
  dispose: () => void;
  /** The renderer DOM element (a <canvas>). */
  domElement: HTMLCanvasElement;
};

export function createPlanetScene(
  planetName: string,
  typeName: string,
  visualSeed: number | undefined
): PlanetScene {
  const seed = visualSeed !== undefined ? (visualSeed >>> 0) : hashStr(planetName + typeName);
  const params = getPlanetNoiseParams(planetName, typeName);
  const hasClouds = (seed + 99991) % 3 === 0;

  /* generate the procedural texture at higher res for detail view */
  const texCanvas = generateProceduralPlanetTexture({
    size: TEXTURE_SIZE,
    seed,
    noiseScale: params.scale,
    octaves: params.octaves,
    lacunarity: params.lacunarity,
    persistence: params.persistence,
    palette: getProceduralPalette(typeName),
    clouds: hasClouds,
    cloudOpacity: 0.4,
    remapPower: params.remapPower,
  });

  /* ── scene ──────────────────────────────────── */
  const scene = new THREE.Scene();

  /* ── camera ─────────────────────────────────── */
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 3.2);

  /* ── renderer ───────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(300, 300);
  renderer.setClearColor(0x000000, 0);
  renderer.sortObjects = true;

  /* ── lights ─────────────────────────────────── */
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.6);
  sunLight.position.set(3, 2, 4);
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x8899bb, 0.25);
  fillLight.position.set(-2, -1, -2);
  scene.add(fillLight);

  /* ── planet sphere ──────────────────────────── */
  const texture = new THREE.CanvasTexture(texCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const planetGeo = new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
  const planetMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.05,
  });
  const planetMesh = new THREE.Mesh(planetGeo, planetMat);
  scene.add(planetMesh);

  /* slight axial tilt based on seed */
  const tilt = ((seed % 30) - 15) * (Math.PI / 180);
  planetMesh.rotation.z = tilt;

  /* ── atmosphere glow ────────────────────────── */
  const atmColor = ATM_COLORS[typeName] ?? 0xa0a296;
  const atmGeo = new THREE.SphereGeometry(1.06, 48, 48);
  const atmMat = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertex,
    fragmentShader: atmosphereFragment,
    uniforms: {
      uColor: { value: new THREE.Color(atmColor) },
      uIntensity: { value: 1.4 },
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const atmMesh = new THREE.Mesh(atmGeo, atmMat);
  scene.add(atmMesh);

  /* ── rings ──────────────────────────────────── */
  const extra = getPlanetExtra(planetName);
  const hasRings = extra === 'rings' || extra === 'rings_and_belt';
  const hasBelt = extra === 'belt' || extra === 'rings_and_belt';
  const ringColors = RING_COLORS[typeName] ?? RING_COLORS.rocky;

  if (hasRings) {
    const innerR = 1.25;
    const outerR = 1.9;
    const ringGeo = createRingGeometry(innerR, outerR, 128);
    const ringMat = new THREE.ShaderMaterial({
      vertexShader: ringVertex,
      fragmentShader: ringFragment,
      uniforms: {
        uColorInner: { value: new THREE.Color(ringColors.inner) },
        uColorOuter: { value: new THREE.Color(ringColors.outer) },
        uOpacity: { value: 0.55 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    /* Ring geometry is already in XZ plane (equator); small X tilt so it stays visible */
    const ringTilt = 0.3 + (hashStr(planetName + 'tilt') % 20) / 100;
    ringMesh.rotation.x = -ringTilt;
    planetMesh.add(ringMesh);
  }

  /* ── asteroid belt ──────────────────────────── */
  const beltGroup = new THREE.Group();
  if (hasBelt) {
    const beltCount = 200 + (hashStr(planetName + 'beltN') % 100);
    const beltR = hasRings ? 2.1 : 1.6;
    const beltSpread = 0.25;
    const asteroidGeo = new THREE.IcosahedronGeometry(0.015, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: ringColors.outer,
      roughness: 0.9,
      metalness: 0.1,
    });
    const instancedMesh = new THREE.InstancedMesh(asteroidGeo, asteroidMat, beltCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < beltCount; i++) {
      const angle = (i / beltCount) * Math.PI * 2 + (hashStr(planetName + 'a' + i) % 100) / 100 * 0.3;
      const r = beltR + (hashStr(planetName + 'r' + i) % 100) / 100 * beltSpread - beltSpread / 2;
      const y = (hashStr(planetName + 'y' + i) % 100) / 100 * 0.12 - 0.06;
      dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      const s = 0.6 + (hashStr(planetName + 's' + i) % 100) / 100 * 0.8;
      dummy.scale.set(s, s, s);
      dummy.rotation.set(
        (hashStr(planetName + 'rx' + i) % 100) / 100 * Math.PI,
        (hashStr(planetName + 'ry' + i) % 100) / 100 * Math.PI,
        0
      );
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    beltGroup.add(instancedMesh);
    const beltTilt = hasRings ? Math.PI / 2 - (0.3 + (hashStr(planetName + 'tilt') % 20) / 100) : Math.PI / 2 - 0.15;
    beltGroup.rotation.x = beltTilt;
    scene.add(beltGroup);
  }

  /* ── moons (with procedural textures) ────────── */
  const moonCount = getMoonCount(planetName);
  const moons: { mesh: THREE.Mesh; orbitR: number; speed: number; phase: number }[] = [];
  const moonDisposables: THREE.Texture[] = [];

  for (let i = 0; i < moonCount; i++) {
    const moonR = 0.08 + (hashStr(planetName + 'mr' + i) % 40) / 1000;
    const orbitR = 1.8 + i * 0.6 + (hashStr(planetName + 'mo' + i) % 30) / 100;
    const speed = 0.3 + (hashStr(planetName + 'ms' + i) % 30) / 100;
    const phase = (hashStr(planetName + 'mp' + i) % 100) / 100 * Math.PI * 2;

    const moonSeed = hashStr(planetName + 'moonseed' + i);
    const moonTexCanvas = generateMoonTexture(64, moonSeed);
    const moonTex = new THREE.CanvasTexture(moonTexCanvas);
    moonTex.wrapS = THREE.RepeatWrapping;
    moonTex.wrapT = THREE.ClampToEdgeWrapping;
    moonDisposables.push(moonTex);

    const moonGeo = new THREE.SphereGeometry(moonR, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.95,
      metalness: 0.02,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);
    moons.push({ mesh: moonMesh, orbitR, speed, phase });
  }

  /* ── starfield background particles ─────────── */
  const starCount = 400;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 30 + Math.random() * 20;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ── orbit controls (manual, lightweight) ────── */
  let isPointerDown = false;
  let prevX = 0;
  let prevY = 0;
  let rotX = 0;
  let rotY = 0;
  let autoRotateSpeed = 0.15;

  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';

  function onPointerDown(e: PointerEvent): void {
    isPointerDown = true;
    prevX = e.clientX;
    prevY = e.clientY;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isPointerDown) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    rotY += dx * 0.005;
    rotX += dy * 0.005;
    rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
    prevX = e.clientX;
    prevY = e.clientY;
  }

  function onPointerUp(e: PointerEvent): void {
    isPointerDown = false;
    canvas.style.cursor = 'grab';
    canvas.releasePointerCapture(e.pointerId);
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  /* zoom with scroll wheel */
  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    camera.position.z = Math.max(1.8, Math.min(6, camera.position.z + e.deltaY * 0.003));
  }
  canvas.addEventListener('wheel', onWheel, { passive: false });

  /* ── animation loop ────────────────────────── */
  let animId: number | null = null;
  let time = 0;

  function animate(): void {
    animId = requestAnimationFrame(animate);
    const dt = 1 / 60;
    time += dt;

    /* auto-rotate + manual rotation */
    if (!isPointerDown) rotY += autoRotateSpeed * dt;
    planetMesh.rotation.y = rotY;
    planetMesh.rotation.x = rotX + tilt;
    atmMesh.rotation.y = rotY;
    atmMesh.rotation.x = rotX + tilt;

    /* animate moons */
    for (const m of moons) {
      const angle = time * m.speed + m.phase;
      m.mesh.position.set(
        Math.cos(angle) * m.orbitR,
        Math.sin(angle * 0.3) * 0.1,
        Math.sin(angle) * m.orbitR
      );
    }

    /* slowly rotate belt */
    if (hasBelt) beltGroup.rotation.y = time * 0.02;

    renderer.render(scene, camera);
  }

  animate();

  /* ── public API ─────────────────────────────── */
  function resize(w: number, h: number): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setSize(w, h);
    renderer.setPixelRatio(dpr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function dispose(): void {
    if (animId !== null) cancelAnimationFrame(animId);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
    renderer.dispose();
    planetGeo.dispose();
    planetMat.dispose();
    texture.dispose();
    atmGeo.dispose();
    atmMat.dispose();
    starGeo.dispose();
    starMat.dispose();
    for (const m of moons) {
      m.mesh.geometry.dispose();
      (m.mesh.material as THREE.Material).dispose();
    }
    for (const t of moonDisposables) t.dispose();
    scene.clear();
  }

  return { resize, dispose, domElement: canvas };
}

/* ── moon texture generator ────────────────────── */

function generateMoonTexture(size: number, seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = moonNoise(seed, x, y, 0.06);
      const n2 = moonNoise(seed + 7777, x, y, 0.12);
      const n3 = moonNoise(seed + 3333, x, y, 0.25);
      let v = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

      /* craters: dark spots */
      const cx = moonNoise(seed + 11111, x, y, 0.08);
      const crater = 1.0 - Math.max(0, (cx - 0.65) * 6);
      v *= crater;

      const base = 80 + (seed % 40);
      const range = 100 + (seed % 60);
      const lum = Math.round(base + v * range);
      const tint = (seed % 3 === 0) ? 8 : (seed % 3 === 1) ? -5 : 0;
      const i = (y * size + x) * 4;
      d[i]     = Math.max(0, Math.min(255, lum + tint));
      d[i + 1] = Math.max(0, Math.min(255, lum));
      d[i + 2] = Math.max(0, Math.min(255, lum - tint));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function moonNoise(seed: number, x: number, y: number, scale: number): number {
  const sx = x * scale;
  const sy = y * scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const va = moonHash(seed, ix, iy);
  const vb = moonHash(seed, ix + 1, iy);
  const vc = moonHash(seed, ix, iy + 1);
  const vd = moonHash(seed, ix + 1, iy + 1);
  return (va * (1 - u) + vb * u) * (1 - v) + (vc * (1 - u) + vd * u) * v;
}

function moonHash(seed: number, x: number, y: number): number {
  const n = (x * 73856093) ^ (y * 19349663) ^ seed;
  return ((n >>> 0) % 65536) / 65535;
}

/* ── ring geometry helper (flat disc with UVs) ──── */

function createRingGeometry(innerR: number, outerR: number, segments: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    positions.push(cos * innerR, 0, sin * innerR);
    uvs.push(0, i / segments);
    positions.push(cos * outerR, 0, sin * outerR);
    uvs.push(1, i / segments);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
