import { PLANETS_PER_SOLAR_SYSTEM } from '../application/solarSystems.js';

const MAX_PARTICLES = 30;
const CLICK_BURST_COUNT = 12;
const CLICK_BURST_LUCKY_COUNT = 24;
const CLICK_PARTICLE_LIFE = 0.6;
const CLICK_FLASH_LIFE = 0.35;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color?: string;
};

/** Per-planet data for the spatial view. name = raw (for texture/type); displayName = "Name (System)" for label. */
export type PlanetView = {
  id: string;
  name: string;
  displayName?: string;
  usedSlots: number;
  maxUpgrades: number;
  upgradeCounts: Record<string, number>;
};

type SolarSystemView = PlanetView[];

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D | null;
let particles: Particle[] = [];
let pool: Particle[] = [];
let width = 0;
let height = 0;
let solarSystems: SolarSystemView[] = [];
let orbitTime = 0;

type ClickFlash = { x: number; y: number; life: number; maxLife: number; critical?: boolean };
let clickFlash: ClickFlash | null = null;

export type MineZoneSettings = { showOrbitLines?: boolean; clickParticles?: boolean };
export type EventContext = { activeEventIds: string[] };

let getMineZoneSettings: (() => MineZoneSettings) | null = null;
let getMineZoneEventContext: (() => EventContext) | null = null;

function getThemeColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function getOrCreateParticle(): Particle {
  if (pool.length > 0) {
    const p = pool.pop()!;
    p.color = undefined;
    return p;
  }
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2 };
}

function releaseParticle(p: Particle): void {
  if (pool.length < MAX_PARTICLES) pool.push(p);
}

function emitBurst(
  originX: number,
  originY: number,
  options?: { superLucky?: boolean; critical?: boolean }
): void {
  const count = Math.min(
    options?.superLucky || options?.critical ? CLICK_BURST_LUCKY_COUNT : CLICK_BURST_COUNT,
    MAX_PARTICLES - particles.length
  );
  const speedMult = options?.superLucky || options?.critical ? 1.4 : 1;
  const sizeMult = options?.critical ? 1.5 : options?.superLucky ? 1.2 : 1;
  for (let i = 0; i < count; i++) {
    const p = getOrCreateParticle();
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = (50 + Math.random() * 70) * speedMult;
    p.x = originX;
    p.y = originY;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 30;
    p.life = CLICK_PARTICLE_LIFE;
    p.maxLife = CLICK_PARTICLE_LIFE;
    p.size = (1 + Math.random() * 1.5) * sizeMult;
    particles.push(p);
  }
  const burstColor = options?.critical ? '#f87171' : options?.superLucky ? '#fde047' : undefined;
  for (let i = particles.length - count; i < particles.length; i++) {
    particles[i].color = burstColor;
  }
  if (options?.superLucky || options?.critical) {
    clickFlash = {
      x: originX,
      y: originY,
      life: CLICK_FLASH_LIFE,
      maxLife: CLICK_FLASH_LIFE,
      critical: options.critical,
    };
  }
}

/** Deterministic hash from string for variety. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Seeded RNG (0..1) for procedural texture. Same seed = same sequence. */
function createSeededRng(seed: string): () => number {
  let state = hash(seed);
  return () => {
    state = (state * 1103515245 + 12345) >>> 0;
    return state / 0xffff_ffff;
  };
}

/** Deterministic value at integer lattice (0..1). */
function valueAt(seed: number, ix: number, iy: number): number {
  const n = (ix * 73856093) ^ (iy * 19349663) ^ seed;
  return ((n >>> 0) % 65536) / 65535;
}

