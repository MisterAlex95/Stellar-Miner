/**
 * Three.js mine zone: 3D solar system view with 2D overlay for effects.
 * Drop-in replacement for createMineZoneCanvas (same API).
 */
import * as THREE from 'three';
import { PLANETS_PER_SOLAR_SYSTEM } from '../../../application/solarSystems.js';
import {
  generateProceduralPlanetTexture,
  type PlanetPaletteName,
} from './proceduralPlanetTexture.js';
import type { PlanetView, MineZoneSettings, EventContext } from './MineZoneCanvas.js';

/* ── hash / palette helpers (same as MineZoneCanvas) ── */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const PLANET_TYPE_NAMES = ['rocky', 'desert', 'ice', 'volcanic', 'gas'] as const;
type PlanetTypeName = (typeof PLANET_TYPE_NAMES)[number];

function getPlanetTypeName(name: string): PlanetTypeName {
  return PLANET_TYPE_NAMES[hash(name) % PLANET_TYPE_NAMES.length];
}

function getProceduralPalette(t: string): PlanetPaletteName {
  const m: Record<string, PlanetPaletteName> = { rocky: 'earth', desert: 'desert', ice: 'ice', volcanic: 'lava', gas: 'gas' };
  return m[t] ?? 'earth';
}

type PlanetExtra = 'none' | 'rings' | 'belt' | 'rings_and_belt';
function getPlanetExtra(name: string): PlanetExtra {
  const v = hash(name + 'extra') % 10;
  if (v < 2) return 'rings';
  if (v < 4) return 'belt';
  if (v < 5) return 'rings_and_belt';
  return 'none';
}

function getMoonCount(name: string): number { return hash(name + 'moon') % 3; }
function planetSizeScale(name: string): number { return 0.55 + (hash(name) % 81) / 100; }

/* ── atmosphere colors ──────────────────────────── */

const ATM: Record<string, number> = {
  rocky: 0xa0a296, desert: 0xd4b896, ice: 0xbae6fd, volcanic: 0xfecaca, gas: 0xfef08a,
};

const RING_COL: Record<string, { inner: number; outer: number }> = {
  rocky: { inner: 0xc8c0b0, outer: 0x8a8478 },
  desert: { inner: 0xe8dcc8, outer: 0xa08060 },
  ice: { inner: 0xcffafe, outer: 0x67e8f9 },
  volcanic: { inner: 0xfca5a5, outer: 0x7f1d1d },
  gas: { inner: 0xfde68a, outer: 0x92400e },
};

const STAR_COLS = [
  { core: 0xfffef5, mid: 0xfde68a, glow: 0xf59e0b },
  { core: 0xfff8e7, mid: 0xfdba74, glow: 0xea580c },
  { core: 0xfef2f2, mid: 0xfca5a5, glow: 0xdc2626 },
  { core: 0xf0f9ff, mid: 0x7dd3fc, glow: 0x0ea5e9 },
];

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

/* ── texture cache ────────────────────────────── */

const TEX_SIZE = 128;
const texCache = new Map<string, HTMLCanvasElement>();

function getTexture(name: string, typeName: string, visualSeed?: number): HTMLCanvasElement {
  const key = `${name}-${typeName}-${visualSeed ?? 'h'}`;
  let t = texCache.get(key);
  if (t) return t;
  const seed = visualSeed !== undefined ? (visualSeed >>> 0) : hash(name + typeName);
  const h = hash(name + typeName);
  const h2 = hash(name + typeName + 'x');
  const h3 = hash(name + typeName + 'y');
  const h4 = hash(name + typeName + 'remap');
  t = generateProceduralPlanetTexture({
    size: TEX_SIZE, seed,
    noiseScale: 0.022 + (h % 1000) / 1000 * 0.058,
    octaves: 3 + (h % 3),
    lacunarity: 1.9 + (h2 % 25) / 100,
    persistence: 0.45 + (h3 % 25) / 100,
    palette: getProceduralPalette(typeName),
    clouds: (seed + 99991) % 3 === 0,
    cloudOpacity: 0.4,
    remapPower: 0.6 + (h4 % 41) / 100,
  });
  texCache.set(key, t);
  return t;
}

/* ── moon texture (simple gray noise) ─────────── */

