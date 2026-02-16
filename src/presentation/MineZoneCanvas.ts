import { PLANETS_PER_SOLAR_SYSTEM } from '../application/solarSystems.js';
import {
  generateProceduralPlanetTexture,
  getHorizontalScrollOffset,
  type PlanetPaletteName,
} from './proceduralPlanetTexture.js';

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

/** Per-planet data for the spatial view. name = raw (for texture/type). displayName is optional, not drawn on canvas. */
export type PlanetView = {
  id: string;
  name: string;
  displayName?: string;
  usedSlots: number;
  maxUpgrades: number;
  upgradeCounts: Record<string, number>;
  /** Seed for procedural texture; set at planet creation. */
  visualSeed?: number;
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

type ClickRipple = { x: number; y: number; life: number; maxLife: number };
const clickRipples: ClickRipple[] = [];
const RIPPLE_LIFE = 0.55;
const RIPPLE_MAX_R = 70;

type ShootingStar = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };
let shootingStar: ShootingStar | null = null;
const SHOOTING_STAR_CHANCE_PER_SEC = 0.032;
const SHOOTING_STAR_DURATION = 0.9;
const SHOOTING_STAR_LENGTH = 120;

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
  if (clickRipples.length < 6) {
    clickRipples.push({ x: originX, y: originY, life: RIPPLE_LIFE, maxLife: RIPPLE_LIFE });
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


/** Background: radial gradient (darker edges) + subtle nebula blobs. */
function drawBackground(): void {
  if (!ctx || width <= 0 || height <= 0) return;
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.max(width, height) * 0.85;
  const bg = getThemeColor('--bg-panel', '#1a1d24');
  const grd = ctx.createRadialGradient(cx, cy, maxR * 0.15, cx, cy, maxR);
  grd.addColorStop(0, bg);
  grd.addColorStop(0.5, bg);
  grd.addColorStop(1, 'rgba(10, 12, 18, 0.97)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.035 + 0.015 * Math.sin(orbitTime * 0.4);
  const nebulaSeed = 12345;
  for (let i = 0; i < 5; i++) {
    const nx = (valueAt(nebulaSeed, i, 0) * width * 0.6) + width * 0.2;
    const ny = (valueAt(nebulaSeed, 0, i) * height * 0.6) + height * 0.2;
    const nr = 80 + valueAt(nebulaSeed, i + 10, i) * 120;
    const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
    ng.addColorStop(0, 'rgba(120, 130, 180, 0.12)');
    ng.addColorStop(0.6, 'rgba(80, 90, 140, 0.04)');
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
  }
  ctx.restore();

  for (let f = 0; f < 12; f++) {
    const fx = (valueAt(3333, f, 0) * width * 1.2 - width * 0.1 + orbitTime * 8 + f * 20) % (width + 40) - 20;
    const fy = (valueAt(4444, 0, f) * height * 1.2 - height * 0.1 + orbitTime * 5 + f * 15) % (height + 40) - 20;
    ctx.fillStyle = getThemeColor('--text-dim', '#6b7280');
    ctx.globalAlpha = 0.15 + valueAt(5555, f, f) * 0.15;
    ctx.beginPath();
    ctx.arc(fx, fy, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawStar(sx: number, sy: number, radius: number, systemIndex: number): void {
  if (!ctx) return;
  const type = STAR_TYPES[systemIndex % STAR_TYPES.length];
  const sizeScale = 0.92 + (hash(`star-${systemIndex}`) % 18) / 100;
  const r = radius * sizeScale;
  const coronaPulse = 0.92 + 0.08 * Math.sin(orbitTime * 1.8 + systemIndex);
  const glowR = r * 3.2 * coronaPulse;
  const coronaR = r * 2 * coronaPulse;
  const outerR = r * 1.4;
  const twinkle = 0.88 + 0.12 * Math.sin(orbitTime * 2.2 + systemIndex);
  ctx.save();
  ctx.globalAlpha = twinkle;
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
  { light: '#78716c', mid: '#57534e', dark: '#44403c', name: 'rocky', atmosphere: 'rgba(160, 158, 150, 0.09)' },
  { light: '#d6d3d1', mid: '#a8a29e', dark: '#78716c', name: 'desert', atmosphere: 'rgba(212, 184, 150, 0.07)' },
  { light: '#e0f2fe', mid: '#7dd3fc', dark: '#0ea5e9', name: 'ice', atmosphere: 'rgba(186, 230, 253, 0.12)' },
  { light: '#fca5a5', mid: '#dc2626', dark: '#7f1d1d', name: 'volcanic', atmosphere: 'rgba(254, 202, 202, 0.07)' },
  { light: '#fde047', mid: '#eab308', dark: '#a16207', name: 'gas', atmosphere: 'rgba(254, 240, 138, 0.1)' },
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

function getProceduralPalette(typeName: string): PlanetPaletteName {
  const map: Record<string, PlanetPaletteName> = {
    rocky: 'earth',
    desert: 'desert',
    ice: 'ice',
    volcanic: 'lava',
    gas: 'gas',
  };
  return map[typeName] ?? 'earth';
}

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

function getPlanetTexture(planetName: string, pType: PlanetType, visualSeed?: number): HTMLCanvasElement {
  const key = `${planetName}-${pType.name}-${visualSeed ?? 'hash'}`;
  let tex = textureCache.get(key);
  if (tex) return tex;
  tex = createPlanetTexture(planetName, pType, visualSeed);
  textureCache.set(key, tex);
  return tex;
}

/** Procedural planet texture (demo algorithm): water, ridges, mountains, type variation, clouds. Seamless on X for scroll. */
function createPlanetTexture(planetName: string, pType: PlanetType, visualSeed?: number): HTMLCanvasElement {
  const seed = visualSeed !== undefined ? (visualSeed >>> 0) : hash(planetName + pType.name);
  const params = getPlanetNoiseParams(planetName, pType);
  const hasClouds = (seed + 99991) % 3 === 0;
  return generateProceduralPlanetTexture({
    size: TEXTURE_SIZE,
    seed,
    noiseScale: params.scale,
    octaves: params.octaves,
    lacunarity: params.lacunarity,
    persistence: params.persistence,
    palette: getProceduralPalette(pType.name),
    clouds: hasClouds,
    cloudOpacity: 0.4,
    remapPower: params.remapPower,
  });
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
  systemIndex: number,
  starCenterX: number,
  starCenterY: number,
  orbitIndex: number,
  systemPlanetsLength: number
): void {
  const border = getThemeColor('--border', '#2a2f3d');
  if (!ctx) return;

  const pType = getPlanetTypeByName(view.name);
  const scale = planetSizeScale(view);
  const orbitSizeFactor = 1 + 0.1 * (1 - orbitIndex / Math.max(1, systemPlanetsLength));
  const r = planetRadius * scale * orbitSizeFactor;

  const haloR = r * 1.35;
  const grdHalo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, haloR);
  grdHalo.addColorStop(0, 'rgba(255, 252, 240, 0.08)');
  grdHalo.addColorStop(0.5, 'rgba(200, 210, 230, 0.03)');
  grdHalo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grdHalo;
  ctx.beginPath();
  ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
  ctx.fill();

  const texture = getPlanetTexture(view.name, pType, view.visualSeed);
  const scrollSpeedPxPerSec = 22;
  const timeMs = orbitTime * 1000;
  const offsetX = getHorizontalScrollOffset(timeMs, scrollSpeedPxPerSec, texture.width);
  const twoR = r * 2;
  const texScale = twoR / texture.width;
  const baseX = cx - r - offsetX * texScale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const spinAngle = orbitTime * 0.12 + (planetIndex + systemIndex) * 0.7;
  ctx.translate(cx, cy);
  ctx.rotate(spinAngle);
  ctx.translate(-cx, -cy);
  ctx.drawImage(texture, 0, 0, texture.width, texture.height, baseX, cy - r, twoR, twoR);
  ctx.drawImage(texture, 0, 0, texture.width, texture.height, baseX + twoR, cy - r, twoR, twoR);
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

  const toStarX = starCenterX - cx;
  const toStarY = starCenterY - cy;
  const dist = Math.hypot(toStarX, toStarY) || 1;
  const sunDirX = toStarX / dist;
  const sunDirY = toStarY / dist;
  const d = r * 2.5;
  const oppositeToArrowX = cx - sunDirX * d;
  const oppositeToArrowY = cy - sunDirY * d;
  const arrowSideX = cx + sunDirX * d;
  const arrowSideY = cy + sunDirY * d;
  const grdTerminator = ctx.createLinearGradient(
    oppositeToArrowX,
    oppositeToArrowY,
    arrowSideX,
    arrowSideY
  );
  grdTerminator.addColorStop(0, 'rgba(0,0,0,1)');
  grdTerminator.addColorStop(0.25, 'rgba(0,0,0,0.95)');
  grdTerminator.addColorStop(0.38, 'rgba(0,0,0,0.75)');
  grdTerminator.addColorStop(0.5, 'rgba(0,0,0,0.25)');
  grdTerminator.addColorStop(0.62, 'rgba(0,0,0,0)');
  grdTerminator.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grdTerminator;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const atmColor = (pType as PlanetType & { atmosphere?: string }).atmosphere ?? 'rgba(200,210,230,0.08)';
  ctx.strokeStyle = atmColor;
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const moonCount = hash(view.name + 'moon') % 3;
  if (moonCount >= 1) {
    const moonOrbitR = r * 2.2;
    const moonR = r * 0.18;
    const moonAngle = orbitTime * 0.5 + (hash(view.name) % 100) / 100 * Math.PI * 2;
    const mx = cx + Math.cos(moonAngle) * moonOrbitR;
    const my = cy + Math.sin(moonAngle) * moonOrbitR;
    ctx.fillStyle = getThemeColor('--text-dim', '#6b7280');
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI * 2);
    ctx.fill();
    const toStarMx = starCenterX - mx;
    const toStarMy = starCenterY - my;
    const distM = Math.hypot(toStarMx, toStarMy) || 1;
    const sunDirMx = toStarMx / distM;
    const sunDirMy = toStarMy / distM;
    const dm = moonR * 2.5;
    const grdMoon = ctx.createLinearGradient(
      mx - sunDirMx * dm,
      my - sunDirMy * dm,
      mx + sunDirMx * dm,
      my + sunDirMy * dm
    );
    grdMoon.addColorStop(0, 'rgba(0,0,0,1)');
    grdMoon.addColorStop(0.35, 'rgba(0,0,0,0.5)');
    grdMoon.addColorStop(0.6, 'rgba(0,0,0,0)');
    grdMoon.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = grdMoon;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = getThemeColor('--border', '#4b5563');
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (moonCount >= 2) {
      const moonAngle2 = orbitTime * 0.35 + (hash(view.name + '2') % 100) / 100 * Math.PI * 2;
      const moonOrbitR2 = r * 1.6;
      const moonR2 = moonR * 0.7;
      const mx2 = cx + Math.cos(moonAngle2) * moonOrbitR2;
      const my2 = cy + Math.sin(moonAngle2) * moonOrbitR2;
      ctx.fillStyle = getThemeColor('--text-dim', '#6b7280');
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(mx2, my2, moonR2, 0, Math.PI * 2);
      ctx.fill();
      const toStarMx2 = starCenterX - mx2;
      const toStarMy2 = starCenterY - my2;
      const distM2 = Math.hypot(toStarMx2, toStarMy2) || 1;
      const sunDirMx2 = toStarMx2 / distM2;
      const sunDirMy2 = toStarMy2 / distM2;
      const dm2 = moonR2 * 2.5;
      const grdMoon2 = ctx.createLinearGradient(
        mx2 - sunDirMx2 * dm2,
        my2 - sunDirMy2 * dm2,
        mx2 + sunDirMx2 * dm2,
        my2 + sunDirMy2 * dm2
      );
      grdMoon2.addColorStop(0, 'rgba(0,0,0,1)');
      grdMoon2.addColorStop(0.35, 'rgba(0,0,0,0.5)');
      grdMoon2.addColorStop(0.6, 'rgba(0,0,0,0)');
      grdMoon2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.beginPath();
      ctx.arc(mx2, my2, moonR2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = grdMoon2;
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(mx2, my2, moonR2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const extra = getPlanetExtra(view.name);
  if (extra === 'rings' || extra === 'rings_and_belt') drawPlanetRings(cx, cy, r, view.name);
  if (extra === 'belt' || extra === 'rings_and_belt') drawPlanetBelt(cx, cy, r, view.name);

  const labelY = cy - r - 6;
  const fontSize = Math.max(10, Math.min(14, r * 0.5));
  ctx.font = `${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const labelColor = getThemeColor('--text-dim', '#8b909a');
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeText(view.name, cx, labelY);
  ctx.fillStyle = labelColor;
  ctx.fillText(view.name, cx, labelY);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = border;
}

const PLANET_SCROLL_SPEED_PX_PER_SEC = 10;

/**
 * Draw only the planet sphere (texture + border) to a small canvas, e.g. for Base/Planets list tiles.
 * When textureTimeMs is provided, texture scrolls horizontally (seamless) for 3D rotation effect.
 */
export function drawPlanetSphereToCanvas(
  canvas: HTMLCanvasElement,
  planetName: string,
  textureTimeMs?: number,
  visualSeed?: number
): void {
  const targetCtx = canvas.getContext('2d');
  if (!targetCtx) return;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 1;
  const pType = getPlanetTypeByName(planetName);
  const texture = getPlanetTexture(planetName, pType, visualSeed);
  const border = getThemeColor('--border', '#2a2f3d');
  const timeMs = textureTimeMs ?? 0;
  const offsetX = getHorizontalScrollOffset(timeMs, PLANET_SCROLL_SPEED_PX_PER_SEC, texture.width);
  const twoR = r * 2;
  const texScale = twoR / texture.width;
  const baseX = cx - r - offsetX * texScale;
  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
  targetCtx.clip();
  targetCtx.drawImage(texture, 0, 0, texture.width, texture.height, baseX, cy - r, twoR, twoR);
  targetCtx.drawImage(texture, 0, 0, texture.width, texture.height, baseX + twoR, cy - r, twoR, twoR);
  targetCtx.restore();
  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
  targetCtx.clip();
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

  const orbitRadiusBase = Math.min(systemW, systemH) * 0.32;
  const orbitSpacing = Math.min(systemW, systemH) * 0.11;
  const showOrbits = getMineZoneSettings?.()?.showOrbitLines !== false;
  const orbitDashed = systemIndex % 2 === 1;
  const orbitPhaseOffset = systemIndex * 1.7;
  if (orbitDashed) ctx.setLineDash([4, 6]);

  const borderColor = getThemeColor('--border', '#2a2f3d');
  const dimColor = getThemeColor('--text-dim', '#6b7280');
  const maxOrbitR = orbitRadiusBase + (systemPlanets.length - 1) * orbitSpacing;
  for (let d = 0; d < 14; d++) {
    const driftAngle = orbitTime * 0.12 + (systemIndex * 7 + d) * 0.44;
    const dist = orbitRadiusBase * 0.3 + (valueAt(7777 + systemIndex, d, 0) * (maxOrbitR - orbitRadiusBase * 0.3));
    const ax = systemCenterX + Math.cos(driftAngle + d) * dist;
    const ay = systemCenterY + Math.sin(driftAngle + d * 0.7) * dist * 0.4;
    ctx.fillStyle = dimColor;
    ctx.globalAlpha = 0.25 + (valueAt(8888 + systemIndex, d, 0) * 0.2);
    ctx.beginPath();
    ctx.arc(ax, ay, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const orbitDirection = 1;
  for (let i = 0; i < systemPlanets.length; i++) {
    const orbitR = orbitRadiusBase + i * orbitSpacing;
    const speed = orbitDirection * (0.18 + (i * 0.08) + ((systemIndex % 3) * 0.04));
    const angle = orbitTime * speed + orbitPhaseOffset + (i * Math.PI * 2) / Math.max(systemPlanets.length, 1);
    const px = systemCenterX + Math.cos(angle) * orbitR;
    const py = systemCenterY + Math.sin(angle) * orbitR;

    const trailLen = 14 + i * 3;
    const trailX = px - Math.cos(angle) * trailLen;
    const trailY = py - Math.sin(angle) * trailLen;
    const grdTrail = ctx.createLinearGradient(trailX, trailY, px, py);
    grdTrail.addColorStop(0, 'rgba(120, 125, 140, 0)');
    grdTrail.addColorStop(0.5, 'rgba(120, 125, 140, 0.12)');
    grdTrail.addColorStop(1, 'rgba(120, 125, 140, 0.2)');
    ctx.strokeStyle = grdTrail;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(trailX, trailY);
    ctx.lineTo(px, py);
    ctx.stroke();

    if (showOrbits) {
      const segs = 48;
      for (let s = 0; s < segs; s++) {
        const a0 = (s / segs) * Math.PI * 2;
        const a1 = ((s + 1) / segs) * Math.PI * 2;
        const t = s / segs;
        const bright = 0.55 - t * 0.25;
        ctx.strokeStyle = borderColor;
        ctx.globalAlpha = bright;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(systemCenterX, systemCenterY, orbitR, a0, a1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    drawOnePlanet(px, py, basePlanetRadius, systemPlanets[i], systemIndex * 10 + i, systemIndex, systemCenterX, systemCenterY, i, systemPlanets.length);
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
    const orbitR = Math.min(width, height) * 0.36;
    const angle = orbitTime * 0.25;
    const px = cx + Math.cos(angle) * orbitR;
    const py = cy + Math.sin(angle) * orbitR;
    const trailLen = 18;
    const trailX = px - Math.cos(angle) * trailLen;
    const trailY = py - Math.sin(angle) * trailLen;
    const grdTrail0 = ctx.createLinearGradient(trailX, trailY, px, py);
    grdTrail0.addColorStop(0, 'rgba(120, 125, 140, 0)');
    grdTrail0.addColorStop(0.5, 'rgba(120, 125, 140, 0.12)');
    grdTrail0.addColorStop(1, 'rgba(120, 125, 140, 0.2)');
    ctx.strokeStyle = grdTrail0;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(trailX, trailY);
    ctx.lineTo(px, py);
    ctx.stroke();
    if (getMineZoneSettings?.()?.showOrbitLines !== false) {
      const borderColor = getThemeColor('--border', '#2a2f3d');
      const segs = 48;
      for (let s = 0; s < segs; s++) {
        const t = s / segs;
        ctx.strokeStyle = borderColor;
        ctx.globalAlpha = 0.55 - t * 0.25;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, orbitR, (s / segs) * Math.PI * 2, ((s + 1) / segs) * Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const basePlanetR = starR * (0.65 / MAX_PLANET_SCALE);
    drawOnePlanet(px, py, basePlanetR, solarSystems[0][0], 0, 0, cx, cy, 0, 1);
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

  ctx.strokeStyle = 'rgba(60, 65, 80, 0.35)';
  ctx.lineWidth = 1;
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, height);
    ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(width, r * cellH);
    ctx.stroke();
  }
}

const SHOOTING_STAR_HIT_RADIUS = 28;

function getShootingStarSegment(): { tailX: number; tailY: number; headX: number; headY: number } | null {
  if (!shootingStar) return null;
  const s = shootingStar;
  const speed = Math.hypot(s.vx, s.vy) || 1;
  const k = SHOOTING_STAR_LENGTH / speed;
  return {
    tailX: s.x - s.vx * k,
    tailY: s.y - s.vy * k,
    headX: s.x,
    headY: s.y,
  };
}

function isPointNearShootingStar(px: number, py: number): boolean {
  const seg = getShootingStarSegment();
  if (!seg) return false;
  const { tailX: ax, tailY: ay, headX: bx, headY: by } = seg;
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = wx * vx + wy * vy;
  const c2 = vx * vx + vy * vy;
  let cx: number;
  let cy: number;
  if (c1 <= 0) {
    cx = ax;
    cy = ay;
  } else if (c2 <= c1) {
    cx = bx;
    cy = by;
  } else {
    const t = c1 / c2;
    cx = ax + t * vx;
    cy = ay + t * vy;
  }
  const dist = Math.hypot(px - cx, py - cy);
  return dist <= SHOOTING_STAR_HIT_RADIUS;
}

function drawShootingStar(): void {
  if (!ctx || !shootingStar) return;
  const s = shootingStar;
  const t = 1 - s.life / s.maxLife;
  const speed = Math.hypot(s.vx, s.vy) || 1;
  const k = SHOOTING_STAR_LENGTH / speed;
  const headX = s.x;
  const headY = s.y;
  const tailX = s.x - s.vx * k;
  const tailY = s.y - s.vy * k;
  const grd = ctx.createLinearGradient(tailX, tailY, headX, headY);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.5, 'rgba(255,252,240,0.25)');
  grd.addColorStop(1, 'rgba(255,255,255,0.85)');
  ctx.save();
  ctx.globalAlpha = 1 - t * t;
  ctx.strokeStyle = grd;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(headX, headY);
  ctx.stroke();
  ctx.restore();
}

function drawClickRipples(): void {
  if (!ctx) return;
  const border = getThemeColor('--border', '#4b5563');
  for (const rip of clickRipples) {
    const t = 1 - rip.life / rip.maxLife;
    const rad = 12 + t * (RIPPLE_MAX_R - 12);
    ctx.strokeStyle = border;
    ctx.globalAlpha = 1 - t * 0.9;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rip.x, rip.y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
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

/** Animated stripe pattern for certain events (solar-flare, solar-wind). */
function drawEventOverlayPattern(time: number, ids: string[]): void {
  if (!ctx || ids.length === 0) return;
  const id = ids[0];
  if (id !== 'solar-flare' && id !== 'solar-wind' && id !== 'comet-tail') return;
  const stripeSpacing = 28;
  const offset = (time * 45) % stripeSpacing;
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = id === 'solar-wind' ? '#7dd3fc' : id === 'comet-tail' ? '#e7e5e4' : '#fde68a';
  ctx.lineWidth = 2;
  for (let x = -offset; x < width + stripeSpacing; x += stripeSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height * 0.6, height);
    ctx.stroke();
  }
  ctx.restore();
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
      for (let i = clickRipples.length - 1; i >= 0; i--) {
        clickRipples[i].life -= dt;
        if (clickRipples[i].life <= 0) clickRipples.splice(i, 1);
      }
      if (shootingStar) {
        shootingStar.life -= dt;
        shootingStar.x += shootingStar.vx * dt;
        shootingStar.y += shootingStar.vy * dt;
        if (shootingStar.life <= 0) shootingStar = null;
      } else if (width > 0 && height > 0 && Math.random() < SHOOTING_STAR_CHANCE_PER_SEC * dt) {
        const side = Math.floor(Math.random() * 4);
        const spread = (Math.random() - 0.5) * 0.5;
        const speed = 380 + Math.random() * 120;
        let vx: number;
        let vy: number;
        let x: number;
        let y: number;
        if (side === 0) {
          x = 0;
          y = height * Math.random();
          vx = speed;
          vy = speed * spread;
        } else if (side === 1) {
          x = width * Math.random();
          y = 0;
          vx = speed * spread;
          vy = speed;
        } else if (side === 2) {
          x = width;
          y = height * Math.random();
          vx = -speed;
          vy = speed * spread;
        } else {
          x = width * Math.random();
          y = height;
          vx = speed * spread;
          vy = -speed;
        }
        shootingStar = { x, y, vx, vy, life: SHOOTING_STAR_DURATION, maxLife: SHOOTING_STAR_DURATION };
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
      drawBackground();
      const breath = 0.99 + 0.02 * Math.sin(orbitTime * 0.3);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(breath, breath);
      ctx.translate(-width / 2, -height / 2);
      drawSpatialSystem();
      ctx.restore();
      drawShootingStar();
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
      drawClickRipples();
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
        drawEventOverlayPattern(eventOverlayTime, eventIds);
      }
    },
    onMineClick(
      clientX?: number,
      clientY?: number,
      options?: { superLucky?: boolean; critical?: boolean }
    ): { hitShootingStar?: boolean } {
      const rect = container.getBoundingClientRect();
      const x = clientX != null ? clientX - rect.left : width / 2;
      const y = clientY != null ? clientY - rect.top : height / 2;
      const hitShootingStar = clientX != null && clientY != null && isPointNearShootingStar(x, y);
      if (getMineZoneSettings?.()?.clickParticles !== false) emitBurst(x, y, options);
      return { hitShootingStar };
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
