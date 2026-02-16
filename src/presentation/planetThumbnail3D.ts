/**
 * Shared three.js renderer for planet list thumbnails.
 * Uses ONE WebGL context to render all planet thumbnails.
 * Call renderThumbnail() for each visible canvas; call startLoop/stopLoop for animation.
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

function palette(t: string): PlanetPaletteName {
  const m: Record<string, PlanetPaletteName> = { rocky: 'earth', desert: 'desert', ice: 'ice', volcanic: 'lava', gas: 'gas' };
  return m[t] ?? 'earth';
}

type Extra = 'none' | 'rings' | 'belt' | 'rings_and_belt';
function extra(name: string): Extra {
  const v = hash(name + 'extra') % 10;
  if (v < 2) return 'rings';
  if (v < 4) return 'belt';
  if (v < 5) return 'rings_and_belt';
  return 'none';
}

const ATM: Record<string, number> = {
  rocky: 0xa0a296, desert: 0xd4b896, ice: 0xbae6fd, volcanic: 0xfecaca, gas: 0xfef08a,
};
const RING_COL: Record<string, { inner: number; outer: number }> = {
  rocky: { inner: 0xc8c0b0, outer: 0x8a8478 }, desert: { inner: 0xe8dcc8, outer: 0xa08060 },
  ice: { inner: 0xcffafe, outer: 0x67e8f9 }, volcanic: { inner: 0xfca5a5, outer: 0x7f1d1d },
  gas: { inner: 0xfde68a, outer: 0x92400e },
};

/* ── texture cache ─────────────────────────────── */

const TEX_SIZE = 64;
const texCache = new Map<string, HTMLCanvasElement>();

function getTex(name: string, tn: string, visualSeed?: number): HTMLCanvasElement {
  const key = `${name}-${tn}-${visualSeed ?? 'h'}`;
  let t = texCache.get(key);
  if (t) return t;
  const seed = visualSeed !== undefined ? (visualSeed >>> 0) : hash(name + tn);
  const h = hash(name + tn);
  const h2 = hash(name + tn + 'x');
  const h3 = hash(name + tn + 'y');
  const h4 = hash(name + tn + 'remap');
  t = generateProceduralPlanetTexture({
    size: TEX_SIZE, seed,
    noiseScale: 0.022 + (h % 1000) / 1000 * 0.058,
    octaves: 3 + (h % 3),
    lacunarity: 1.9 + (h2 % 25) / 100,
    persistence: 0.45 + (h3 % 25) / 100,
    palette: palette(tn),
    clouds: (seed + 99991) % 3 === 0,
    cloudOpacity: 0.4,
    remapPower: 0.6 + (h4 % 41) / 100,
  });
  texCache.set(key, t);
  return t;
}

/* ── shaders ──────────────────────────────────── */

const atmVert = `
  varying vec3 vNormal; varying vec3 vPos;
  void main(){
    vNormal=normalize(normalMatrix*normal);
    vPos=(modelViewMatrix*vec4(position,1.0)).xyz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }`;

const atmFrag = `
  uniform vec3 uColor; uniform float uInt;
  varying vec3 vNormal; varying vec3 vPos;
  void main(){
    float rim=1.0-max(dot(normalize(-vPos),vNormal),0.0);
    gl_FragColor=vec4(uColor,pow(rim,3.0)*uInt*0.5);
  }`;

const ringVert = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const ringFrag = `
  uniform vec3 uCI; uniform vec3 uCO; uniform float uOp;
  varying vec2 vUv;
  float rnd(vec2 c){return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453);}
  void main(){
    float t=vUv.x; vec3 c=mix(uCI,uCO,t);
    float n=rnd(vUv*40.0)*0.15;
    float a=smoothstep(0.0,0.08,t)*smoothstep(1.0,0.85,t);
    a*=(0.7+0.3*sin(t*60.0+n*10.0))*uOp+n*0.1;
    gl_FragColor=vec4(c,a);
  }`;

function ringGeo(innerR: number, outerR: number, segs: number): THREE.BufferGeometry {
  const pos: number[] = []; const uv: number[] = []; const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const cos = Math.cos(a); const sin = Math.sin(a);
    pos.push(cos * innerR, 0, sin * innerR); uv.push(0, i / segs);
    pos.push(cos * outerR, 0, sin * outerR); uv.push(1, i / segs);
  }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ── shared renderer (lazy init) ──────────────── */

const RENDER_SIZE = 96;

let renderer: THREE.WebGLRenderer | null = null;
let thumbScene: THREE.Scene | null = null;
let thumbCamera: THREE.PerspectiveCamera | null = null;
let sphereMesh: THREE.Mesh | null = null;
let sphereMat: THREE.MeshStandardMaterial | null = null;
let atmMesh: THREE.Mesh | null = null;
let atmMat: THREE.ShaderMaterial | null = null;
let ringMesh: THREE.Mesh | null = null;
let ringMat: THREE.ShaderMaterial | null = null;
let beltGroup: THREE.Group | null = null;

