<template>
  <div class="app-tabs-wrapper">
  <nav class="app-tabs vue-shell-tabs" role="tablist" :aria-label="t('gameSections')">
    <div ref="tabsScrollRef" class="app-tabs-scroll">
      <button
        v-for="tabId in tabIds"
        :key="tabId"
        v-show="store.tabs.visible[tabId]"
        type="button"
        class="app-tab"
        :class="{ 'app-tab--active': activeTab === tabId, 'app-tab--has-action': store.tabs.badges[tabId] }"
        role="tab"
        :id="`tab-${tabId}`"
        :aria-selected="activeTab === tabId"
        :aria-controls="`panel-${tabId}`"
        :data-tab="tabId"
        :title="tabLabel(tabId)"
        @click="goToTab(tabId)"
      >
        <span>{{ tabLabel(tabId) }}</span>
      </button>
    </div>
    <div
      class="app-tabs-more-wrap"
      :class="{ 'app-tabs-more-wrap--empty': !visibleOverflowCount }"
    >
      <button
        ref="tabMoreRef"
        type="button"
        class="app-tab app-tab-more"
        :class="{ 'app-tab-more--active': showActiveOnMore, 'app-tab-more--has-action': showHasActionOnMore }"
        id="tab-more"
        aria-haspopup="true"
        :aria-expanded="menuOpen"
        :aria-label="t('tabsMoreLabel')"
        @click="menuOpen = !menuOpen"
      >
        <span class="app-tab-more-dots">⋯</span>
      </button>
      <div
        ref="appTabsMenuRef"
        class="app-tabs-menu"
        id="app-tabs-menu"
        role="menu"
        aria-label=""
        :hidden="!menuOpen"
      >
        <button
          v-for="tabId in overflowTabIds"
          :key="tabId"
          v-show="store.tabs.visible[tabId]"
          type="button"
          class="app-tabs-menu-item"
          role="menuitem"
          :data-tab="tabId"
          :title="tabLabel(tabId)"
          :class="{ 'app-tabs-menu-item--active': activeTab === tabId, 'app-tabs-menu-item--has-action': store.tabs.badges[tabId] }"
          @click="goToTab(tabId); menuOpen = false"
        >
          {{ tabLabel(tabId) }}
        </button>
      </div>
    </div>
  </nav>
  <p class="keyboard-hint keyboard-hint--below-tabs" id="keyboard-hint" :aria-label="t('keyboardShortcutsHint')">
    <span class="key key--space">{{ t('keyboardShortcutsSpaceKey') }}</span>
    <span class="keyboard-hint-text">{{ t('keyboardShortcutsMine') }}</span>
    <span class="keyboard-hint-sep" aria-hidden="true">·</span>
    <span class="key" aria-hidden="true">1</span><span class="key" aria-hidden="true">2</span><span class="key" aria-hidden="true">3</span><span class="key" aria-hidden="true">4</span><span class="key" aria-hidden="true">5</span><span class="key" aria-hidden="true">6</span>
    <span class="keyboard-hint-text">{{ t('keyboardShortcutsTabs') }}</span>
  </p>
  <nav class="app-tabs-bottom vue-shell-tabs-bottom" id="app-tabs-bottom" :aria-label="t('gameSections')">
    <button
      v-for="tabId in bottomTabIds"
      :key="tabId"
      v-show="store.tabs.visible[tabId]"
      type="button"
      class="app-tab-bottom"
      :class="{ 'app-tab-bottom--active': activeTab === tabId, 'app-tab-bottom--has-action': store.tabs.badges[tabId] }"
      role="tab"
      :data-tab="tabId"
      :title="tabLabel(tabId)"
      :aria-selected="activeTab === tabId"
      @click="goToTab(tabId)"
    >
      <span>{{ tabLabel(tabId) }}</span>
    </button>
    <div
      ref="appTabsBottomMoreWrapRef"
      class="app-tabs-bottom-more-wrap"
      :class="{ 'app-tabs-bottom-more-wrap--empty': !visibleBottomOverflowCount }"
    >
      <button
        ref="tabBottomMoreRef"
        type="button"
        class="app-tab-bottom app-tab-bottom-more"
        :class="{ 'app-tab-bottom-more--active': showActiveOnBottomMore, 'app-tab-bottom-more--has-action': showHasActionOnBottomMore }"
        id="tab-bottom-more"
        aria-haspopup="true"
        :aria-expanded="bottomMenuOpen"
        :aria-label="t('tabsMoreLabel')"
        @click="bottomMenuOpen = !bottomMenuOpen"
      >
        <span class="app-tab-more-dots">⋯</span>
      </button>
      <div
        ref="appTabsBottomMenuRef"
        class="app-tabs-bottom-menu"
        id="app-tabs-bottom-menu"
        role="menu"
        aria-label=""
        :hidden="!bottomMenuOpen"
      >
        <button
          v-for="tabId in bottomOverflowTabIds"
          :key="tabId"
          v-show="store.tabs.visible[tabId]"
          type="button"
          class="app-tabs-bottom-menu-item"
          role="menuitem"
