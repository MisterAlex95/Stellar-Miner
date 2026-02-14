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
let getMineZoneSettings: (() => MineZoneSettings) | null = null;

const SURFACE_IDS = ['mining-robot', 'drill-mk1', 'drill-mk2', 'asteroid-rig'];
const SURFACE_COLORS: Record<string, string> = {
  'mining-robot': '#f59e0b',
  'drill-mk1': '#22c55e',
  'drill-mk2': '#3b82f6',
  'asteroid-rig': '#a78bfa',
};
const SURFACE_SIZES: Record<string, number> = {
  'mining-robot': 2.5,
  'drill-mk1': 3,
  'drill-mk2': 3.5,
  'asteroid-rig': 4,
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

/** Planet types: rocky, desert, ice, volcanic, gas (striped). */
const PLANET_TYPES = [
  { light: '#78716c', mid: '#57534e', dark: '#44403c', name: 'rocky' },
  { light: '#d6d3d1', mid: '#a8a29e', dark: '#78716c', name: 'desert' },
  { light: '#e0f2fe', mid: '#7dd3fc', dark: '#0ea5e9', name: 'ice' },
  { light: '#fca5a5', mid: '#dc2626', dark: '#7f1d1d', name: 'volcanic' },
  { light: '#fde047', mid: '#eab308', dark: '#a16207', name: 'gas' },
];

function getPlanetType(view: PlanetView, planetIndex: number): (typeof PLANET_TYPES)[0] {
  const idx = (hash(view.id) + planetIndex) % PLANET_TYPES.length;
  return PLANET_TYPES[idx];
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
  const grd = ctx.createRadialGradient(
    cx - r * 0.4,
    cy - r * 0.4,
    0,
    cx,
    cy,
    r * 1.2
  );
  grd.addColorStop(0, pType.light);
  grd.addColorStop(0.45, pType.mid);
  grd.addColorStop(1, pType.dark);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
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
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 0.6;
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
      ctx.globalAlpha = 0.3;
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

export function createMineZoneCanvas(container: HTMLElement, getSettings?: () => MineZoneSettings): {
  update: (dt: number) => void;
  draw: () => void;
  onMineClick: (clientX?: number, clientY?: number) => void;
  setPlanets: (planetViews: PlanetView[]) => void;
  resize: () => void;
} {
  getMineZoneSettings = getSettings ?? null;
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
