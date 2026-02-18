import { computed } from 'vue';
import { getSession } from '../../application/gameState.js';
import { getUnlockedBlocks } from '../../application/progression.js';
import { t, type StringKey } from '../../application/strings.js';
import { useGameStateStore } from '../stores/gameState.js';

const SHORTCUTS: { tab: string; labelKey: StringKey }[] = [
  { tab: 'mine', labelKey: 'tabMine' },
  { tab: 'empire', labelKey: 'tabBase' },
  { tab: 'upgrades', labelKey: 'tabUpgrades' },
  { tab: 'research', labelKey: 'tabResearch' },
  { tab: 'stats', labelKey: 'tabStats' },
];

/** Reactive shortcut items for dashboard. Recomputes when session/unlocked changes. */
export function useDashboardShortcuts() {
  const store = useGameStateStore();

  return computed(() => {
    store.coins; // reactive dependency
    const s = getSession();
    if (!s) return [] as { tab: string; label: string }[];
    const unlocked = getUnlockedBlocks(s);
    return SHORTCUTS.filter((sc) => {
      if (sc.tab === 'empire') return unlocked.has('crew') || unlocked.has('planets') || unlocked.has('prestige');
      if (sc.tab === 'upgrades') return unlocked.has('upgrades');
      if (sc.tab === 'research') return unlocked.has('research');
      if (sc.tab === 'stats') return unlocked.has('upgrades');
      return true;
    }).map((sc) => ({ tab: sc.tab, label: t(sc.labelKey) }));
  });
}
