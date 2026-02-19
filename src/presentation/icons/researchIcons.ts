/**
 * Home-made SVG icons for research nodes. Stroke-based, 24×24, currentColor.
 */
export type ResearchIconKey =
  | 'miner'
  | 'scientist'
  | 'pilot'
  | 'medic'
  | 'engineer'
  | 'expedition'
  | 'click'
  | 'production'
  | 'refining'
  | 'neural'
  | 'secret'
  | 'research';

const VIEWBOX = '0 0 24 24';
const STROKE = 'currentColor';
const STROKE_WIDTH = 1.5;
const FILL = 'none';

export const researchIconSvgs: Record<ResearchIconKey, string> = {
  miner: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M14 4v6l4 8M10 4v6l-4 8M8 10h8M12 2v2"/>`,
  scientist: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M9 4v2a 2 2 0 0 0 6 0V4M8 8h8v8a 2 2 0 0 1-2 2h-4a 2 2 0 0 1-2-2V8z"/>`,
  pilot: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M12 2l2 8 4 1-3 3 1 4-4-2-4-2 1-4-3 4-1 2-8z"/>`,
  medic: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M12 4v16M7 11h10M12 7v8"/>`,
  engineer: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M12 4c-1.5 0-2.5 1.5-2 3l1 3 2 1 2-1 1-3c.5-1.5-.5-3-2-3zm0 10v4M8 18h8"/>`,
  expedition: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M12 2a 8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 5v3l2 2"/>`,
  click: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M9 8l2-4 2 4 3 .5-2.5 2.5.5 3-3-2-3 2-.5-3z"/>`,
  production: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M12 2l3 7 5 2-2 5-6 6-6-6-2-5 5-2 3-7z"/>`,
  refining: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M12 18a 4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-10v2m0 8v2"/>`,
  neural: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M8 10c0-2 1.5-4 4-4s4 2 4 4c0 2-1 3-4 5-3-2-4-3-4-5zm4 8v2M7 18h10"/>`,
  secret: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M12 2l1.5 6 6 1-4 4 1 6-4.5-3-4.5 3 1-6-4-4 6-1L12 2z"/>`,
  research: `<path fill="${FILL}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" d="M6 4h12v3H6zm0 5h8v1H6zm0 4h10v1H6z"/>`,
};

export function getResearchIconSvg(key: ResearchIconKey): string {
  const path = researchIconSvgs[key] ?? researchIconSvgs.research;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="24" height="24">${path}</svg>`;
}

/** Data URL for use in img src or canvas. Optional color replaces currentColor (e.g. for 3D textures). Optional bgColor adds a circular background (for 3D node discs). */
export function getResearchIconDataUrl(key: ResearchIconKey, color?: string, bgColor?: string): string {
  let svg = getResearchIconSvg(key);
  if (color) svg = svg.replace(/currentColor/g, color);
  if (bgColor) {
    const circle = `<circle cx="12" cy="12" r="12" fill="${bgColor}"/>`;
    svg = svg.replace(/<svg[^>]*>/, (m) => m + circle);
  }
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27');
  return `data:image/svg+xml,${encoded}`;
}