/** Smoothstep for interpolation. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** 2D value noise (0..1), seeded. Scale controls feature size. */
function valueNoise2D(seed: number, x: number, y: number, scale: number): number {
  const sx = x * scale;
  const sy = y * scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;
  const u = smoothstep(fx);
  const v = smoothstep(fy);
  const v00 = valueAt(seed, ix, iy);
  const v10 = valueAt(seed, ix + 1, iy);
  const v01 = valueAt(seed, ix, iy + 1);
  const v11 = valueAt(seed, ix + 1, iy + 1);
  const a = v00 * (1 - u) + v10 * u;
  const b = v01 * (1 - u) + v11 * u;
  return a * (1 - v) + b * v;
}

/** FBM-style: multiple octaves for richer, more random-looking variation. */
function fbmNoise(
  seed: number,
  x: number,
  y: number,
  scale: number,
  octaves: number = 4,
  lacunarity: number = 2.1,
  persistence: number = 0.55
): number {
  let value = 0;
  let amplitude = 1;
  let freq = 1;
  let maxVal = 0;
  for (let o = 0; o < octaves; o++) {
    value += valueNoise2D(seed + o * 7919, x, y, scale * freq) * amplitude;
    maxVal += amplitude;
    amplitude *= persistence;
    freq *= lacunarity;
  }
  return Math.max(0, Math.min(1, value / maxVal));
}

/** Gradient stop: position 0-100, hex color. */
type GradientStop = { position: number; color: string };

function sampleGradient(stops: GradientStop[], t: number): string {
  const p = Math.max(0, Math.min(100, t));
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1].position < p) i++;
  if (i >= stops.length - 1) return stops[stops.length - 1].color;
  const a = stops[i];
  const b = stops[i + 1];
  const range = b.position - a.position;
  const f = range <= 0 ? 1 : (p - a.position) / range;
  const smooth = smoothstep(f);
  const parseHex = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  };
  const [r1, g1, b1] = parseHex(a.color);
  const [r2, g2, b2] = parseHex(b.color);
  const r = Math.round(r1 + (r2 - r1) * smooth);
  const g = Math.round(g1 + (g2 - g1) * smooth);
  const bl = Math.round(b1 + (b2 - b1) * smooth);
  return `rgb(${r},${g},${bl})`;
}

/** Star types: yellow, orange, red dwarf, white/blue. */
const STAR_TYPES = [
  { core: '#fffef5', mid: '#fde68a', outer: '#f59e0b', corona: 'rgba(251, 191, 36, 0.25)', glow: 'rgba(245, 158, 11, 0.12)' },
  { core: '#fff8e7', mid: '#fdba74', outer: '#ea580c', corona: 'rgba(249, 115, 22, 0.22)', glow: 'rgba(234, 88, 12, 0.1)' },
  { core: '#fef2f2', mid: '#fca5a5', outer: '#dc2626', corona: 'rgba(248, 113, 113, 0.2)', glow: 'rgba(220, 38, 38, 0.08)' },
  { core: '#f0f9ff', mid: '#7dd3fc', outer: '#0ea5e9', corona: 'rgba(56, 189, 248, 0.22)', glow: 'rgba(14, 165, 233, 0.1)' },
];

