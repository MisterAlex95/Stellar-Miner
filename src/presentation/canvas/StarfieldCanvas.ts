const LAYERS = 3;
const STARS_PER_LAYER = [80, 50, 30];
const SPEED_PER_LAYER = [8, 25, 60];
const MAX_SIZE_PER_LAYER = [1, 1.5, 2];
const OPACITY_PER_LAYER = [0.4, 0.7, 1];

type Star = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  layer: number;
  phase: number;
  driftSpeed: number;
};

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D | null;
let stars: Star[] = [];
let width = 0;
let height = 0;

function initStars(): void {
  stars = [];
  for (let layer = 0; layer < LAYERS; layer++) {
    const count = STARS_PER_LAYER[layer] ?? 50;
    const speed = SPEED_PER_LAYER[layer] ?? 20;
    const maxSize = MAX_SIZE_PER_LAYER[layer] ?? 1.5;
    const opacity = OPACITY_PER_LAYER[layer] ?? 0.8;
    const driftRange = 4 + layer * 6;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * (width || window.innerWidth),
        y: Math.random() * (height || window.innerHeight),
        size: 0.3 + Math.random() * maxSize,
        opacity: opacity * (0.6 + Math.random() * 0.4),
        speed,
        layer,
        phase: Math.random() * Math.PI * 2,
        driftSpeed: (Math.random() - 0.5) * driftRange,
      });
    }
  }
}

function resize(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  if (!canvas) return;
  const dpr = window.devicePixelRatio ?? 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);
  initStars();
}

export type StarfieldSettings = { starfieldSpeed?: number };

export type EventContext = { activeEventIds: string[] };

function getEventSpeedMult(ids: string[]): number {
  let mult = 1;
  if (ids.includes('meteor-storm')) mult *= 1.4;
  if (ids.includes('void-bonus')) mult *= 0.8;
  if (ids.includes('solar-flare')) mult *= 1.15;
  if (ids.includes('asteroid-rush')) mult *= 1.2;
  if (ids.includes('solar-wind')) mult *= 1.05;
  if (ids.includes('comet-tail')) mult *= 1.25;
  if (ids.includes('nebula-bloom')) mult *= 0.9;
  return mult;
}

function getEventTwinkleMult(ids: string[]): number {
  if (ids.includes('lucky-strike')) return 1.5;
  return 1;
}

function getEventColors(ids: string[], baseAccent: string, baseDim: string): [string, string, string] {
  let c0 = baseDim;
  let c1 = baseDim;
  let c2 = baseAccent;
  if (ids.includes('meteor-storm')) {
    c0 = '#6b2d2d';
    c1 = '#9a3a3a';
    c2 = '#ea580c';
  } else if (ids.includes('solar-flare')) {
    c0 = '#a8a29e';
    c1 = '#fbbf24';
    c2 = '#fef3c7';
  } else if (ids.includes('rich-vein')) {
    c0 = '#78716c';
    c1 = '#d4a574';
    c2 = '#fcd34d';
  } else if (ids.includes('void-bonus')) {
    c0 = '#312e81';
    c1 = '#4c1d95';
    c2 = '#7c3aed';
  } else if (ids.includes('lucky-strike')) {
    c0 = baseDim;
    c1 = '#fde047';
    c2 = '#fef9c3';
  } else if (ids.includes('asteroid-rush')) {
    c0 = '#422006';
    c1 = '#b45309';
    c2 = '#f59e0b';
  } else   if (ids.includes('solar-wind')) {
    c0 = '#1e3a5f';
    c1 = '#0ea5e9';
    c2 = '#7dd3fc';
  } else if (ids.includes('comet-tail')) {
    c0 = '#1c1917';
    c1 = '#a8a29e';
    c2 = '#e7e5e4';
  } else if (ids.includes('nebula-bloom')) {
    c0 = '#4c1d95';
    c1 = '#a78bfa';
    c2 = '#e9d5ff';
  }
  return [c0, c1, c2];
}

export function startStarfield(
  getSettings?: () => StarfieldSettings,
  getEventContext?: () => EventContext,
  appElement?: HTMLElement | null
): { update: (dt: number) => void; draw: () => void; resize: () => void } {
  canvas = document.createElement('canvas');
  canvas.id = 'starfield-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const app = appElement ?? document.getElementById('app');
  if (app?.parentNode) {
    app.parentNode.insertBefore(canvas, app);
  } else {
    document.body.appendChild(canvas);
  }
  resize();
  window.addEventListener('resize', resize);

  const speedMult = () => getSettings?.()?.starfieldSpeed ?? 1;
  return {
    update(dt: number) {
      const w = width || window.innerWidth;
      const h = height || window.innerHeight;
      const baseMult = speedMult();
      const eventIds = getEventContext?.()?.activeEventIds ?? [];
      const eventSpeed = getEventSpeedMult(eventIds);
      const mult = baseMult * eventSpeed;
      for (const star of stars) {
        star.y += star.speed * mult * dt;
        star.x += star.driftSpeed * mult * dt;
        const twinkleRate = getEventTwinkleMult(eventIds);
        star.phase += dt * (2 + star.layer) * twinkleRate;
        if (star.y > h) {
          star.y = 0;
          star.x = Math.random() * w;
        }
        if (star.y < 0) {
          star.y = h;
          star.x = Math.random() * w;
        }
        if (star.x < 0 || star.x > w) star.x = (star.x + w) % w;
      }
    },
    draw() {
      if (!ctx || !canvas) return;
      const w = width || window.innerWidth;
      const h = height || window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f59e0b';
      const textDim = getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim() || '#8b909a';
      const eventIds = getEventContext?.()?.activeEventIds ?? [];
      const colors = getEventColors(eventIds, accent, textDim);
      for (const star of stars) {
        const color = colors[star.layer] ?? textDim;
        const twinkleMult = getEventTwinkleMult(eventIds);
        const twinkle = 0.72 + 0.28 * Math.sin(star.phase) * twinkleMult;
        ctx.fillStyle = color;
        ctx.globalAlpha = star.opacity * twinkle;
        const size = star.size * (0.9 + 0.1 * Math.sin(star.phase * 1.3));
        ctx.beginPath();
        ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    resize,
  };
}

export function stopStarfield(api: { resize: () => void }): void {
  window.removeEventListener('resize', api.resize);
  canvas?.remove();
  canvas = null as unknown as HTMLCanvasElement;
  ctx = null;
  stars = [];
}
