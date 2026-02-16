/**
 * Generic HTML builders for common UI patterns. Use for consistent card/badge structures.
 */
import { escapeHtml, escapeAttr } from './domUtils.js';

export interface LabelValueCardOptions {
  label: string;
  valueHtml: string;
  cardClass: string;
  labelClass: string;
  valueClass: string;
  valueId?: string;
  statId?: string;
}

/** Generic label + value card. Pass existing CSS classes (e.g. statistics-card, statistics-card-label). */
export function createLabelValueCard(options: LabelValueCardOptions): string {
  const { label, valueHtml, cardClass, labelClass, valueClass, valueId, statId } = options;
  const valueAttrs = [
    valueId ? `id="${escapeAttr(valueId)}"` : '',
    statId ? `data-stat-id="${escapeAttr(statId)}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `
    <div class="${escapeAttr(cardClass)}">
      <span class="${escapeAttr(labelClass)}">${escapeHtml(label)}</span>
      <span class="${escapeAttr(valueClass)}" ${valueAttrs}>${valueHtml}</span>
    </div>`;
}

export interface BadgeOptions {
  content: string;
  modifier?: 'positive' | 'negative' | 'neutral';
  dataAttr?: { key: string; value: string };
}

/** Generic badge with optional modifier class. */
export function createBadge(options: BadgeOptions): string {
  const { content, modifier, dataAttr } = options;
  const modClass = modifier ? ` badge--${modifier}` : '';
  const dataStr = dataAttr ? ` data-${escapeAttr(dataAttr.key)}="${escapeAttr(dataAttr.value)}"` : '';
  return `<span class="badge${modClass}"${dataStr}>${escapeHtml(content)}</span>`;
}