function drawStar(sx: number, sy: number, radius: number, systemIndex: number): void {
  if (!ctx) return;
  const type = STAR_TYPES[systemIndex % STAR_TYPES.length];
  const sizeScale = 0.92 + (hash(`star-${systemIndex}`) % 18) / 100;
  const r = radius * sizeScale;
  const glowR = r * 3.2;
  const coronaR = r * 2;
  const outerR = r * 1.4;
  ctx.save();
  const grdGlow = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, glowR);
  grdGlow.addColorStop(0, type.glow);
  grdGlow.addColorStop(0.4, type.glow);
  grdGlow.addColorStop(0.7, 'rgba(0,0,0,0)');
  grdGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grdGlow;
  ctx.beginPath();
  ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
  ctx.fill();
  const grdCorona = ctx.createRadialGradient(sx - r * 0.2, sy - r * 0.2, 0, sx, sy, coronaR);
  grdCorona.addColorStop(0, 'rgba(255,255,255,0.4)');
  grdCorona.addColorStop(0.15, type.corona);
  grdCorona.addColorStop(0.5, 'rgba(0,0,0,0)');
  grdCorona.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grdCorona;
  ctx.beginPath();
  ctx.arc(sx, sy, coronaR, 0, Math.PI * 2);
  ctx.fill();
  const grd = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, outerR);
  grd.addColorStop(0, type.core);
  grd.addColorStop(0.25, type.mid);
  grd.addColorStop(0.6, type.outer);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = type.core;
  ctx.globalAlpha = 0.98;
  ctx.beginPath();
  ctx.arc(sx, sy, r * 0.88, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Planet types with base colors (for shading) and gradient regions (noise → biomes). */
const PLANET_GRADIENTS: Record<string, GradientStop[]> = {
  rocky: [
    { position: 0, color: '#3c3836' },
    { position: 20, color: '#57534e' },
    { position: 45, color: '#78716c' },
    { position: 70, color: '#a8a29e' },
    { position: 90, color: '#d6d3d1' },
    { position: 100, color: '#e7e5e4' },
  ],
  desert: [
    { position: 0, color: '#6b5344' },
    { position: 25, color: '#a0826d' },
    { position: 50, color: '#d4b896' },
    { position: 75, color: '#e8dcc8' },
    { position: 100, color: '#f5f0e8' },
  ],
  ice: [
    { position: 0, color: '#0e3a52' },
    { position: 20, color: '#0c6b8a' },
    { position: 45, color: '#38b4d0' },
    { position: 70, color: '#7dd3fc' },
    { position: 100, color: '#bae6fd' },
  ],
  volcanic: [
    { position: 0, color: '#2d0a0a' },
    { position: 25, color: '#7f1d1d' },
    { position: 50, color: '#b91c1c' },
    { position: 75, color: '#f87171' },
    { position: 100, color: '#fecaca' },
  ],
  gas: [
    { position: 0, color: '#5c3d0f' },
    { position: 30, color: '#92400e' },
    { position: 55, color: '#ca8a04' },
    { position: 80, color: '#facc15' },
    { position: 100, color: '#fef08a' },
  ],
};

const PLANET_TYPES = [
  { light: '#78716c', mid: '#57534e', dark: '#44403c', name: 'rocky' },
  { light: '#d6d3d1', mid: '#a8a29e', dark: '#78716c', name: 'desert' },
  { light: '#e0f2fe', mid: '#7dd3fc', dark: '#0ea5e9', name: 'ice' },
  { light: '#fca5a5', mid: '#dc2626', dark: '#7f1d1d', name: 'volcanic' },
  { light: '#fde047', mid: '#eab308', dark: '#a16207', name: 'gas' },
];

type PlanetType = (typeof PLANET_TYPES)[0];

/** Planet type from name so stats and visuals match (same name = same type/color). */
function getPlanetTypeByName(planetName: string, planetIndex = 0): PlanetType {
  const idx = (hash(planetName) + planetIndex) % PLANET_TYPES.length;
  return PLANET_TYPES[idx];
}

const TEXTURE_SIZE = 128;
const textureCache = new Map<string, HTMLCanvasElement>();
const NOISE_SCALE_MIN = 0.022;
const NOISE_SCALE_RANGE = 0.058;

/** Per-planet random-ish params (deterministic from name) for more variation. */
function getPlanetNoiseParams(planetName: string, pType: PlanetType) {
  const h = hash(planetName + pType.name);
  const h2 = hash(planetName + pType.name + 'x');
  const h3 = hash(planetName + pType.name + 'y');
  const h4 = hash(planetName + pType.name + 'remap');
  return {
    scale: NOISE_SCALE_MIN + (h % 1000) / 1000 * NOISE_SCALE_RANGE,
    offsetX: (h2 % 20000) - 10000,
    offsetY: (h3 % 20000) - 10000,
    remapPower: 0.6 + (h4 % 41) / 100,
    octaves: 3 + (h % 3),
    lacunarity: 1.9 + (h2 % 25) / 100,
    persistence: 0.45 + (h3 % 25) / 100,
    mixSeed: h + 99999,
    mixAmount: 0.15 + (h4 % 20) / 100,
  };
}

function getPlanetTexture(planetName: string, pType: PlanetType): HTMLCanvasElement {
  const key = `${planetName}-${pType.name}`;
  let tex = textureCache.get(key);
  if (tex) return tex;
  tex = createPlanetTexture(planetName, pType);
  textureCache.set(key, tex);
  return tex;
}

/** Generative planet texture: noise → gradient, with per-planet variation. */
function createPlanetTexture(planetName: string, pType: PlanetType): HTMLCanvasElement {
  const size = TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d')!;
  const seed = hash(planetName + pType.name);
  const params = getPlanetNoiseParams(planetName, pType);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 0.5;
  const gradient = PLANET_GRADIENTS[pType.name] ?? PLANET_GRADIENTS.rocky;

  const imageData = c.createImageData(size, size);
  const data = imageData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = (px - cx) / maxR;
      const dy = (py - cy) / maxR;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) {
        data[(py * size + px) * 4 + 3] = 0;
        continue;
      }
      const nx = px + params.offsetX;
      const ny = py + params.offsetY;
      let noiseVal = fbmNoise(
        seed,
        nx,
        ny,
        params.scale,
        params.octaves,
        params.lacunarity,
        params.persistence
      );
      const mixNoise = valueNoise2D(params.mixSeed, nx * 0.07, ny * 0.07, params.scale * 1.7);
      noiseVal = noiseVal * (1 - params.mixAmount) + mixNoise * params.mixAmount;
      let t = Math.pow(Math.max(0, Math.min(1, noiseVal)), params.remapPower) * 100;
      const colorStr = sampleGradient(gradient, t);
      const match = colorStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
      let r = match ? parseInt(match[1], 10) : 128;
      let g = match ? parseInt(match[2], 10) : 128;
      let b = match ? parseInt(match[3], 10) : 128;
      const lighting = 0.5 + 0.5 * Math.max(0, 1 - (dx + 1) * 0.55);
      r = Math.round(r * lighting);
      g = Math.round(g * lighting);
      b = Math.round(b * lighting);
      const i = (py * size + px) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  c.putImageData(imageData, 0, 0);
  return canvas;
}

