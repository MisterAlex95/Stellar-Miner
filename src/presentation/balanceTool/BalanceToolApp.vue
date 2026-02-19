<template>
  <div class="balance-tool">
    <aside class="balance-sidebar">
      <div class="balance-sidebar-head">
        <h1 class="balance-title">Balance Tool</h1>
        <a href="/" class="balance-link">
          <span class="balance-link-icon" aria-hidden="true">◀</span>
          Open game
        </a>
        <input
          v-model="filterQuery"
          type="search"
          class="balance-filter"
          placeholder="Filter data…"
          aria-label="Filter data sources"
        />
      </div>
      <nav class="balance-nav" aria-label="Data source">
        <template v-for="group in filteredGroups" :key="group.label">
          <p v-if="group.label" class="balance-nav-group">{{ group.label }}</p>
          <button
            v-for="k in group.keys"
            :key="k"
            type="button"
            class="balance-nav-item"
            :class="{ 'balance-nav-item--active': selectedKey === k }"
            @click="selectedKey = k"
          >
            <span class="balance-nav-indicator" aria-hidden="true" />
            <span class="balance-nav-label">{{ k }}</span>
          </button>
        </template>
        <p v-if="filteredKeys.length === 0" class="balance-nav-empty">No match</p>
      </nav>
    </aside>

    <main class="balance-main">
      <header class="balance-toolbar">
        <span class="balance-toolbar-badge">{{ selectedKey }}</span>
        <div class="balance-toolbar-actions">
          <button type="button" class="balance-btn balance-btn--ghost" @click="reset" title="Reset to original">
            <span class="balance-btn-icon" aria-hidden="true">↺</span>
            Reset
          </button>
          <button type="button" class="balance-btn balance-btn--ghost" @click="copyJson" title="Copy JSON">
            <span class="balance-btn-icon" aria-hidden="true">⎘</span>
            Copy
          </button>
          <button type="button" class="balance-btn balance-btn--primary" @click="downloadJson" title="Download JSON">
            <span class="balance-btn-icon" aria-hidden="true">↓</span>
            Download
          </button>
        </div>
        <transition name="balance-toast">
          <span v-if="message" class="balance-toast">{{ message }}</span>
        </transition>
      </header>

      <div class="balance-content">
        <div class="balance-content-inner">
          <BalanceToolCharts
            :data-key="selectedKey"
            :data="editableData"
            :affinity-data="affinityDataForCharts"
          />

          <section class="balance-editor-section">
            <div class="balance-editor-head">
              <div class="balance-editor-head-top">
                <h2 class="balance-editor-title">Edit data</h2>
                <div class="balance-editor-actions">
                  <input
                    v-model="treeFilter"
                    type="search"
                    class="balance-editor-filter"
                    placeholder="Filter keys…"
                    aria-label="Filter keys in tree"
                  />
                  <button type="button" class="balance-editor-action-btn" @click="expandAllTree" title="Expand all">Expand all</button>
                  <button type="button" class="balance-editor-action-btn" @click="collapseAllTree" title="Collapse all">Collapse all</button>
                </div>
              </div>
              <p class="balance-editor-desc">
                Edits update the curves above. Export and paste into
                <code>src/data/{{ selectedKey }}.json</code>.
              </p>
            </div>
            <div class="balance-editor-body">
              <JsonTreeEditor v-if="editableData" :parent="editableData" :filter="treeFilter" />
              <div v-else class="balance-editor-empty">
                <span class="balance-editor-empty-icon" aria-hidden="true">📂</span>
                <p>Select a data source in the sidebar.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive, computed, provide, nextTick } from 'vue';
import { STATIC_DATA } from '../../application/dataToolCatalog.js';
import JsonTreeEditor from './JsonTreeEditor.vue';
import BalanceToolCharts from './BalanceToolCharts.vue';

const treeExpandSignal = ref<'expand' | 'collapse' | null>(null);
provide('treeExpandSignal', treeExpandSignal);
const treeFilter = ref('');

