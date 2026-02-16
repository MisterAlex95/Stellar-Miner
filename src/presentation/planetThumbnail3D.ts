/**
 * Shared three.js renderer for planet list thumbnails.
 * Uses ONE WebGL context to render all planet thumbnails as proper 3D spheres.
 */
import * as THREE from 'three';
import {
  generateProceduralPlanetTexture,
  type PlanetPaletteName,
} from './proceduralPlanetTexture.js';

/* ── helpers ─────────────────────────────────── */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const TYPES = ['rocky', 'desert', 'ice', 'volcanic', 'gas'] as const;
function typeName(name: string): string { return TYPES[hash(name) % TYPES.length]; }

function paletteFor(t: string): PlanetPaletteName {
  const m: Record<string, PlanetPaletteName> = { rocky: 'earth', desert: 'desert', ice: 'ice', volcanic: 'lava', gas: 'gas' };
  return m[t] ?? 'earth';
}

type Extra = 'none' | 'rings' | 'belt' | 'rings_and_belt';
function getExtra(name: string): Extra {
  const v = hash(name + 'extra') % 10;
  if (v < 2) return 'rings';
  if (v < 4) return 'belt';
  if (v < 5) return 'rings_and_belt';
  return 'none';
}

const ATM_COLOR: Record<string, number> = {
  rocky: 0xa0a296, desert: 0xd4b896, ice: 0xbae6fd, volcanic: 0xfecaca, gas: 0xfef08a,
};

const RING_COLOR: Record<string, { inner: number; outer: number }> = {
  rocky: { inner: 0xc8c0b0, outer: 0x8a8478 }, desert: { inner: 0xe8dcc8, outer: 0xa08060 },
  ice: { inner: 0xcffafe, outer: 0x67e8f9 }, volcanic: { inner: 0xfca5a5, outer: 0x7f1d1d },
  gas: { inner: 0xfde68a, outer: 0x92400e },
};

/* ── texture cache (THREE.Texture per planet) ── */

const TEX_SIZE = 128;
const threeTexCache = new Map<string, THREE.CanvasTexture>();

function getThreeTex(name: string, tn: string, visualSeed?: number): THREE.CanvasTexture {
  const key = `${name}-${tn}-${visualSeed ?? 'h'}`;
  let tex = threeTexCache.get(key);
  if (tex) return tex;
  const seed = visualSeed !== undefined ? (visualSeed >>> 0) : hash(name + tn);
  const h = hash(name + tn);
  const h2 = hash(name + tn + 'x');
  const h3 = hash(name + tn + 'y');
  const h4 = hash(name + tn + 'remap');
  const canvas = generateProceduralPlanetTexture({
    size: TEX_SIZE, seed,
    noiseScale: 0.022 + (h % 1000) / 1000 * 0.058,
    octaves: 3 + (h % 3),
    lacunarity: 1.9 + (h2 % 25) / 100,
    persistence: 0.45 + (h3 % 25) / 100,
    palette: paletteFor(tn),
    clouds: (seed + 99991) % 3 === 0,
    cloudOpacity: 0.4,
    remapPower: 0.6 + (h4 % 41) / 100,
  });
  tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  threeTexCache.set(key, tex);
  return tex;
}

/* ── shaders ──────────────────────────────────── */

