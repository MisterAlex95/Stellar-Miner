const STORAGE_KEY = 'stellar-miner-settings';

export type LayoutMode = 'tabs' | 'one-page';

export type Settings = {
  starfieldSpeed: number;
  showOrbitLines: boolean;
  clickParticles: boolean;
  compactNumbers: boolean;
  spaceKeyRepeat: boolean;
  layout: LayoutMode;
};

const DEFAULTS: Settings = {
  starfieldSpeed: 1,
  showOrbitLines: true,
  clickParticles: true,
  compactNumbers: true,
  spaceKeyRepeat: false,
  layout: 'tabs',
};

export function loadSettings(): Settings {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
