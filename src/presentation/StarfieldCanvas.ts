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

export function startStarfield(getSettings?: () => StarfieldSettings): { update: (dt: number) => void; draw: () => void; resize: () => void } {
  canvas = document.createElement('canvas');
  canvas.id = 'starfield-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const app = document.getElementById('app');
  if (app && app.parentNode) {
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
      const mult = speedMult();
      for (const star of stars) {
        star.y += star.speed * mult * dt;
        star.x += star.driftSpeed * mult * dt;
        star.phase += dt * (2 + star.layer);
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
      const colors = [textDim, textDim, accent];
      for (const star of stars) {
        const color = colors[star.layer] ?? textDim;
        const twinkle = 0.72 + 0.28 * Math.sin(star.phase);
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