const DATA_GROUPS: Record<string, string> = {
  balance: 'Balance',
  gameConfig: 'Config',
  modules: 'Balance',
  events: 'Events',
  progression: 'Progression',
  achievements: 'Content',
  codex: 'Content',
  discoveryFlavor: 'Content',
  narrator: 'Content',
  prestigeLore: 'Content',
  questFlavor: 'Content',
  researchIconMapping: 'Data',
  changelog: 'Data',
};

const allKeys = Object.keys(STATIC_DATA).sort();
const filterQuery = ref('');
const selectedKey = ref(allKeys[0] ?? '');
const editableData = ref<Record<string, unknown> | unknown[] | null>(null);
const message = ref('');

const affinityDataForCharts = computed(() => {
  const raw = STATIC_DATA.modules;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const m = raw as { planetTypes?: string[]; modules?: { id: string; affinity?: Record<string, number> }[] };
  if (!m.planetTypes?.length || !Array.isArray(m.modules)) return null;
  const affinity: Record<string, Record<string, number>> = {};
  for (const mod of m.modules) {
    if (mod.affinity && Object.keys(mod.affinity).length > 0) affinity[mod.id] = mod.affinity;
  }
  return { planetTypes: m.planetTypes, affinity };
});

const filteredKeys = computed(() => {
  const q = filterQuery.value.trim().toLowerCase();
  if (!q) return allKeys;
  return allKeys.filter((k) => k.toLowerCase().includes(q));
});

const filteredGroups = computed(() => {
  const keys = filteredKeys.value;
  const groupToKeys: Record<string, string[]> = {};
  for (const k of keys) {
    const label = DATA_GROUPS[k] ?? 'Other';
    if (!groupToKeys[label]) groupToKeys[label] = [];
    groupToKeys[label].push(k);
  }
  const order = ['Balance', 'Config', 'Progression', 'Events', 'Content', 'Data', 'Other'];
  return order.filter((l) => groupToKeys[l]?.length).map((label) => ({ label, keys: groupToKeys[label]! }));
});

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function loadSelected(): void {
  const key = selectedKey.value;
  const raw = STATIC_DATA[key];
  if (raw === undefined) {
    editableData.value = null;
    return;
  }
  editableData.value = reactive(deepClone(raw)) as Record<string, unknown> | unknown[];
}

function reset(): void {
  loadSelected();
  message.value = 'Reset to original.';
  clearMessage();
}

function copyJson(): void {
  if (!editableData.value) return;
  const json = JSON.stringify(editableData.value, null, 2);
  navigator.clipboard?.writeText(json).then(() => {
    message.value = 'Copied to clipboard.';
    clearMessage();
  }).catch(() => {
    message.value = 'Copy failed.';
    clearMessage();
  });
}

