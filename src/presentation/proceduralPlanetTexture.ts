/**
 * Procedural 2D planet texture generator (demo algorithm).
 * Square, seamless on X: water bias, ridges, mountains (earth), type variation (desert/ice/lava), clouds.
 * Used for all planets in the game; export via blob or data URL.
 */

export type PlanetPaletteName = 'earth' | 'desert' | 'ice' | 'lava' | 'gas';

export type ProceduralPlanetParams = {
  size?: number;
  seed?: number;
  noiseScale?: number;
  octaves?: number;
  lacunarity?: number;
  persistence?: number;
  palette?: PlanetPaletteName;
  clouds?: boolean;
  cloudOpacity?: number;
  cloudScale?: number;
  cloudThreshold?: number;
  cloudSoft?: number;
  remapPower?: number;
  waterBias?: number;
  ridgeAmount?: number;
  mountainStrength?: number;
  warpStr?: number;
  tintStr?: number;
};

const DEFAULT_PARAMS: Required<ProceduralPlanetParams> = {
  size: 1024,
  seed: 12345,
  noiseScale: 0.008,
  octaves: 4,
  lacunarity: 2.1,
  persistence: 0.55,
  palette: 'earth',
  clouds: false,
  cloudOpacity: 0.35,
  cloudScale: 0.45,
  cloudThreshold: 0.35,
  cloudSoft: 0.25,
  remapPower: 0.7,
  waterBias: 0.14,
  ridgeAmount: 0.14,
  mountainStrength: 45,
  warpStr: 22,
  tintStr: 6,
};

type GradientStop = { position: number; color: string };

const PALETTES: Record<PlanetPaletteName, GradientStop[]> = {
  earth: [
    { position: 0, color: '#0a0f1a' }, { position: 4, color: '#0f172a' }, { position: 10, color: '#1e3a5f' },
    { position: 18, color: '#1e40af' }, { position: 26, color: '#1d4ed8' }, { position: 34, color: '#2563eb' },
    { position: 40, color: '#3b82f6' }, { position: 44, color: '#60a5fa' }, { position: 48, color: '#93c5fd' },
    { position: 50, color: '#0d9488' }, { position: 52, color: '#0f766e' }, { position: 55, color: '#15803d' },
    { position: 58, color: '#166534' }, { position: 62, color: '#22c55e' }, { position: 68, color: '#65a30d' },
    { position: 74, color: '#84cc16' }, { position: 80, color: '#a3e635' }, { position: 84, color: '#94a3b8' },
    { position: 88, color: '#64748b' }, { position: 92, color: '#475569' }, { position: 96, color: '#e2e8f0' }, { position: 100, color: '#f8fafc' },
  ],
  desert: [
    { position: 0, color: '#1c1917' }, { position: 5, color: '#292524' }, { position: 12, color: '#44403c' },
    { position: 18, color: '#57534e' }, { position: 24, color: '#78716c' }, { position: 30, color: '#a8a29e' },
    { position: 38, color: '#b45309' }, { position: 45, color: '#a0826d' }, { position: 52, color: '#ca8a04' },
    { position: 58, color: '#d4b896' }, { position: 65, color: '#e7d5b8' }, { position: 72, color: '#fde68a' },
    { position: 78, color: '#e8dcc8' }, { position: 84, color: '#fef3c7' }, { position: 90, color: '#f5f0e8' }, { position: 100, color: '#fefce8' },
  ],
  ice: [
    { position: 0, color: '#042f2e' }, { position: 6, color: '#0c4a6e' }, { position: 14, color: '#075985' },
    { position: 22, color: '#0e7490' }, { position: 30, color: '#0891b2' }, { position: 38, color: '#06b6d4' },
    { position: 46, color: '#22d3ee' }, { position: 54, color: '#67e8f9' }, { position: 62, color: '#a5f3fc' },
    { position: 70, color: '#cffafe' }, { position: 76, color: '#e0f2fe' }, { position: 82, color: '#bae6fd' },
    { position: 88, color: '#7dd3fc' }, { position: 94, color: '#f0f9ff' }, { position: 100, color: '#ecfeff' },
  ],
  lava: [
    { position: 0, color: '#000000' }, { position: 6, color: '#1c1917' }, { position: 14, color: '#451a03' },
    { position: 22, color: '#7f1d1d' }, { position: 30, color: '#991b1b' }, { position: 38, color: '#b91c1c' },
    { position: 46, color: '#dc2626' }, { position: 54, color: '#ea580c' }, { position: 62, color: '#f97316' },
    { position: 70, color: '#fb923c' }, { position: 78, color: '#fbbf24' }, { position: 86, color: '#fde047' },
    { position: 92, color: '#fef08a' }, { position: 100, color: '#fef9c3' },
  ],
  gas: [
    { position: 0, color: '#422006' }, { position: 30, color: '#92400e' }, { position: 55, color: '#ca8a04' },
    { position: 80, color: '#facc15' }, { position: 100, color: '#fef08a' },
  ],
};