const atmVert = `
  varying vec3 vNormal; varying vec3 vPos;
  void main(){
    vNormal = normalize(normalMatrix * normal);
    vPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const atmFrag = `
  uniform vec3 uColor;
  varying vec3 vNormal; varying vec3 vPos;
  void main(){
    float rim = 1.0 - max(dot(normalize(-vPos), vNormal), 0.0);
    float glow = pow(rim, 2.5) * 0.7;
    gl_FragColor = vec4(uColor, glow);
  }`;

const ringVert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const ringFrag = `
  uniform vec3 uCI; uniform vec3 uCO; uniform float uOp;
  varying vec2 vUv;
  float rnd(vec2 c){ return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    float t = vUv.x;
    vec3 c = mix(uCI, uCO, t);
    float n = rnd(vUv * 40.0) * 0.15;
    float a = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.85, t);
    a *= (0.7 + 0.3 * sin(t * 50.0 + n * 8.0)) * uOp + n * 0.08;
    gl_FragColor = vec4(c, a);
  }`;

function makeRingGeo(innerR: number, outerR: number, segs: number): THREE.BufferGeometry {
  const pos: number[] = []; const uv: number[] = []; const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a); const s = Math.sin(a);
    pos.push(c * innerR, 0, s * innerR); uv.push(0, i / segs);
    pos.push(c * outerR, 0, s * outerR); uv.push(1, i / segs);
  }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a+1, a+2, a+1, a+3, a+2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ── shared renderer (lazy init) ──────────────── */

const RENDER_SIZE = 128;

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null = null;
let atmMesh: THREE.Mesh | null = null;
let atmMatRef: THREE.ShaderMaterial | null = null;
let ringMesh: THREE.Mesh | null = null;
let ringMatRef: THREE.ShaderMaterial | null = null;

function ensureRenderer(): void {
  if (renderer) return;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(RENDER_SIZE, RENDER_SIZE);
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();

  /* FOV wide enough so sphere + atmosphere + rings (outer 1.55) all fit in the circular thumbnail */
  camera = new THREE.PerspectiveCamera(52, 1, 0.1, 20);
  camera.position.set(0.08, 0.1, 3.85);
  camera.lookAt(0, 0, 0);

  /* lighting: key + fill + rim for 3D depth */
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  const keyLight = new THREE.DirectionalLight(0xfff8e7, 1.6);
  keyLight.position.set(3, 2, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x6688aa, 0.3);
  fillLight.position.set(-3, 0, 1);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xaaccff, 0.5);
  rimLight.position.set(-1, 1, -3);
  scene.add(rimLight);

  /* planet sphere */
  const geo = new THREE.SphereGeometry(1, 48, 48);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 });
  sphere = new THREE.Mesh(geo, mat) as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  scene.add(sphere);

  /* atmosphere */
  const aGeo = new THREE.SphereGeometry(1.07, 32, 32);
  atmMatRef = new THREE.ShaderMaterial({
    vertexShader: atmVert, fragmentShader: atmFrag,
    uniforms: { uColor: { value: new THREE.Color(0xa0a296) } },
    transparent: true, side: THREE.FrontSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  atmMesh = new THREE.Mesh(aGeo, atmMatRef);
  scene.add(atmMesh);

  /* rings: inner/outer a bit closer to planet so the ring sits more centered in the thumbnail */
  const rg = makeRingGeo(1.12, 1.55, 80);
  ringMatRef = new THREE.ShaderMaterial({
    vertexShader: ringVert, fragmentShader: ringFrag,
    uniforms: {
      uCI: { value: new THREE.Color(0xc8c0b0) },
      uCO: { value: new THREE.Color(0x8a8478) },
      uOp: { value: 0.72 },
    },
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  ringMesh = new THREE.Mesh(rg, ringMatRef);
  /* tilt rings toward camera so they're clearly visible (not edge-on) in the thumbnail */
  ringMesh.rotation.x = Math.PI / 2 - 0.55;
  ringMesh.renderOrder = 5;
  scene.add(ringMesh);
}

/* ── animation state ──────────────────────────── */

let thumbRafId: number | null = null;
let globalTime = 0;

function renderOnePlanet(
  target: HTMLCanvasElement,
  planetName: string,
  visualSeed?: number
): void {
  ensureRenderer();
  if (!renderer || !scene || !camera || !sphere || !atmMesh || !atmMatRef || !ringMesh || !ringMatRef) return;

  const tn = typeName(planetName);
  const tex = getThreeTex(planetName, tn, visualSeed);

  /* swap texture (cached, no dispose needed) */
  sphere.material.map = tex;
  sphere.material.needsUpdate = true;

  /* axial tilt + rotation per planet */
  const tilt = ((hash(planetName) % 25) - 12) * (Math.PI / 180);
  const rotSpeed = 0.15 + (hash(planetName + 'rs') % 20) / 200;
  sphere.rotation.set(tilt, globalTime * rotSpeed + hash(planetName) * 0.01, 0);
  atmMesh.rotation.copy(sphere.rotation);

  /* atmosphere color per type */
  (atmMatRef.uniforms['uColor'].value as THREE.Color).set(ATM_COLOR[tn] ?? 0xa0a296);

  /* rings: show only for planets that have them */
  const ex = getExtra(planetName);
  const hasRings = ex === 'rings' || ex === 'rings_and_belt';
  ringMesh.visible = hasRings;
  if (hasRings) {
    const rc = RING_COLOR[tn] ?? RING_COLOR.rocky;
    (ringMatRef.uniforms['uCI'].value as THREE.Color).set(rc.inner);
    (ringMatRef.uniforms['uCO'].value as THREE.Color).set(rc.outer);
  }

  /* render */
  renderer.render(scene, camera);

  /* blit to target 2D canvas */
  const ctx = target.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(renderer.domElement, 0, 0, RENDER_SIZE, RENDER_SIZE, 0, 0, target.width, target.height);
  }
}

function tick(): void {
  globalTime += 0.016;
  document.querySelectorAll<HTMLCanvasElement>('.planet-card-visual').forEach((canvas) => {
    const name = canvas.getAttribute('data-planet-name');
    const seedAttr = canvas.getAttribute('data-planet-visual-seed');
    const vs = seedAttr !== null && seedAttr !== '' ? parseInt(seedAttr, 10) : undefined;
    if (name) renderOnePlanet(canvas, name, vs);
  });
  thumbRafId = requestAnimationFrame(tick);
}

export function startPlanetThumbnail3DLoop(): void {
  if (thumbRafId !== null) return;
  thumbRafId = requestAnimationFrame(tick);
}

export function stopPlanetThumbnail3DLoop(): void {
  if (thumbRafId !== null) {
    cancelAnimationFrame(thumbRafId);
    thumbRafId = null;
  }
}

/**
 * Render all currently visible planet thumbnails and start the animation loop.
 */
export function renderPlanetThumbnails(): void {
  document.querySelectorAll<HTMLCanvasElement>('.planet-card-visual').forEach((canvas) => {
    const name = canvas.getAttribute('data-planet-name');
    const seedAttr = canvas.getAttribute('data-planet-visual-seed');
    const vs = seedAttr !== null && seedAttr !== '' ? parseInt(seedAttr, 10) : undefined;
    if (name) renderOnePlanet(canvas, name, vs);
  });
  startPlanetThumbnail3DLoop();
}
