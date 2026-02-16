/**
 * Binds settings form inputs to gameState. Reduces repetition in mount.
 */

import { getSettings, setSettings } from '../application/gameState.js';
import type { Settings } from '../settings.js';

type InputEl = HTMLInputElement | HTMLSelectElement | null;

function bindSelect(
  el: InputEl,
  key: keyof Settings,
  value: string | number,
  transform: (v: string) => string | number = (v) => v,
  onAfter?: () => void
): void {
  if (!el || !(el instanceof HTMLSelectElement)) return;
  el.value = String(value);
  el.addEventListener('change', () => {
    const s = getSettings();
    (s as Record<string, unknown>)[key] = transform(el.value);
    setSettings(s);
    onAfter?.();
  });
}

function bindCheckbox(el: InputEl, key: keyof Settings, checked: boolean, onAfter?: () => void): void {
  if (!el || !(el instanceof HTMLInputElement)) return;
  el.checked = checked;
  el.addEventListener('change', () => {
    const s = getSettings();
    (s as Record<string, unknown>)[key] = el.checked;
    setSettings(s);
    onAfter?.();
  });
}

/** Binds settings form inputs. Settings changes emit via settingsStore; wireSettingsSubscribers handles side effects. */
export function bindSettingsForm(): void {
  const s = getSettings();

  bindSelect(
    document.getElementById('setting-starfield-speed') as HTMLSelectElement,
    'starfieldSpeed',
    s.starfieldSpeed,
    Number
  );
  bindCheckbox(document.getElementById('setting-orbit-lines') as HTMLInputElement, 'showOrbitLines', s.showOrbitLines);
  bindCheckbox(document.getElementById('setting-click-particles') as HTMLInputElement, 'clickParticles', s.clickParticles);
  bindCheckbox(document.getElementById('setting-compact-numbers') as HTMLInputElement, 'compactNumbers', s.compactNumbers);
  bindCheckbox(document.getElementById('setting-space-key-repeat') as HTMLInputElement, 'spaceKeyRepeat', s.spaceKeyRepeat);
  bindSelect(
    document.getElementById('setting-layout') as HTMLSelectElement,
    'layout',
    s.layout,
    (v) => v as Settings['layout']
  );
  bindCheckbox(document.getElementById('setting-pause-background') as HTMLInputElement, 'pauseWhenBackground', s.pauseWhenBackground);
  bindSelect(
    document.getElementById('setting-theme') as HTMLSelectElement,
    'theme',
    s.theme,
    (v) => v as Settings['theme']
  );
  bindSelect(
    document.getElementById('setting-language') as HTMLSelectElement,
    'language',
    s.language,
    (v) => v as Settings['language']
  );
  bindCheckbox(document.getElementById('setting-sound') as HTMLInputElement, 'soundEnabled', s.soundEnabled);
  bindCheckbox(document.getElementById('setting-reduced-motion') as HTMLInputElement, 'reducedMotion', s.reducedMotion);
}