:data-tab="tabId"
          :title="tabLabel(tabId)"
          :class="{ 'app-tabs-bottom-menu-item--active': activeTab === tabId, 'app-tabs-bottom-menu-item--has-action': store.tabs.badges[tabId] }"
          @click="goToTab(tabId); bottomMenuOpen = false"
        >
          {{ tabLabel(tabId) }}
        </button>
      </div>
    </div>
  </nav>
</div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { t } from '../application/strings.js';
import { useGameStateStore } from './stores/gameState.js';
import { switchTab, pushTabState, VALID_TAB_IDS, HISTORY_STATE_KEY, type TabId } from './tabs.js';

const TAB_LABELS: Record<TabId, string> = {
  mine: 'tabMine',
  dashboard: 'tabDashboard',
  empire: 'tabBase',
  research: 'tabResearch',
  upgrades: 'tabUpgrades',
  stats: 'tabStats',
  archive: 'codexTitle',
};

const store = useGameStateStore();
const menuOpen = ref(false);
const bottomMenuOpen = ref(false);
const tabMoreRef = ref<HTMLElement | null>(null);
const tabBottomMoreRef = ref<HTMLElement | null>(null);
const appTabsMenuRef = ref<HTMLElement | null>(null);
const appTabsBottomMenuRef = ref<HTMLElement | null>(null);
const appTabsBottomMoreWrapRef = ref<HTMLElement | null>(null);
const tabsScrollRef = ref<HTMLElement | null>(null);
/** Which tab ids are currently visible inside the top tab scroll area (layout-based). */
const tabVisibleInScroll = reactive<Record<string, boolean>>({});

const activeTab = computed(() => store.activeTab);
const tabIds = VALID_TAB_IDS as unknown as TabId[];
const overflowTabIds = ['dashboard', 'empire', 'research', 'upgrades', 'stats', 'archive'] as const;
const bottomTabIds = ['mine', 'empire'] as const;
const bottomOverflowTabIds = ['dashboard', 'research', 'upgrades', 'stats', 'archive'] as const;

const visibleOverflowCount = computed(() =>
  overflowTabIds.filter((id) => store.tabs.visible[id]).length,
);
const visibleBottomOverflowCount = computed(() =>
  bottomOverflowTabIds.filter((id) => store.tabs.visible[id]).length,
);
const hasActionInOverflow = computed(() =>
  overflowTabIds.some((id) => store.tabs.visible[id] && store.tabs.badges[id]),
);
const hasActionInBottomOverflow = computed(() =>
  bottomOverflowTabIds.some((id) => store.tabs.visible[id] && store.tabs.badges[id]),
);
const isActiveTabInOverflow = computed(() =>
  (overflowTabIds as readonly string[]).includes(store.activeTab),
);
const isActiveTabInBottomOverflow = computed(() =>
  (bottomOverflowTabIds as readonly string[]).includes(store.activeTab),
);