function moonTexture(seed: number): HTMLCanvasElement {
  const s = 32;
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const v = 100 + ((((i * 73856093) ^ seed) >>> 0) % 100);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* ── ring geometry ────────────────────────────── */

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

/* ── 2D overlay (particles, effects) ─────────── */

const MAX_P = 30;
const BURST = 12;
const BURST_LUCKY = 24;
const P_LIFE = 0.6;
const FLASH_LIFE = 0.35;
const RIPPLE_LIFE = 0.55;
const RIPPLE_R = 70;
const SS_CHANCE = 0.032;
const SS_DUR = 0.9;
const SS_LEN = 120;
const SS_HIT = 28;

type Part = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color?: string };
type Flash = { x: number; y: number; life: number; maxLife: number; critical?: boolean };
type Ripple = { x: number; y: number; life: number; maxLife: number };
type SStar = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };

/* ── event overlay helpers (from MineZoneCanvas) ── */

function eventTint(ids: string[]): string | null {
  if (!ids.length) return null;
  const id = ids[0];
  const m: Record<string, string> = {
    'meteor-storm': 'rgba(234,88,12,0.12)', 'solar-flare': 'rgba(251,191,36,0.15)',
    'rich-vein': 'rgba(252,211,77,0.12)', 'void-bonus': 'rgba(124,58,237,0.18)',
    'lucky-strike': 'rgba(254,249,195,0.1)', 'asteroid-rush': 'rgba(245,158,11,0.12)',
    'solar-wind': 'rgba(14,165,233,0.1)', 'comet-tail': 'rgba(231,229,228,0.12)',
    'nebula-bloom': 'rgba(167,139,250,0.12)', 'dust-storm': 'rgba(120,113,108,0.2)',
    'solar-eclipse': 'rgba(30,27,75,0.25)', 'equipment-malfunction': 'rgba(185,28,28,0.15)',
    'power-drain': 'rgba(75,85,99,0.2)', 'communications-blackout': 'rgba(15,23,42,0.22)',
    'debris-field': 'rgba(71,85,105,0.18)',
  };
  return m[id] ?? null;
}

function eventPulse(t: number, ids: string[]): number {
  if (ids.includes('solar-flare') || ids.includes('lucky-strike')) return 0.7 + 0.3 * Math.sin(t * 3);
  if (ids.includes('nebula-bloom')) return 0.75 + 0.25 * Math.sin(t * 1.5);
  if (ids.includes('solar-eclipse') || ids.includes('communications-blackout')) return 0.8 + 0.2 * Math.sin(t * 2);
  return 1;
}

/* ─────────────────────────────────────────────── */
/* ── MAIN: createMineZone3D ───────────────────── */
/* ─────────────────────────────────────────────── */