const MIN_PLANET_SCALE = 0.55;
const MAX_PLANET_SCALE = 1.35;

/** Scale factor from id so planets look clearly bigger or smaller. */
function planetSizeScale(view: PlanetView): number {
  return MIN_PLANET_SCALE + ((hash(view.name) % 81) / 100);
}

type PlanetExtra = 'none' | 'rings' | 'belt' | 'rings_and_belt';

function getPlanetExtra(planetName: string): PlanetExtra {
  const h = hash(planetName + 'extra');
  const v = h % 10;
  if (v < 2) return 'rings';
  if (v < 4) return 'belt';
  if (v < 5) return 'rings_and_belt';
  return 'none';
}

function drawPlanetRings(
  cx: number,
  cy: number,
  r: number,
  planetName: string,
  tiltScale: number = 1,
  targetCtx?: CanvasRenderingContext2D | null
): void {
  const c = targetCtx ?? ctx;
  if (!c) return;
  const isListView = targetCtx != null;
  const time = targetCtx ? 0 : orbitTime;
  const tilt = (hash(planetName + 'tilt') % 31) / 100 * tiltScale;
  const innerR = r * 1.15;
  const outerR = r * 1.5;
  c.save();
  c.translate(cx, cy);
  c.rotate(time * 0.05 + (hash(planetName) % 100) / 100);
  c.scale(1, Math.max(0.2, 0.38 - tilt));
  const grd = c.createRadialGradient(0, 0, innerR * 0.3, 0, 0, outerR);
  if (isListView) {
    grd.addColorStop(0, 'rgba(255, 252, 240, 0)');
    grd.addColorStop(0.35, 'rgba(235, 228, 210, 0.45)');
    grd.addColorStop(0.6, 'rgba(218, 205, 185, 0.5)');
    grd.addColorStop(0.85, 'rgba(190, 178, 160, 0.35)');
    grd.addColorStop(1, 'rgba(150, 140, 125, 0.12)');
  } else {
    grd.addColorStop(0, 'rgba(255, 252, 240, 0)');
    grd.addColorStop(0.35, 'rgba(230, 220, 200, 0.22)');
    grd.addColorStop(0.6, 'rgba(210, 195, 175, 0.28)');
    grd.addColorStop(0.85, 'rgba(180, 168, 150, 0.15)');
    grd.addColorStop(1, 'rgba(140, 130, 115, 0.04)');
  }
  c.fillStyle = grd;
  c.beginPath();
  c.arc(0, 0, outerR, 0, Math.PI * 2);
  c.arc(0, 0, innerR, 0, Math.PI * 2, true);
  c.fill();
  c.strokeStyle = isListView ? 'rgba(230, 218, 200, 0.65)' : 'rgba(220, 210, 190, 0.35)';
  c.lineWidth = isListView ? 1 : 0.6;
  c.beginPath();
  c.arc(0, 0, outerR, 0, Math.PI * 2);
  c.arc(0, 0, innerR, 0, Math.PI * 2, true);
  c.stroke();
  c.restore();
}