/** Active tab is in overflow list AND actually hidden in scroll (not visible in bar) */
const isActiveTabActuallyInOverflow = computed(() => {
  if (!isActiveTabInOverflow.value) return false;
  const visible = tabVisibleInScroll[store.activeTab];
  return visible === false;
});
/** At least one overflow tab has a badge AND is actually hidden in scroll */
const hasActionActuallyInOverflow = computed(() =>
  overflowTabIds.some(
    (id) =>
      store.tabs.visible[id] &&
      store.tabs.badges[id] &&
      tabVisibleInScroll[id] === false,
  ),
);
/** Only show orange on "..." when the overflow menu has items and active tab is hidden in it */
const showActiveOnMore = computed(
  () => visibleOverflowCount.value > 0 && isActiveTabActuallyInOverflow.value,
);
/** Only show green on "..." when a tab that is actually hidden has a badge */
const showHasActionOnMore = computed(
  () => visibleOverflowCount.value > 0 && hasActionActuallyInOverflow.value,
);
const showActiveOnBottomMore = computed(
  () => visibleBottomOverflowCount.value > 0 && isActiveTabInBottomOverflow.value,
);
const showHasActionOnBottomMore = computed(
  () => visibleBottomOverflowCount.value > 0 && hasActionInBottomOverflow.value,
);

function tabLabel(tabId: string): string {
  const key = TAB_LABELS[tabId as TabId] ?? 'tabMine';
  return t(key as Parameters<typeof t>[0]);
}

function goToTab(tabId: string): void {
  pushTabState(tabId);
  switchTab(tabId);
}

function onDocumentClick(e: MouseEvent): void {
  const target = e.target as Node;
  if (menuOpen.value && tabMoreRef.value && !tabMoreRef.value.contains(target) && appTabsMenuRef.value && !appTabsMenuRef.value.contains(target)) {
    menuOpen.value = false;
  }
  if (bottomMenuOpen.value && tabBottomMoreRef.value && !tabBottomMoreRef.value.contains(target) && appTabsBottomMoreWrapRef.value && !appTabsBottomMoreWrapRef.value.contains(target) && appTabsBottomMenuRef.value && !appTabsBottomMenuRef.value.contains(target)) {
    bottomMenuOpen.value = false;
  }
}

function onDocumentKeydown(e: KeyboardEvent): void {
  if (e.code === 'Escape') {
    if (menuOpen.value) {
      menuOpen.value = false;
      tabMoreRef.value?.focus();
    }
    if (bottomMenuOpen.value) {
      bottomMenuOpen.value = false;
      tabBottomMoreRef.value?.focus();
    }
    return;
  }
  const key = e.key;
  if (key !== '1' && key !== '2' && key !== '3' && key !== '4' && key !== '5' && key !== '6') return;
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.closest('[role="dialog"]'))) return;
  const idx = parseInt(key, 10) - 1;
  const tabId = VALID_TAB_IDS[idx];
  if (tabId) goToTab(tabId);
}

function onPopState(e: PopStateEvent): void {
  const tabId = e.state?.[HISTORY_STATE_KEY];
  if (tabId && VALID_TAB_IDS.includes(tabId as TabId)) goToTab(tabId);
}

let scrollObserver: IntersectionObserver | null = null;

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
  window.addEventListener('popstate', onPopState);

  const scrollEl = tabsScrollRef.value;
  if (scrollEl) {
    scrollObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).getAttribute('data-tab');
          if (id) tabVisibleInScroll[id] = entry.isIntersecting;
        }
      },
      { root: scrollEl, rootMargin: '0px', threshold: 0 },
    );
    scrollEl.querySelectorAll<HTMLElement>('[data-tab]').forEach((el) => scrollObserver?.observe(el));
  }
});
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onDocumentKeydown);
  window.removeEventListener('popstate', onPopState);
  scrollObserver?.disconnect();
  scrollObserver = null;
});
</script>

<style scoped>
.keyboard-hint {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-align: center;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.25em 0.35em;
  line-height: 1.4;
  user-select: none;
}

.keyboard-hint--below-tabs {
  margin: 0.35rem 0 1rem 0;
}

@media (hover: none), (pointer: coarse) {
  .keyboard-hint {
    display: none;
  }
}

.keyboard-hint-text {
  color: var(--text-dim);
}

.keyboard-hint-sep {
  color: var(--muted);
  font-weight: 600;
}

.key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35em;
  height: 1.35em;
  padding: 0 0.25em;
  font-size: 0.7em;
  font-weight: 600;
  font-family: 'Exo 2', sans-serif;
  color: var(--text-dim);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 1px 0 var(--border);
}

.key--space {
  min-width: 2.4em;
  font-size: 0.6em;
  letter-spacing: 0.02em;
}
</style>