function valueAt(seed: number, ix: number, iy: number): number {
  const n = (ix * 73856093) ^ (iy * 19349663) ^ seed;
  return ((n >>> 0) % 65536) / 65535;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function valueNoise2DSeamlessX(
  seed: number,
  x: number,
  y: number,
  scale: number,
  periodX: number
): number {
  const sx = x * scale;
  const sy = y * scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;
  const u = smoothstep(fx);
  const v = smoothstep(fy);
  const L = Math.max(1, Math.floor(periodX * scale));
  const mod = (a: number) => ((a % L) + L) % L;
  const v00 = valueAt(seed, mod(ix), iy);
  const v10 = valueAt(seed, mod(ix + 1), iy);
  const v01 = valueAt(seed, mod(ix), iy + 1);
  const v11 = valueAt(seed, mod(ix + 1), iy + 1);
  return (v00 * (1 - u) + v10 * u) * (1 - v) + (v01 * (1 - u) + v11 * u) * v;
}

function fbmSeamlessX(
  seed: number,
  x: number,
  y: number,
  scale: number,
  periodX: number,
  octaves: number,
  lacunarity: number,
  persistence: number
): number {
  let value = 0;
  let amp = 1;
  let freq = 1;
  let maxVal = 0;
  for (let o = 0; o < octaves; o++) {
    value += valueNoise2DSeamlessX(seed + o * 7919, x, y, scale * freq, periodX) * amp;
    maxVal += amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return Math.max(0, Math.min(1, value / maxVal));
}

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function samplePaletteRGB(palette: PlanetPaletteName, t: number): [number, number, number] {
  const p = clamp(t, 0, 100);
  const stops = PALETTES[palette] ?? PALETTES.earth;
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1].position < p) i++;
  if (i >= stops.length - 1) return parseHex(stops[stops.length - 1].color);
  const a = stops[i];
  const b = stops[i + 1];
  const range = b.position - a.position;
  const f = range <= 0 ? 1 : (p - a.position) / range;
  const s = smoothstep(f);
  const c1 = parseHex(a.color);
  const c2 = parseHex(b.color);
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * s),
    Math.round(c1[1] + (c2[1] - c1[1]) * s),
    Math.round(c1[2] + (c2[2] - c1[2]) * s),
  ];
}

const WATER_LEVEL = 48;

const TYPE_VAR: Record<PlanetPaletteName, { seedOffset: number; scale: number; amount: number }> = {
  earth: { seedOffset: 300, scale: 0.8, amount: 8 },
  desert: { seedOffset: 301, scale: 0.55, amount: 16 },
  ice: { seedOffset: 302, scale: 0.5, amount: 18 },
  lava: { seedOffset: 303, scale: 0.65, amount: 22 },
  gas: { seedOffset: 306, scale: 0.7, amount: 10 },
};

const TYPE_TINT: Record<PlanetPaletteName, { seedOffset: number; str: number; r: number; g: number; b: number }> = {
  earth: { seedOffset: 310, str: 4, r: 1, g: 1, b: 1 },
  desert: { seedOffset: 311, str: 14, r: 1.2, g: 0.6, b: -0.2 },
  ice: { seedOffset: 312, str: 10, r: -0.3, g: 1.2, b: 1.3 },
  lava: { seedOffset: 313, str: 12, r: 1, g: 0.9, b: 0.2 },
  gas: { seedOffset: 316, str: 5, r: 1, g: 1, b: 1 },
};