function drawPlanetBelt(
  cx: number,
  cy: number,
  r: number,
  planetName: string,
  targetCtx?: CanvasRenderingContext2D | null
): void {
  const c = targetCtx ?? ctx;
  if (!c) return;
  const isListView = targetCtx != null;
  const beltRadius = isListView ? r * 1.06 : r * 1.42;
  const count = isListView ? 18 + (hash(planetName + 'belt') % 8) : 28 + (hash(planetName + 'belt') % 12);
  const dotSize = Math.max(0.4, r * (isListView ? 0.045 : 0.032));
  const dim = getThemeColor('--text-dim', '#6b7280');
  const mid = getThemeColor('--border', '#4b5563');
  c.save();
  c.translate(cx, cy);
  c.rotate((hash(planetName) % 50) / 50);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (hash(planetName + String(i)) % 20) / 20 * 0.2;
    const x = Math.cos(angle) * beltRadius;
    const y = Math.sin(angle) * 0.26 * beltRadius;
    const size = dotSize * (0.7 + (hash(planetName + 's' + i) % 30) / 100);
    c.fillStyle = (hash(planetName + 'c' + i) % 4 === 0 ? mid : dim);
    c.globalAlpha = isListView ? 0.5 + (hash(planetName + 'a' + i) % 35) / 100 : 0.4 + (hash(planetName + 'a' + i) % 40) / 100;
    c.beginPath();
    c.arc(x, y, size, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.restore();
}

function drawOnePlanet(
  cx: number,
  cy: number,
  planetRadius: number,
  view: PlanetView,
  planetIndex: number,
  systemIndex: number
): void {
  const border = getThemeColor('--border', '#2a2f3d');
  if (!ctx) return;

  const pType = getPlanetTypeByName(view.name);
  const scale = planetSizeScale(view);
  const r = planetRadius * scale;

  const texture = getPlanetTexture(view.name, pType);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const spinAngle = orbitTime * 0.12 + (planetIndex + systemIndex) * 0.7;
  ctx.translate(cx, cy);
  ctx.rotate(spinAngle);
  ctx.translate(-cx, -cy);
  ctx.drawImage(texture, cx - r, cy - r, r * 2, r * 2);
  const specX = cx - r * 0.32;
  const specY = cy - r * 0.32;
  const specR = r * 0.28;
  const grdSpec = ctx.createRadialGradient(specX, specY, 0, specX, specY, specR);
  grdSpec.addColorStop(0, 'rgba(255,255,255,0.5)');
  grdSpec.addColorStop(0.4, 'rgba(255,255,255,0.12)');
  grdSpec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grdSpec;
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const extra = getPlanetExtra(view.name);
  if (extra === 'rings' || extra === 'rings_and_belt') drawPlanetRings(cx, cy, r, view.name);
  if (extra === 'belt' || extra === 'rings_and_belt') drawPlanetBelt(cx, cy, r, view.name);

  const labelY = cy - r - 6;
  const fontSize = Math.max(10, Math.min(14, r * 0.5));
  ctx.font = `${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = getThemeColor('--text-dim', '#8b909a');
  ctx.fillText(view.displayName ?? view.name, cx, labelY);
}

/** Draw only the planet sphere (texture + border) to a small canvas, e.g. for Base/Planets list tiles. Uses planet name for type/color. */
export function drawPlanetSphereToCanvas(canvas: HTMLCanvasElement, planetName: string): void {
  const targetCtx = canvas.getContext('2d');
  if (!targetCtx) return;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 1;
  const pType = getPlanetTypeByName(planetName);
  const texture = getPlanetTexture(planetName, pType);
  const border = getThemeColor('--border', '#2a2f3d');
  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
  targetCtx.clip();
  targetCtx.drawImage(texture, cx - r, cy - r, r * 2, r * 2);
  const specX = cx - r * 0.32;
  const specY = cy - r * 0.32;
  const specR = r * 0.28;
  const grdSpec = targetCtx.createRadialGradient(specX, specY, 0, specX, specY, specR);
  grdSpec.addColorStop(0, 'rgba(255,255,255,0.45)');
  grdSpec.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  grdSpec.addColorStop(1, 'rgba(255,255,255,0)');
  targetCtx.fillStyle = grdSpec;
  targetCtx.fill();
  targetCtx.restore();
  targetCtx.strokeStyle = border;
  targetCtx.lineWidth = 1;
  targetCtx.globalAlpha = 0.9;
  targetCtx.beginPath();
  targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
  targetCtx.stroke();
  targetCtx.globalAlpha = 1;
  const extra = getPlanetExtra(planetName);
  if (extra === 'rings' || extra === 'rings_and_belt') drawPlanetRings(cx, cy, r, planetName, 0.7, targetCtx);
  if (extra === 'belt' || extra === 'rings_and_belt') drawPlanetBelt(cx, cy, r, planetName, targetCtx);
}

/** Draw one solar system: star in center, planets in orbit. */
function drawSolarSystem(
  systemCenterX: number,
  systemCenterY: number,
  systemW: number,
  systemH: number,
  systemPlanets: PlanetView[],
  systemIndex: number
): void {
  if (!ctx || systemPlanets.length === 0) return;

  const starRadius = Math.min(systemW, systemH) * 0.14;
  drawStar(systemCenterX, systemCenterY, starRadius, systemIndex);
  const basePlanetRadius = starRadius * (0.65 / MAX_PLANET_SCALE);

  const orbitRadiusBase = Math.min(systemW, systemH) * 0.24;
  const orbitSpacing = Math.min(systemW, systemH) * 0.09;
  const showOrbits = getMineZoneSettings?.()?.showOrbitLines !== false;
  const orbitDashed = systemIndex % 2 === 1;
  if (orbitDashed) ctx.setLineDash([4, 6]);

  const orbitDirection = 1; // All planets orbit the same way
  for (let i = 0; i < systemPlanets.length; i++) {
    const orbitR = orbitRadiusBase + i * orbitSpacing;
    const speed = orbitDirection * (0.18 + (i * 0.08) + ((systemIndex % 3) * 0.04));
    const angle = orbitTime * speed + (i * Math.PI * 2) / Math.max(systemPlanets.length, 1);
    const px = systemCenterX + Math.cos(angle) * orbitR;
    const py = systemCenterY + Math.sin(angle) * orbitR;

    if (showOrbits) {
      ctx.strokeStyle = getThemeColor('--border', '#2a2f3d');
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(systemCenterX, systemCenterY, orbitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    drawOnePlanet(px, py, basePlanetRadius, systemPlanets[i], systemIndex * 10 + i, systemIndex);
  }

  ctx.setLineDash([]);
}

function drawSpatialSystem(): void {
  if (!ctx || width <= 0 || height <= 0) return;
  if (solarSystems.length === 0) return;

  const nSystems = solarSystems.length;
  const isSingle = nSystems === 1;

  if (isSingle && solarSystems[0].length === 1) {
    const cx = width / 2;
    const cy = height / 2;
    const starR = Math.min(width, height) * 0.12;
    drawStar(cx, cy, starR, 0);
    const orbitR = Math.min(width, height) * 0.28;
    const angle = orbitTime * 0.25;
    const px = cx + Math.cos(angle) * orbitR;
    const py = cy + Math.sin(angle) * orbitR;
    if (getMineZoneSettings?.()?.showOrbitLines !== false) {
      ctx.strokeStyle = getThemeColor('--border', '#2a2f3d');
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const basePlanetR = starR * (0.65 / MAX_PLANET_SCALE);
    drawOnePlanet(px, py, basePlanetR, solarSystems[0][0], 0, 0);
    return;
  }

  if (isSingle) {
    const system = solarSystems[0];
    drawSolarSystem(width / 2, height / 2, width, height, system, 0);
    return;
  }

  const cols = Math.ceil(Math.sqrt(nSystems));
  const rows = Math.ceil(nSystems / cols);
  const cellW = width / cols;
  const cellH = height / rows;

  for (let s = 0; s < nSystems; s++) {
    const col = s % cols;
    const row = Math.floor(s / cols);
    const sx = (col + 0.5) * cellW;
    const sy = (row + 0.5) * cellH;
    drawSolarSystem(sx, sy, cellW, cellH, solarSystems[s], s);
  }
}

/** Event-based tint overlay on the mine zone. */
function getEventOverlayStyle(ids: string[]): string | null {
  if (ids.length === 0) return null;
  const id = ids[0];
  if (id === 'meteor-storm') return 'rgba(234, 88, 12, 0.12)';
  if (id === 'solar-flare') return 'rgba(251, 191, 36, 0.15)';
  if (id === 'rich-vein') return 'rgba(252, 211, 77, 0.12)';
  if (id === 'void-bonus') return 'rgba(124, 58, 237, 0.18)';
  if (id === 'lucky-strike') return 'rgba(254, 249, 195, 0.1)';
  if (id === 'asteroid-rush') return 'rgba(245, 158, 11, 0.12)';
  if (id === 'solar-wind') return 'rgba(14, 165, 233, 0.1)';
  if (id === 'comet-tail') return 'rgba(231, 229, 228, 0.12)';
  if (id === 'nebula-bloom') return 'rgba(167, 139, 250, 0.12)';
  if (id === 'dust-storm') return 'rgba(120, 113, 108, 0.2)';
  if (id === 'solar-eclipse') return 'rgba(30, 27, 75, 0.25)';
  if (id === 'equipment-malfunction') return 'rgba(185, 28, 28, 0.15)';
  if (id === 'power-drain') return 'rgba(75, 85, 99, 0.2)';
  if (id === 'communications-blackout') return 'rgba(15, 23, 42, 0.22)';
  if (id === 'debris-field') return 'rgba(71, 85, 105, 0.18)';
  return null;
}

/** Pulsing intensity for overlay (0..1) for a subtle animation. */
function getEventOverlayPulse(time: number, ids: string[]): number {
  if (ids.includes('solar-flare') || ids.includes('lucky-strike')) {
    return 0.7 + 0.3 * Math.sin(time * 3);
  }
  if (ids.includes('nebula-bloom')) return 0.75 + 0.25 * Math.sin(time * 1.5);
  if (ids.includes('solar-eclipse') || ids.includes('communications-blackout')) return 0.8 + 0.2 * Math.sin(time * 2);
  return 1;
}

let eventOverlayTime = 0;

export function createMineZoneCanvas(
  container: HTMLElement,
  getSettings?: () => MineZoneSettings,
  getEventContext?: () => EventContext
): {
  update: (dt: number) => void;
  draw: () => void;
  onMineClick: (clientX?: number, clientY?: number) => void;
  setPlanets: (planetViews: PlanetView[]) => void;
  resize: () => void;
} {
  getMineZoneSettings = getSettings ?? null;
  getMineZoneEventContext = getEventContext ?? null;
  canvas = document.createElement('canvas');
  canvas.className = 'mine-zone-canvas';
  canvas.setAttribute('aria-label', 'Spatial system view: solar systems and planets');
  container.appendChild(canvas);
  ctx = canvas.getContext('2d');

  function resize(): void {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (ctx) ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (ctx) ctx.scale(dpr, dpr);
  }

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  return {
    update(dt: number) {
      orbitTime += dt * 0.35;
      eventOverlayTime += dt;
      if (clickFlash) {
        clickFlash.life -= dt;
        if (clickFlash.life <= 0) clickFlash = null;
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 80 * dt;
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          releaseParticle(p);
        }
      }
    },
    draw() {
      if (!ctx || width <= 0 || height <= 0) return;
      ctx.clearRect(0, 0, width, height);
      drawSpatialSystem();
      const accent = getThemeColor('--accent', '#f59e0b');
      for (const p of particles) {
        const t = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color ?? accent;
        ctx.globalAlpha = 1 - t * t;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (clickFlash && ctx) {
        const t = 1 - clickFlash.life / clickFlash.maxLife;
        const r = 40 + t * 80;
        const grd = ctx.createRadialGradient(
          clickFlash.x, clickFlash.y, 0,
          clickFlash.x, clickFlash.y, r
        );
        const color = clickFlash.critical ? 'rgba(248, 113, 113, 0.4)' : 'rgba(253, 224, 71, 0.35)';
        grd.addColorStop(0, clickFlash.critical ? 'rgba(248, 113, 113, 0.5)' : 'rgba(253, 224, 71, 0.5)');
        grd.addColorStop(0.5, color);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 1 - t * t;
        ctx.fillStyle = grd;
        ctx.fillRect(clickFlash.x - r, clickFlash.y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }

      const eventIds = getMineZoneEventContext?.()?.activeEventIds ?? [];
      const overlayStyle = getEventOverlayStyle(eventIds);
      if (overlayStyle && ctx) {
        const pulse = getEventOverlayPulse(eventOverlayTime, eventIds);
        const match = overlayStyle.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
        if (match) {
          const r = match[1];
          const g = match[2];
          const b = match[3];
          const a = (parseFloat(match[4] ?? '0.15') * pulse).toFixed(2);
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        } else {
          ctx.fillStyle = overlayStyle;
        }
        ctx.fillRect(0, 0, width, height);
      }
    },
    onMineClick(
      clientX?: number,
      clientY?: number,
      options?: { superLucky?: boolean; critical?: boolean }
    ) {
      if (getMineZoneSettings?.()?.clickParticles === false) return;
      const rect = container.getBoundingClientRect();
      const x = clientX != null ? clientX - rect.left : width / 2;
      const y = clientY != null ? clientY - rect.top : height / 2;
      emitBurst(x, y, options);
    },
    setPlanets(planetViews: PlanetView[]) {
      const list = planetViews.map((p) => ({ ...p, upgradeCounts: { ...p.upgradeCounts } }));
      solarSystems = [];
      for (let i = 0; i < list.length; i += PLANETS_PER_SOLAR_SYSTEM) {
        solarSystems.push(list.slice(i, i + PLANETS_PER_SOLAR_SYSTEM));
      }
    },
    resize,
  };
}
