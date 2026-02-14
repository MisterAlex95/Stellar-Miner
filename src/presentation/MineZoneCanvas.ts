const MAX_PARTICLES = 30;
const CLICK_BURST_COUNT = 12;
const CLICK_PARTICLE_LIFE = 0.6;

/** Planets per solar system (grouping for display). */
const PLANETS_PER_SOLAR_SYSTEM = 4;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

/** Per-planet data for the spatial view. */
export type PlanetView = {
  id: string;
  name: string;
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

export type MineZoneSettings = { showOrbitLines?: boolean; clickParticles?: boolean };
export type EventContext = { activeEventIds: string[] };

let getMineZoneSettings: (() => MineZoneSettings) | null = null;
let getMineZoneEventContext: (() => EventContext) | null = null;

const SURFACE_IDS = [
  'mining-robot', 'drill-mk1', 'drill-mk2', 'asteroid-rig',
  'orbital-station', 'deep-core-drill', 'stellar-harvester', 'quantum-extractor',
  'void-crusher', 'nexus-collector',
];
const SURFACE_COLORS: Record<string, string> = {
  'mining-robot': '#f59e0b',
  'drill-mk1': '#22c55e',
  'drill-mk2': '#3b82f6',
  'asteroid-rig': '#a78bfa',
  'orbital-station': '#06b6d4',
  'deep-core-drill': '#ec4899',
  'stellar-harvester': '#eab308',
  'quantum-extractor': '#8b5cf6',
  'void-crusher': '#7c3aed',
  'nexus-collector': '#4f46e5',
};
const SURFACE_SIZES: Record<string, number> = {
  'mining-robot': 2.5,
  'drill-mk1': 3,
  'drill-mk2': 3.5,
  'asteroid-rig': 4,
  'orbital-station': 4.5,
  'deep-core-drill': 5,
  'stellar-harvester': 5.5,
  'quantum-extractor': 6,
  'void-crusher': 6.5,
  'nexus-collector': 7,
};

function getThemeColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function getOrCreateParticle(): Particle {
  if (pool.length > 0) return pool.pop()!;
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2 };
}

function releaseParticle(p: Particle): void {
  if (pool.length < MAX_PARTICLES) pool.push(p);
}

function emitBurst(originX: number, originY: number): void {
  const count = Math.min(CLICK_BURST_COUNT, MAX_PARTICLES - particles.length);
  for (let i = 0; i < count; i++) {
    const p = getOrCreateParticle();
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 50 + Math.random() * 70;
    p.x = originX;
    p.y = originY;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 30;
    p.life = CLICK_PARTICLE_LIFE;
    p.maxLife = CLICK_PARTICLE_LIFE;
    p.size = 1 + Math.random() * 1.5;
    particles.push(p);
  }
}

function unitAngle(id: string, index: number): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return ((n + index) * 0.618) % 1 * Math.PI * 2;
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
  { core: '#fff8e7', mid: '#f59e0b', outer: '#b45309', inner: '#f59e0b' },
  { core: '#fff4d6', mid: '#ea580c', outer: '#c2410c', inner: '#fb923c' },
  { core: '#fef3c7', mid: '#dc2626', outer: '#991b1b', inner: '#f87171' },
  { core: '#e0f2fe', mid: '#0ea5e9', outer: '#0369a1', inner: '#7dd3fc' },
];

