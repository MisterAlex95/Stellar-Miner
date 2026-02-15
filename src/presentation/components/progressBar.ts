/**
 * Progress bar HTML for quest, intro, and event countdown.
 */
export interface ProgressBarOptions {
  value?: number;
  min?: number;
  max?: number;
}

export function createProgressBar(barId: string, barClass: string, options: ProgressBarOptions = {}): string {
  const { value = 0, min = 0, max = 100 } = options;
  return `<div class="${barClass}" id="${barId}" role="progressbar" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${value}"></div>`;
}

export function createProgressBarWithWrap(
  wrapId: string,
  wrapClass: string,
  barId: string,
  barClass: string,
  wrapAriaHidden?: boolean
): string {
  const ariaHidden = wrapAriaHidden === true ? ' aria-hidden="true"' : '';
  const bar = createProgressBar(barId, barClass);
  return `<div class="${wrapClass}" id="${wrapId}"${ariaHidden}>\n${bar}\n        </div>`;
}