function downloadJson(): void {
  if (!editableData.value) return;
  const json = JSON.stringify(editableData.value, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${selectedKey.value}.json`;
  a.click();
  URL.revokeObjectURL(url);
  message.value = 'Downloaded.';
  clearMessage();
}

let messageTimer: ReturnType<typeof setTimeout> | null = null;
function clearMessage(): void {
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { message.value = ''; messageTimer = null; }, 2000);
}

function expandAllTree(): void {
  treeExpandSignal.value = 'expand';
  nextTick(() => { treeExpandSignal.value = null; });
}
function collapseAllTree(): void {
  treeExpandSignal.value = 'collapse';
  nextTick(() => { treeExpandSignal.value = null; });
}

watch(selectedKey, loadSelected, { immediate: true });
</script>

<style scoped>
@reference "../../styles/index.css";

.balance-tool {
  min-height: 100vh;
  background: var(--bg-dark);
  color: var(--text);
  font-family: var(--font-body);
  display: flex;
}
.balance-sidebar {
  width: 15rem;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--bg-panel);
  display: flex;
  flex-direction: column;
}
.balance-sidebar-head {
  padding: 1rem 0.875rem;
  border-bottom: 1px solid var(--border);
}
.balance-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.04em;
  margin: 0;
}
.balance-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-dim);
  text-decoration: none;
  transition: color 0.15s;
}
.balance-link:hover {
  color: var(--accent);
}
.balance-link-icon {
  font-size: 0.625rem;
}
.balance-filter {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--bg-card);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.balance-filter::placeholder {
  color: var(--text-dim);
}
.balance-filter:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}
.balance-nav {
  padding: 0.5rem 0.375rem;
  flex: 1;
  overflow: auto;
}
.balance-nav-group {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  margin: 0.5rem 0 0.25rem;
  padding: 0 0.5rem;
}
.balance-nav-group:first-child {
  margin-top: 0;
}
.balance-nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4375rem 0.625rem;
  margin-bottom: 0.0625rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-dim);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}
.balance-nav-item:hover {
  background: var(--bg-card);
  color: var(--text);
}
.balance-nav-item--active {
  background: rgba(245, 158, 11, 0.14);
  color: var(--accent);
  font-weight: 500;
}
.balance-nav-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 1.125rem;
  border-radius: 0 2px 2px 0;
  background: var(--accent);
}
.balance-nav-indicator {
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
  flex-shrink: 0;
}
.balance-nav-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.balance-nav-empty {
  font-size: 0.8125rem;
  color: var(--text-dim);
  padding: 0.5rem 0.625rem;
  margin: 0;
}

.balance-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--bg-dark) 0%, rgba(0,0,0,0.02) 100%);
}
.balance-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-panel);
  min-height: 2.75rem;
}
.balance-toolbar-badge {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text);
  padding: 0.25rem 0.625rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 9999px;
}
.balance-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: auto;
}
.balance-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s;
  border: 1px solid transparent;
}
.balance-btn:active {
  transform: scale(0.98);
}
.balance-btn-icon {
  font-size: 0.875rem;
  opacity: 0.9;
}
.balance-btn--ghost {
  background: transparent;
  color: var(--text-dim);
  border-color: var(--border);
}
.balance-btn--ghost:hover {
  background: var(--bg-card);
  color: var(--text);
}
.balance-btn--primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  box-shadow: 0 1px 2px rgba(245, 158, 11, 0.2);
}
.balance-btn--primary:hover {
  filter: brightness(1.08);
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
}
.balance-toast {
  font-size: 0.75rem;
  color: var(--success);
  margin-left: 0.5rem;
}
.balance-toast-enter-active,
.balance-toast-leave-active {
  transition: opacity 0.2s ease;
}
.balance-toast-enter-from,
.balance-toast-leave-to {
  opacity: 0;
}

.balance-content {
  flex: 1;
  overflow: auto;
  padding: 1.25rem;
}
.balance-content-inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.balance-editor-section {
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}
.balance-editor-head {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}
.balance-editor-head-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  justify-content: space-between;
}
.balance-editor-title {
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
  margin: 0;
}
.balance-editor-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.balance-editor-filter {
  width: 10rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--bg-panel);
  color: var(--text);
  outline: none;
}
.balance-editor-filter:focus {
  border-color: var(--accent);
}
.balance-editor-action-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.balance-editor-action-btn:hover {
  color: var(--text);
  background: var(--bg-panel);
}
.balance-editor-desc {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin: 0.25rem 0 0;
}
.balance-editor-desc code {
  background: var(--bg-dark);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.6875rem;
}
.balance-editor-body {
  padding: 1rem;
  overflow: auto;
  max-height: 56vh;
}
.balance-editor-empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-dim);
  font-size: 0.875rem;
}
.balance-editor-empty-icon {
  display: block;
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.6;
}
.balance-editor-empty p {
  margin: 0;
}
</style>

<style>
/* Force full width when Balance Tool is mounted (overrides game #app constraints) */
#app.balance-tool-host {
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