function ensureRenderer(): void {
  if (renderer) return;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(RENDER_SIZE, RENDER_SIZE);
  renderer.setClearColor(0x000000, 0);

  thumbScene = new THREE.Scene();
  thumbCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
  thumbCamera.position.set(0, 0, 3);

  thumbScene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const dl = new THREE.DirectionalLight(0xfff8e7, 1.4);
  dl.position.set(3, 2, 4);
  thumbScene.add(dl);

  const geo = new THREE.SphereGeometry(1, 32, 32);
  sphereMat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.05 });
  sphereMesh = new THREE.Mesh(geo, sphereMat);
  thumbScene.add(sphereMesh);

  const aGeo = new THREE.SphereGeometry(1.06, 24, 24);
  atmMat = new THREE.ShaderMaterial({
    vertexShader: atmVert, fragmentShader: atmFrag,
    uniforms: { uColor: { value: new THREE.Color(0xa0a296) }, uInt: { value: 1.2 } },
    transparent: true, side: THREE.FrontSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  atmMesh = new THREE.Mesh(aGeo, atmMat);
  thumbScene.add(atmMesh);

  const rg = ringGeo(1.25, 1.8, 64);
  ringMat = new THREE.ShaderMaterial({
    vertexShader: ringVert, fragmentShader: ringFrag,
    uniforms: { uCI: { value: new THREE.Color(0xc8c0b0) }, uCO: { value: new THREE.Color(0x8a8478) }, uOp: { value: 0.5 } },
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  ringMesh = new THREE.Mesh(rg, ringMat);
  ringMesh.rotation.x = Math.PI / 2 - 0.35;
  thumbScene.add(ringMesh);

  beltGroup = new THREE.Group();
  thumbScene.add(beltGroup);
}

let thumbRafId: number | null = null;
let thumbRotation = 0;

/**
 * Render a planet thumbnail into a 2D canvas using the shared three.js renderer.
 */
function renderOneThumb(
  target: HTMLCanvasElement,
  planetName: string,
  visualSeed?: number
): void {
  ensureRenderer();
  if (!renderer || !thumbScene || !thumbCamera || !sphereMesh || !sphereMat || !atmMesh || !atmMat || !ringMesh || !ringMat || !beltGroup) return;

  const tn = typeName(planetName);
  const texCanvas = getTex(planetName, tn, visualSeed);

  /* update sphere texture */
  if (sphereMat.map) sphereMat.map.dispose();
  const tex = new THREE.CanvasTexture(texCanvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  sphereMat.map = tex;
  sphereMat.needsUpdate = true;

  /* rotation */
  const tilt = ((hash(planetName) % 30) - 15) * (Math.PI / 180);
  sphereMesh.rotation.set(tilt, thumbRotation + hash(planetName) * 0.001, 0);
  atmMesh.rotation.copy(sphereMesh.rotation);

  /* atmosphere color */
  (atmMat.uniforms['uColor'].value as THREE.Color).set(ATM[tn] ?? 0xa0a296);

  /* rings visibility */
  const ex = extra(planetName);
  const hasRings = ex === 'rings' || ex === 'rings_and_belt';
  ringMesh.visible = hasRings;
  if (hasRings) {
    const rc = RING_COL[tn] ?? RING_COL.rocky;
    (ringMat.uniforms['uCI'].value as THREE.Color).set(rc.inner);
    (ringMat.uniforms['uCO'].value as THREE.Color).set(rc.outer);
  }

  /* belt - just hide for thumbnails (too small to see) */
  beltGroup.visible = false;

  /* render */
  renderer.render(thumbScene, thumbCamera);

  /* copy to target canvas */
  const ctx2d = target.getContext('2d');
  if (ctx2d) {
    ctx2d.clearRect(0, 0, target.width, target.height);
    ctx2d.drawImage(renderer.domElement, 0, 0, RENDER_SIZE, RENDER_SIZE, 0, 0, target.width, target.height);
  }

  tex.dispose();
}

function thumbnailTick(): void {
  thumbRotation += 0.008;
  const listEl = document.getElementById('planet-list');
  if (listEl) {
    listEl.querySelectorAll<HTMLCanvasElement>('.planet-card-visual').forEach((canvas) => {
      const name = canvas.getAttribute('data-planet-name');
      const seedAttr = canvas.getAttribute('data-planet-visual-seed');
      const visualSeed = seedAttr !== null && seedAttr !== '' ? parseInt(seedAttr, 10) : undefined;
      if (name) renderOneThumb(canvas, name, visualSeed);
    });
  }
  thumbRafId = requestAnimationFrame(thumbnailTick);
}

export function startPlanetThumbnail3DLoop(): void {
  if (thumbRafId !== null) return;
  thumbRafId = requestAnimationFrame(thumbnailTick);
}

export function stopPlanetThumbnail3DLoop(): void {
  if (thumbRafId !== null) {
    cancelAnimationFrame(thumbRafId);
    thumbRafId = null;
  }
}

/**
 * Render all currently visible planet thumbnails once (called after planet list re-render).
 */
export function renderPlanetThumbnails(): void {
  const listEl = document.getElementById('planet-list');
  if (!listEl) return;
  listEl.querySelectorAll<HTMLCanvasElement>('.planet-card-visual').forEach((canvas) => {
    const name = canvas.getAttribute('data-planet-name');
    const seedAttr = canvas.getAttribute('data-planet-visual-seed');
    const visualSeed = seedAttr !== null && seedAttr !== '' ? parseInt(seedAttr, 10) : undefined;
    if (name) renderOneThumb(canvas, name, visualSeed);
  });
  startPlanetThumbnail3DLoop();
}