function drawStar(sx: number, sy: number, radius: number, systemIndex: number): void {
  if (!ctx) return;
  const type = STAR_TYPES[systemIndex % STAR_TYPES.length];
  const sizeScale = 0.9 + (hash(`star-${systemIndex}`) % 21) / 100;
  const r = radius * sizeScale;
  const grd = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r * 1.5);
  grd.addColorStop(0, type.core);
  grd.addColorStop(0.35, type.mid);
  grd.addColorStop(0.7, type.outer);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(sx, sy, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = type.inner;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Planet types with base colors (for shading) and gradient regions (noise → biomes, bevy_generative-style). */
const PLANET_GRADIENTS: Record<string, GradientStop[]> = {
  rocky: [
    { position: 0, color: '#44403c' },
    { position: 25, color: '#57534e' },
    { position: 50, color: '#78716c' },
    { position: 75, color: '#a8a29e' },
    { position: 100, color: '#d6d3d1' },
  ],
  desert: [
    { position: 0, color: '#78716c' },
    { position: 30, color: '#a8a29e' },
    { position: 60, color: '#d6d3d1' },
    { position: 85, color: '#e7e5e4' },
    { position: 100, color: '#fafaf9' },
  ],
  ice: [
    { position: 0, color: '#0c4a6e' },
    { position: 25, color: '#0ea5e9' },
    { position: 50, color: '#7dd3fc' },
    { position: 75, color: '#bae6fd' },
    { position: 100, color: '#e0f2fe' },
  ],
  volcanic: [
    { position: 0, color: '#450a0a' },
    { position: 25, color: '#7f1d1d' },
    { position: 50, color: '#dc2626' },
    { position: 75, color: '#f87171' },
    { position: 100, color: '#fecaca' },
  ],
  gas: [
    { position: 0, color: '#713f12' },
    { position: 25, color: '#a16207' },
    { position: 50, color: '#eab308' },
    { position: 75, color: '#fde047' },
    { position: 100, color: '#fef9c3' },
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

function getPlanetType(view: PlanetView, planetIndex: number): PlanetType {
  const idx = (hash(view.id) + planetIndex) % PLANET_TYPES.length;
  return PLANET_TYPES[idx];
}

const TEXTURE_SIZE = 128;
const textureCache = new Map<string, HTMLCanvasElement>();
const NOISE_SCALE_MIN = 0.022;
const NOISE_SCALE_RANGE = 0.058;

/** Per-planet random-ish params (deterministic from id) for more variation. */
function getPlanetNoiseParams(planetId: string, pType: PlanetType) {
  const h = hash(planetId + pType.name);
  const h2 = hash(planetId + pType.name + 'x');
  const h3 = hash(planetId + pType.name + 'y');
  const h4 = hash(planetId + pType.name + 'remap');
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

function getPlanetTexture(planetId: string, pType: PlanetType): HTMLCanvasElement {
  const key = `${planetId}-${pType.name}`;
  let tex = textureCache.get(key);
  if (tex) return tex;
  tex = createPlanetTexture(planetId, pType);
  textureCache.set(key, tex);
  return tex;
}

/** Generative planet texture: noise → gradient, with per-planet variation. */
function createPlanetTexture(planetId: string, pType: PlanetType): HTMLCanvasElement {
  const size = TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d')!;
  const seed = hash(planetId + pType.name);
  const params = getPlanetNoiseParams(planetId, pType);
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
      const r = match ? parseInt(match[1], 10) : 128;
      const g = match ? parseInt(match[2], 10) : 128;
      const b = match ? parseInt(match[3], 10) : 128;
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

/** Scale factor 0.85–1.15 from id. */
function planetSizeScale(view: PlanetView): number {
  return 0.85 + (hash(view.id) % 31) / 100;
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

  const pType = getPlanetType(view, planetIndex);
  const scale = planetSizeScale(view);
  const r = planetRadius * scale;

  const texture = getPlanetTexture(view.id, pType);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(texture, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.stroke();

  const accent = getThemeColor('--accent', '#f59e0b');
  const counts = view.upgradeCounts;
  const distFromCenter = r * 0.72;
  for (const id of SURFACE_IDS) {
    const count = counts[id] ?? 0;
    const color = SURFACE_COLORS[id] ?? accent;
    const size = Math.max(1.2, (SURFACE_SIZES[id] ?? 2.5) * (r / 28));
    for (let i = 0; i < count; i++) {
      const angle = unitAngle(view.id + id, i);
      const x = cx + Math.cos(angle) * distFromCenter;
      const y = cy + Math.sin(angle) * distFromCenter;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  const stationCount = counts['orbital-station'] ?? 0;
  const orbitRadius = r + 10;
  if (stationCount > 0) {
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < stationCount; i++) {
    const angle = orbitTime * 0.4 + (planetIndex * 0.7) + (i / Math.max(stationCount, 1)) * Math.PI * 2;
    const x = cx + Math.cos(angle) * orbitRadius;
    const y = cy + Math.sin(angle) * orbitRadius;
    ctx.fillStyle = accent;
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2.5, r * 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
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

  const starRadius = Math.min(systemW, systemH) * 0.08;
  drawStar(systemCenterX, systemCenterY, starRadius, systemIndex);

  const orbitRadiusBase = Math.min(systemW, systemH) * 0.22;
  const orbitSpacing = Math.min(systemW, systemH) * 0.08;
  const basePlanetRadius = Math.min(20, Math.min(systemW, systemH) * 0.06);
  const showOrbits = getMineZoneSettings?.()?.showOrbitLines !== false;
  const orbitDashed = systemIndex % 2 === 1;
  if (orbitDashed) ctx.setLineDash([4, 6]);

  for (let i = 0; i < systemPlanets.length; i++) {
    const orbitR = orbitRadiusBase + i * orbitSpacing;
    const direction = (hash(`dir-${systemIndex}-${i}`) % 2 === 0) ? 1 : -1;
    const speed = direction * (0.18 + (i * 0.08) + ((systemIndex % 3) * 0.04));
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
    const starR = Math.min(width, height) * 0.06;
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
    const planetR = Math.min(36, Math.min(width, height) * 0.12);
    drawOnePlanet(px, py, planetR, solarSystems[0][0], 0, 0);
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
  return null;
}

/** Pulsing intensity for overlay (0..1) for a subtle animation. */
function getEventOverlayPulse(time: number, ids: string[]): number {
  if (ids.includes('solar-flare') || ids.includes('lucky-strike')) {
    return 0.7 + 0.3 * Math.sin(time * 3);
  }
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
        ctx.fillStyle = accent;
        ctx.globalAlpha = 1 - t * t;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

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
    onMineClick(clientX?: number, clientY?: number) {
      if (getMineZoneSettings?.()?.clickParticles === false) return;
      const rect = container.getBoundingClientRect();
      const x = clientX != null ? clientX - rect.left : width / 2;
      const y = clientY != null ? clientY - rect.top : height / 2;
      emitBurst(x, y);
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