export function generateProceduralPlanetTexture(
  params: ProceduralPlanetParams = {}
): HTMLCanvasElement {
  const p = { ...DEFAULT_PARAMS, ...params };
  const size = p.size;
  const periodX = size;
  const seed = p.seed;
  const noiseScale = p.noiseScale;
  const palette = p.palette;

  const octaves = 5 + (seed % 2);
  const lacunarity = 1.82 + ((seed * 17) % 38) / 100;
  const persistence = 0.45 + ((seed * 13) % 28) / 100;
  const remapPower = p.remapPower;
  const waterBias = p.waterBias;
  const detailScale = noiseScale * (2.2 + (seed % 100) / 80);
  const detailSeed = seed + 99971;
  const mixAmount = 0.1 + ((seed * 11) % 20) / 100;
  const speckleScale = noiseScale * (4 + (seed % 7));
  const speckleSeed = seed + 123457;
  const ridgeScale = noiseScale * 1.2;
  const ridgeSeed = seed + 55555;
  const ridgeAmount = p.ridgeAmount;
  const elevationScale = noiseScale * 0.85;
  const elevationSeed = seed + 40499;
  const mountainStrength = p.mountainStrength;
  const warpScale = noiseScale * 0.9;
  const warpStr = p.warpStr;
  const warpSeedA = seed + 77777;
  const warpSeedB = seed + 88888;
  const microScale = noiseScale * 12;
  const microSeed = seed + 33333;
  const tintStr = p.tintStr;
  const tintSeed = seed + 11111;
  const cloudScale = noiseScale * p.cloudScale;
  const cloudSeed = seed + 222223;
  const cloudOpacity = p.clouds ? p.cloudOpacity : 0;
  const cloudThreshold = p.cloudThreshold;
  const cloudSoft = p.cloudSoft;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const warpX = valueNoise2DSeamlessX(warpSeedA, px, py, warpScale, periodX) * 2 - 1;
      const warpY = valueNoise2DSeamlessX(warpSeedB, px + 50, py, warpScale, periodX) * 2 - 1;
      const qx = px + warpStr * warpX;
      const qy = py + warpStr * warpY;

      let n =
        fbmSeamlessX(seed, qx, qy, noiseScale, periodX, octaves, lacunarity, persistence) * (1 - mixAmount) +
        fbmSeamlessX(detailSeed, qx + 100, qy, detailScale, periodX, 3, 2.2, 0.5) * mixAmount;
      n = clamp(n - waterBias, 0, 1);

      const ridge = valueNoise2DSeamlessX(ridgeSeed, px, py, ridgeScale, periodX);
      const ridgeVal = 1 - Math.abs(ridge * 2 - 1);
      n = n * (1 - ridgeAmount) + ridgeVal * ridgeAmount;

      const speckle = valueNoise2DSeamlessX(speckleSeed, px, py, speckleScale, periodX);
      const micro = valueNoise2DSeamlessX(microSeed, px, py, microScale, periodX);
      let t = Math.pow(clamp(n, 0, 1), remapPower) * 100;
      t = clamp(t + (speckle - 0.5) * 10 + (micro - 0.5) * 4, 0, 100);

      if (palette === 'earth' && t > WATER_LEVEL) {
        const elev = fbmSeamlessX(elevationSeed, px * 1.1, py, elevationScale, periodX, 4, 2.0, 0.55);
        const ridgeElev = 1 - Math.abs(valueNoise2DSeamlessX(elevationSeed + 1, px, py, elevationScale * 1.5, periodX) * 2 - 1);
        t = Math.min(100, t + (elev * 0.6 + ridgeElev * 0.4) * mountainStrength);
      }

      const typeVarCfg = TYPE_VAR[palette];
      const typeVar = fbmSeamlessX(
        seed + typeVarCfg.seedOffset,
        px,
        py,
        typeVarCfg.scale * noiseScale,
        periodX,
        3,
        2.1,
        0.5
      );
      t = clamp(t + (typeVar - 0.5) * typeVarCfg.amount, 0, 100);

      if (palette === 'ice') {
        const crack = 1 - Math.abs(valueNoise2DSeamlessX(seed + 304, px, py, noiseScale * 2.2, periodX) * 2 - 1);
        t = clamp(t - crack * 8, 0, 100);
      }
      if (palette === 'lava') {
        const flow = 1 - Math.abs(valueNoise2DSeamlessX(seed + 305, px, py, noiseScale * 1.1, periodX) * 2 - 1);
        t = clamp(t + flow * 12, 0, 100);
      }

      let [r, g, b] = samplePaletteRGB(palette, t);
      const tintCfg = TYPE_TINT[palette];
      const tint = valueNoise2DSeamlessX(tintSeed, px, py, noiseScale * 3, periodX) * 2 - 1;
      const typeTint = valueNoise2DSeamlessX(seed + tintCfg.seedOffset, px, py, noiseScale * 1.2, periodX) * 2 - 1;
      const tt = tint * tintStr + typeTint * tintCfg.str;
      r = Math.round(r + tt * tintCfg.r);
      g = Math.round(g + tt * tintCfg.g);
      b = Math.round(b + tt * tintCfg.b);

      if (cloudOpacity > 0) {
        const cloudNoise = fbmSeamlessX(cloudSeed, px, py, cloudScale, periodX, 4, 2.0, 0.5);
        const cloudAlpha = Math.max(0, (cloudNoise - cloudThreshold) / cloudSoft) * cloudOpacity;
        r = Math.round(r * (1 - cloudAlpha) + 248 * cloudAlpha);
        g = Math.round(g * (1 - cloudAlpha) + 252 * cloudAlpha);
        b = Math.round(b * (1 - cloudAlpha) + 255 * cloudAlpha);
      }

      const i = (py * size + px) * 4;
      data[i] = clamp(r, 0, 255);
      data[i + 1] = clamp(g, 0, 255);
      data[i + 2] = clamp(b, 0, 255);
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function exportProceduralPlanetAsBlob(params: ProceduralPlanetParams = {}): Promise<Blob> {
  const canvas = generateProceduralPlanetTexture(params);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png'
    );
  });
}

export function exportProceduralPlanetAsDataURL(params: ProceduralPlanetParams = {}): string {
  return generateProceduralPlanetTexture(params).toDataURL('image/png');
}

export function getHorizontalScrollOffset(
  timeMs: number,
  speedPxPerSec: number,
  textureWidth: number
): number {
  const totalPx = (timeMs / 1000) * speedPxPerSec;
  const frac = totalPx / textureWidth;
  const f = frac - Math.floor(frac);
  return (f < 0 ? f + 1 : f) * textureWidth;
}
