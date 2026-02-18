/**
 * Statistics section: card and group HTML builders for the Statistics tab.
 */
import { escapeHtml } from './domUtils.js';
import { createLabelValueCard } from './builders.js';

export function createStatisticsCard(label: string, statId: string): string {
  return createLabelValueCard({
    label,
    valueHtml: '—',
    cardClass: 'statistics-card',
    labelClass: 'statistics-card-label',
    valueClass: 'statistics-card-value',
    statId,
  });
}

export interface StatisticsCardWideOptions {
  label: string;
  statId1: string;
  suffix: string;
  statId2: string;
}

/** Card with two values and a suffix between them (e.g. "5 / 10"). */
export function createStatisticsCardWide(options: StatisticsCardWideOptions): string {
  const { label, statId1, suffix, statId2 } = options;
  return `
    <div class="statistics-card statistics-card--wide">
      <span class="statistics-card-label">${escapeHtml(label)}</span>
      <span class="statistics-card-value" data-stat-id="${escapeHtml(statId1)}">—</span>
      <span class="statistics-card-suffix">${escapeHtml(suffix)}</span>
      <span class="statistics-card-value" data-stat-id="${escapeHtml(statId2)}">—</span>
    </div>`;
}

export function createStatisticsGroup(
  titleId: string,
  titleLabel: string,
  cardsHtml: string,
  dataStatGroup: string
): string {
  return `
    <section class="statistics-group" aria-labelledby="${escapeHtml(titleId)}" data-stat-group="${escapeHtml(dataStatGroup)}">
      <h3 id="${escapeHtml(titleId)}" class="statistics-group-title">${escapeHtml(titleLabel)}</h3>
      <div class="statistics-cards">${cardsHtml}</div>
    </section>`;
}