export function createMineZone3D(
  container: HTMLElement,
  getSettings?: () => MineZoneSettings,
  getEventContext?: () => EventContext
): {
  update: (dt: number) => void;
  draw: () => void;
  onMineClick: (clientX?: number, clientY?: number, options?: { superLucky?: boolean; critical?: boolean }) => { hitShootingStar?: boolean };
  setPlanets: (planetViews: PlanetView[]) => void;
  resize: () => void;
} {
  let w = 0;
  let h = 0;

  /* ── three.js scene ─────────────────────────── */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 6, 10);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0c12, 1);
  renderer.domElement.className = 'mine-zone-canvas';
  renderer.domElement.setAttribute('aria-label', 'Spatial system view: solar systems and planets');
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  container.style.position = 'relative';
  container.appendChild(renderer.domElement);

  /* ambient + sun */
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sun = new THREE.DirectionalLight(0xfff8e7, 1.2);
  sun.position.set(5, 5, 5);
  scene.add(sun);

  /* starfield */
  const starN = 600;
  const starPos = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r = 60 + Math.random() * 40;
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    starPos[i * 3 + 2] = r * Math.cos(ph);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, sizeAttenuation: true })));

  /* ── 2D overlay canvas ──────────────────────── */
  const overlay = document.createElement('canvas');
  overlay.className = 'mine-zone-canvas';
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.pointerEvents = 'none';
  container.appendChild(overlay);
  let octx = overlay.getContext('2d');

  /* ── overlay state ──────────────────────────── */
  let particles: Part[] = [];
  const pool: Part[] = [];
  let flash: Flash | null = null;
  const ripples: Ripple[] = [];
  let shootingStar: SStar | null = null;
  let evtTime = 0;

  function getP(): Part { return pool.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2 }; }
  function relP(p: Part): void { if (pool.length < MAX_P) pool.push(p); }
  function burst(ox: number, oy: number, opts?: { superLucky?: boolean; critical?: boolean }): void {
    const n = Math.min(opts?.superLucky || opts?.critical ? BURST_LUCKY : BURST, MAX_P - particles.length);
    const sp = opts?.superLucky || opts?.critical ? 1.4 : 1;
    const sz = opts?.critical ? 1.5 : opts?.superLucky ? 1.2 : 1;
    const col = opts?.critical ? '#f87171' : opts?.superLucky ? '#fde047' : undefined;
    for (let i = 0; i < n; i++) {
      const p = getP();
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const s = (50 + Math.random() * 70) * sp;
      p.x = ox; p.y = oy; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - 30;
      p.life = P_LIFE; p.maxLife = P_LIFE; p.size = (1 + Math.random() * 1.5) * sz; p.color = col;
      particles.push(p);
    }
    if (opts?.superLucky || opts?.critical) flash = { x: ox, y: oy, life: FLASH_LIFE, maxLife: FLASH_LIFE, critical: opts.critical };
    if (ripples.length < 6) ripples.push({ x: ox, y: oy, life: RIPPLE_LIFE, maxLife: RIPPLE_LIFE });
  }

  function ssNear(px: number, py: number): boolean {
    if (!shootingStar) return false;
    const s = shootingStar;
    const spd = Math.hypot(s.vx, s.vy) || 1;
    const k = SS_LEN / spd;
    const ax = s.x - s.vx * k; const ay = s.y - s.vy * k;
    const bx = s.x; const by = s.y;
    const vx = bx - ax; const vy = by - ay;
    const wx = px - ax; const wy = py - ay;
    const c1 = wx * vx + wy * vy; const c2 = vx * vx + vy * vy;
    let cx: number; let cy: number;
    if (c1 <= 0) { cx = ax; cy = ay; } else if (c2 <= c1) { cx = bx; cy = by; }
    else { const t = c1 / c2; cx = ax + t * vx; cy = ay + t * vy; }
    return Math.hypot(px - cx, py - cy) <= SS_HIT;
  }

  /* ── 3D scene objects per solar system ──────── */
  type System3D = {
    group: THREE.Group;
    star: THREE.Mesh;
    starLight: THREE.PointLight;
    planets: Planet3D[];
  };
  type Planet3D = {
    group: THREE.Group;
    sphere: THREE.Mesh;
    atm: THREE.Mesh;
    moons: { mesh: THREE.Mesh; orbitR: number; speed: number; phase: number }[];
    orbitR: number;
    orbitSpeed: number;
    orbitPhase: number;
    view: PlanetView;
  };

  let systems3D: System3D[] = [];
  let orbitTime = 0;

  function clearSystems(): void {
    for (const sys of systems3D) {
      scene.remove(sys.group);
      sys.group.traverse((o) => {
        if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
        const mat = (o as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    }
    systems3D = [];
  }

  function buildSystems(views: PlanetView[][]): void {
    clearSystems();
    const nSys = views.length;
    const cols = Math.ceil(Math.sqrt(nSys));
    const spacing = nSys <= 1 ? 0 : 14;

    for (let si = 0; si < nSys; si++) {
      const col = si % cols;
      const row = Math.floor(si / cols);
      const ox = (col - (cols - 1) / 2) * spacing;
      const oz = (row - (Math.ceil(nSys / cols) - 1) / 2) * spacing;

      const group = new THREE.Group();
      group.position.set(ox, 0, oz);

      /* star */
      const starType = STAR_COLS[si % STAR_COLS.length];
      const starR = nSys <= 1 ? 0.6 : 0.45;
      const starGeo = new THREE.IcosahedronGeometry(starR, 3);
      const starMat = new THREE.MeshBasicMaterial({ color: starType.core });
      const star = new THREE.Mesh(starGeo, starMat);
      group.add(star);

      /* star glow sprite */
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = 64; glowCanvas.height = 64;
      const gc = glowCanvas.getContext('2d')!;
      const grd = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
      const glowCol = new THREE.Color(starType.glow);
      grd.addColorStop(0, `rgba(${Math.round(glowCol.r * 255)},${Math.round(glowCol.g * 255)},${Math.round(glowCol.b * 255)},0.6)`);
      grd.addColorStop(0.4, `rgba(${Math.round(glowCol.r * 255)},${Math.round(glowCol.g * 255)},${Math.round(glowCol.b * 255)},0.2)`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      gc.fillStyle = grd; gc.fillRect(0, 0, 64, 64);
      const glowTex = new THREE.CanvasTexture(glowCanvas);
      const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      glowSprite.scale.set(starR * 5, starR * 5, 1);
      group.add(glowSprite);

      const starLight = new THREE.PointLight(starType.glow, 2, 20);
      group.add(starLight);

      /* planets */
      const planets: Planet3D[] = [];
      const pViews = views[si];
      for (let pi = 0; pi < pViews.length; pi++) {
        const pv = pViews[pi];
        const typeName = getPlanetTypeName(pv.name);
        const scale = planetSizeScale(pv.name);
        const pr = 0.3 * scale;
        const orbitR = 2 + pi * 1.5;
        const orbitSpeed = 0.2 + pi * 0.05 + (si % 3) * 0.03;
        const orbitPhase = (pi * Math.PI * 2) / Math.max(pViews.length, 1) + si * 1.7;

        const pGroup = new THREE.Group();

        /* orbit line */
        const orbitCurve = new THREE.EllipseCurve(0, 0, orbitR, orbitR, 0, Math.PI * 2, false, 0);
        const orbitPts = orbitCurve.getPoints(64);
        const orbitLineGeo = new THREE.BufferGeometry().setFromPoints(orbitPts.map((p) => new THREE.Vector3(p.x, 0, p.y)));
        const orbitLine = new THREE.LineLoop(orbitLineGeo, new THREE.LineBasicMaterial({ color: 0x3a3f4d, transparent: true, opacity: 0.3 }));
        group.add(orbitLine);

        /* planet sphere */
        const texCanvas = getTexture(pv.name, typeName, pv.visualSeed);
        const tex = new THREE.CanvasTexture(texCanvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;

        const sphereGeo = new THREE.SphereGeometry(pr, 32, 32);
        const sphereMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.05 });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        pGroup.add(sphere);

        /* atmosphere */
        const atmCol = ATM[typeName] ?? 0xa0a296;
        const atmGeo = new THREE.SphereGeometry(pr * 1.08, 24, 24);
        const atmMat = new THREE.ShaderMaterial({
          vertexShader: atmVert, fragmentShader: atmFrag,
          uniforms: { uColor: { value: new THREE.Color(atmCol) }, uInt: { value: 1.2 } },
          transparent: true, side: THREE.FrontSide, depthWrite: false, blending: THREE.AdditiveBlending,
        });
        const atm = new THREE.Mesh(atmGeo, atmMat);
        pGroup.add(atm);

        /* rings */
        const extra = getPlanetExtra(pv.name);
        const rc = RING_COL[typeName] ?? RING_COL.rocky;
        if (extra === 'rings' || extra === 'rings_and_belt') {
          const rg = ringGeo(pr * 1.3, pr * 2, 64);
          const rm = new THREE.ShaderMaterial({
            vertexShader: ringVert, fragmentShader: ringFrag,
            uniforms: { uCI: { value: new THREE.Color(rc.inner) }, uCO: { value: new THREE.Color(rc.outer) }, uOp: { value: 0.5 } },
            transparent: true, side: THREE.DoubleSide, depthWrite: false,
          });
          const ring = new THREE.Mesh(rg, rm);
          /* Ring geometry is in XZ plane (equator); small X tilt so it stays visible and centered */
          ring.rotation.x = -0.35;
          pGroup.add(ring);
        }

        /* belt */
        if (extra === 'belt' || extra === 'rings_and_belt') {
          const beltN = 60;
          const beltR = extra === 'rings_and_belt' ? pr * 2.3 : pr * 1.6;
          const aGeo = new THREE.IcosahedronGeometry(0.02, 0);
          const aMat = new THREE.MeshStandardMaterial({ color: rc.outer, roughness: 0.9 });
          const inst = new THREE.InstancedMesh(aGeo, aMat, beltN);
          const dummy = new THREE.Object3D();
          for (let bi = 0; bi < beltN; bi++) {
            const angle = (bi / beltN) * Math.PI * 2;
            const r = beltR + (hash(pv.name + 'br' + bi) % 30) / 300 - 0.05;
            dummy.position.set(Math.cos(angle) * r, (hash(pv.name + 'by' + bi) % 20) / 400 - 0.025, Math.sin(angle) * r);
            const s = 0.5 + (hash(pv.name + 'bs' + bi) % 50) / 100;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            inst.setMatrixAt(bi, dummy.matrix);
          }
          inst.instanceMatrix.needsUpdate = true;
          const beltG = new THREE.Group();
          beltG.add(inst);
          beltG.rotation.x = Math.PI / 2 - 0.15;
          pGroup.add(beltG);
        }

        /* moons */
        const moonN = getMoonCount(pv.name);
        const moonObjs: Planet3D['moons'] = [];
        for (let mi = 0; mi < moonN; mi++) {
          const mr = pr * 0.2;
          const mor = pr * 2.5 + mi * pr * 1.2;
          const ms = 0.4 + (hash(pv.name + 'ms' + mi) % 30) / 100;
          const mp = (hash(pv.name + 'mp' + mi) % 100) / 100 * Math.PI * 2;
          const mSeed = hash(pv.name + 'moonseed' + mi);
          const mtc = moonTexture(mSeed);
          const mt = new THREE.CanvasTexture(mtc);
          const mGeo = new THREE.SphereGeometry(mr, 12, 12);
          const mMat = new THREE.MeshStandardMaterial({ map: mt, roughness: 0.95 });
          const mMesh = new THREE.Mesh(mGeo, mMat);
          pGroup.add(mMesh);
          moonObjs.push({ mesh: mMesh, orbitR: mor, speed: ms, phase: mp });
        }

        group.add(pGroup);
        planets.push({ group: pGroup, sphere, atm, moons: moonObjs, orbitR, orbitSpeed, orbitPhase, view: pv });
      }

      scene.add(group);
      systems3D.push({ group, star, starLight, planets });
    }

    /* adjust camera for number of systems (zoomed in a bit) */
    if (nSys <= 1) {
      camera.position.set(0, 4.5, 7.5);
    } else if (nSys <= 4) {
      camera.position.set(0, 10.5, 13.5);
    } else {
      camera.position.set(0, 17 + nSys * 1.6, 22 + nSys * 1.6);
    }
    camera.lookAt(0, 0, 0);
  }

  /* ── resize ─────────────────────────────────── */
  function resize(): void {
    const rect = container.getBoundingClientRect();
    w = rect.width; h = rect.height;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const dpr = window.devicePixelRatio ?? 1;
    overlay.width = w * dpr; overlay.height = h * dpr;
    overlay.style.width = `${w}px`; overlay.style.height = `${h}px`;
    octx = overlay.getContext('2d');
    if (octx) { octx.setTransform(1, 0, 0, 1, 0, 0); octx.scale(dpr, dpr); }
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  /* ── API ────────────────────────────────────── */
  return {
    update(dt: number) {
      orbitTime += dt * 0.35;
      evtTime += dt;

      /* update planet orbits */
      for (const sys of systems3D) {
        /* star pulse */
        const pulse = 1 + 0.03 * Math.sin(orbitTime * 2);
        sys.star.scale.set(pulse, pulse, pulse);

        for (const p of sys.planets) {
          const angle = orbitTime * p.orbitSpeed + p.orbitPhase;
          p.group.position.set(Math.cos(angle) * p.orbitR, 0, Math.sin(angle) * p.orbitR);
          p.sphere.rotation.y += dt * 0.3;
          p.atm.rotation.y = p.sphere.rotation.y;
          for (const m of p.moons) {
            const ma = orbitTime * m.speed + m.phase;
            m.mesh.position.set(Math.cos(ma) * m.orbitR, Math.sin(ma * 0.3) * 0.05, Math.sin(ma) * m.orbitR);
          }
        }
      }

      /* overlay effects */
      if (flash) { flash.life -= dt; if (flash.life <= 0) flash = null; }
      for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].life -= dt; if (ripples[i].life <= 0) ripples.splice(i, 1); }
      if (shootingStar) { shootingStar.life -= dt; shootingStar.x += shootingStar.vx * dt; shootingStar.y += shootingStar.vy * dt; if (shootingStar.life <= 0) shootingStar = null; }
      else if (w > 0 && h > 0 && Math.random() < SS_CHANCE * dt) {
        const side = Math.floor(Math.random() * 4);
        const spr = (Math.random() - 0.5) * 0.5;
        const spd = 380 + Math.random() * 120;
        let vx: number, vy: number, x: number, y: number;
        if (side === 0) { x = 0; y = h * Math.random(); vx = spd; vy = spd * spr; }
        else if (side === 1) { x = w * Math.random(); y = 0; vx = spd * spr; vy = spd; }
        else if (side === 2) { x = w; y = h * Math.random(); vx = -spd; vy = spd * spr; }
        else { x = w * Math.random(); y = h; vx = spd * spr; vy = -spd; }
        shootingStar = { x, y, vx, vy, life: SS_DUR, maxLife: SS_DUR };
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); relP(p); }
      }
    },

    draw() {
      if (w <= 0 || h <= 0) return;
      /* 3D */
      renderer.render(scene, camera);

      /* 2D overlay */
      if (!octx) return;
      octx.clearRect(0, 0, w, h);

      /* shooting star */
      if (shootingStar) {
        const s = shootingStar;
        const t = 1 - s.life / s.maxLife;
        const spd = Math.hypot(s.vx, s.vy) || 1;
        const k = SS_LEN / spd;
        const grd = octx.createLinearGradient(s.x - s.vx * k, s.y - s.vy * k, s.x, s.y);
        grd.addColorStop(0, 'rgba(255,255,255,0)');
        grd.addColorStop(0.5, 'rgba(255,252,240,0.25)');
        grd.addColorStop(1, 'rgba(255,255,255,0.85)');
        octx.save(); octx.globalAlpha = 1 - t * t; octx.strokeStyle = grd; octx.lineWidth = 2; octx.lineCap = 'round';
        octx.beginPath(); octx.moveTo(s.x - s.vx * k, s.y - s.vy * k); octx.lineTo(s.x, s.y); octx.stroke(); octx.restore();
      }

      /* particles */
      const accent = '#f59e0b';
      for (const p of particles) {
        const t = 1 - p.life / p.maxLife;
        octx.fillStyle = p.color ?? accent;
        octx.globalAlpha = 1 - t * t;
        octx.beginPath(); octx.arc(p.x, p.y, p.size, 0, Math.PI * 2); octx.fill();
      }
      octx.globalAlpha = 1;

      /* ripples */
      for (const r of ripples) {
        const t = 1 - r.life / r.maxLife;
        const rad = 12 + t * (RIPPLE_R - 12);
        octx.strokeStyle = '#4b5563'; octx.globalAlpha = 1 - t * 0.9; octx.lineWidth = 1.5;
        octx.beginPath(); octx.arc(r.x, r.y, rad, 0, Math.PI * 2); octx.stroke();
      }
      octx.globalAlpha = 1;

      /* flash */
      if (flash) {
        const t = 1 - flash.life / flash.maxLife;
        const r = 40 + t * 80;
        const grd = octx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, r);
        grd.addColorStop(0, flash.critical ? 'rgba(248,113,113,0.5)' : 'rgba(253,224,71,0.5)');
        grd.addColorStop(0.5, flash.critical ? 'rgba(248,113,113,0.4)' : 'rgba(253,224,71,0.35)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        octx.globalAlpha = 1 - t * t; octx.fillStyle = grd;
        octx.fillRect(flash.x - r, flash.y - r, r * 2, r * 2); octx.globalAlpha = 1;
      }

      /* event overlay */
      const eIds = getEventContext?.()?.activeEventIds ?? [];
      const tint = eventTint(eIds);
      if (tint) {
        const pulse = eventPulse(evtTime, eIds);
        const m = tint.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
        if (m) octx.fillStyle = `rgba(${m[1]},${m[2]},${m[3]},${(parseFloat(m[4] ?? '0.15') * pulse).toFixed(2)})`;
        else octx.fillStyle = tint;
        octx.fillRect(0, 0, w, h);
      }
    },

    onMineClick(clientX?: number, clientY?: number, options?: { superLucky?: boolean; critical?: boolean }): { hitShootingStar?: boolean } {
      const rect = container.getBoundingClientRect();
      const x = clientX != null ? clientX - rect.left : w / 2;
      const y = clientY != null ? clientY - rect.top : h / 2;
      const hitSS = clientX != null && clientY != null && ssNear(x, y);
      if (getSettings?.()?.clickParticles !== false) burst(x, y, options);
      return { hitShootingStar: hitSS };
    },

    setPlanets(planetViews: PlanetView[]) {
      const list = planetViews.map((p) => ({ ...p, upgradeCounts: { ...p.upgradeCounts } }));
      const groups: PlanetView[][] = [];
      for (let i = 0; i < list.length; i += PLANETS_PER_SOLAR_SYSTEM) {
        groups.push(list.slice(i, i + PLANETS_PER_SOLAR_SYSTEM));
      }
      /* only rebuild when planet count changes */
      const currentCount = systems3D.reduce((s, sys) => s + sys.planets.length, 0);
      if (currentCount !== list.length) buildSystems(groups);
    },

    resize,
  };
}
