import { ref } from 'vue';

const STORAGE_PREFIX = 'stellar-miner-collapsed-';

export const COLLAPSIBLE_SECTION_IDS = [
  'quest-section',
  'crew-section',
  'planets-section',
  'prestige-section',
  'research-section',
  'upgrades-section',
  'statistics-section',
  'dashboard-section',
] as const;

export type CollapsibleSectionId = (typeof COLLAPSIBLE_SECTION_IDS)[number];

function loadCollapsed(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (typeof localStorage === 'undefined') return out;
  for (const id of COLLAPSIBLE_SECTION_IDS) {
    out[id] = localStorage.getItem(STORAGE_PREFIX + id) === '1';
  }
  return out;
}

/** Collapse state for gameplay sections (PanelsShell). EmpireSection manages its own. */
export function useSectionCollapse() {
  const collapsed = ref<Record<string, boolean>>(loadCollapsed());

  function isCollapsed(sectionId: string): boolean {
    return collapsed.value[sectionId] === true;
  }

  function toggle(sectionId: string): void {
    const next = !collapsed.value[sectionId];
    collapsed.value = { ...collapsed.value, [sectionId]: next };
    try {
      localStorage.setItem(STORAGE_PREFIX + sectionId, next ? '1' : '0');
    } catch {
      // ignore
    }
  }

  return { isCollapsed, toggle };
}
