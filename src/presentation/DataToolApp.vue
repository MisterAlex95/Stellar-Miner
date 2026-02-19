<template>
  <div class="data-tool min-h-screen bg-background text-foreground font-body p-4">
    <header class="flex items-center justify-between gap-4 mb-6 flex-wrap">
      <h1 class="text-xl font-display font-semibold text-primary">Stellar Miner – Data Tool</h1>
      <a
        :href="backUrl"
        class="text-sm text-primary hover:underline"
        @click.prevent="goBack"
      >← Back to game</a>
    </header>

    <nav class="flex gap-2 mb-4 border-b border-border pb-2">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="px-3 py-1.5 rounded-md text-sm"
        :class="activeTab === t.id ? 'bg-primary text-white' : 'bg-surface text-foreground-muted hover:bg-card'"
        @click="activeTab = t.id"
      >
        {{ t.label }}
      </button>
    </nav>

    <!-- Session -->
    <section v-show="activeTab === 'session'" class="space-y-3">
      <div class="flex flex-wrap gap-2 items-center">
        <button type="button" class="btn" @click="loadSession">Load from storage</button>
        <button type="button" class="btn" :disabled="!sessionJson" @click="validateSession">Validate</button>
        <button type="button" class="btn" :disabled="!sessionJson || !sessionValid" @click="saveSession">Save to storage</button>
        <button type="button" class="btn" :disabled="!sessionJson || !sessionValid" @click="applyAndReload">Apply & reload game</button>
        <button type="button" class="btn" :disabled="!sessionJson" @click="exportFile">Export file</button>
        <button type="button" class="btn" @click="triggerImportFile">Import file</button>
        <input ref="fileInputRef" type="file" accept=".json,application/json" class="hidden" @change="onImportFile" />
        <span v-if="sessionMessage" class="text-sm" :class="sessionValid ? 'text-success' : 'text-red-500'">{{ sessionMessage }}</span>
      </div>
      <textarea
        v-model="sessionJson"
        class="w-full h-[60vh] font-mono text-sm p-3 rounded-lg bg-surface border border-border resize-y"
        placeholder="Session JSON (click Load from storage or paste)"
        spellcheck="false"
      />
    </section>

    <!-- Static data -->
    <section v-show="activeTab === 'static'" class="space-y-3">
      <div class="flex gap-2 items-center flex-wrap">
        <label class="text-sm text-foreground-muted">Data:</label>
        <select
          v-model="selectedStaticKey"
          class="bg-surface border border-border rounded px-2 py-1 text-sm"
        >
          <option value="">— Select —</option>
          <option v-for="k in staticKeys" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>
      <pre class="w-full h-[60vh] overflow-auto p-3 rounded-lg bg-surface border border-border text-sm font-mono whitespace-pre-wrap break-words">{{ staticPreview }}</pre>
    </section>

    <!-- LocalStorage -->
    <section v-show="activeTab === 'storage'" class="space-y-3">
      <div class="flex flex-wrap gap-2 items-center">
        <button type="button" class="btn" @click="refreshStorageKeys">Refresh</button>
        <span v-if="storageMessage" class="text-sm text-foreground-muted">{{ storageMessage }}</span>
      </div>
      <div class="flex gap-4 flex-col lg:flex-row">
        <ul class="w-full lg:w-56 flex-shrink-0 space-y-1 max-h-[40vh] overflow-auto">
          <li
            v-for="key in storageKeys"
            :key="key"
            class="cursor-pointer px-2 py-1 rounded text-sm truncate"
            :class="selectedStorageKey === key ? 'bg-primary text-white' : 'bg-surface hover:bg-card'"
            :title="key"
            @click="selectStorageKey(key)"
          >
            {{ key }}
          </li>
        </ul>
        <div class="flex-1 min-w-0 space-y-2">
          <template v-if="selectedStorageKey">
            <div class="flex gap-2">
              <button type="button" class="btn" :disabled="!storageValueDirty" @click="saveStorageValue">Save</button>
              <button type="button" class="btn bg-red-600 hover:bg-red-700" @click="deleteStorageKey">Delete</button>
            </div>
            <textarea
              v-model="storageValueEdit"
              class="w-full h-[50vh] font-mono text-sm p-3 rounded-lg bg-surface border border-border resize-y"
              spellcheck="false"
              @input="storageValueDirty = true"
            />
          </template>
          <p v-else class="text-foreground-muted text-sm">Select a key to view or edit.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  getStoredSessionRaw,
  setStoredSessionRaw,
  validateSessionJson,
  writeSessionAndReload,
  listStorageKeys as listStorageKeysApi,
  getStorageValue,
  setStorageValue,
  removeStorageKey,
} from '../application/dataToolBridge.js';
import { STATIC_DATA } from '../application/dataToolCatalog.js';

const tabs = [
  { id: 'session', label: 'Session' },
  { id: 'static', label: 'Static data' },
  { id: 'storage', label: 'LocalStorage' },
];

const activeTab = ref('session');
const backUrl = computed(() =>
  typeof window === 'undefined' ? '/' : window.location.pathname + window.location.hash
);
const sessionJson = ref('');
const sessionValid = ref(false);
const sessionMessage = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const staticKeys = Object.keys(STATIC_DATA).sort();
const selectedStaticKey = ref(staticKeys[0] ?? '');
const staticPreview = computed(() => {
  const k = selectedStaticKey.value;
  if (!k || !STATIC_DATA[k]) return '';
  return JSON.stringify(STATIC_DATA[k], null, 2);
});

const storageKeys = ref<string[]>([]);
const selectedStorageKey = ref('');
const storageValueEdit = ref('');
const storageValueDirty = ref(false);
const storageMessage = ref('');

function goBack(): void {
  window.location.href = backUrl.value;
}

function loadSession(): void {
  const raw = getStoredSessionRaw();
  sessionJson.value = raw ? raw : '{}';
  sessionMessage.value = raw ? 'Loaded from storage.' : 'No session in storage.';
  sessionValid.value = raw ? validateSessionJson(raw) : false;
}

function validateSession(): void {
  const json = sessionJson.value.trim();
  if (!json) {
    sessionMessage.value = 'Paste or load JSON first.';
    sessionValid.value = false;
    return;
  }
  try {
    sessionValid.value = validateSessionJson(json);
    sessionMessage.value = sessionValid.value ? 'Valid session.' : 'Invalid session shape.';
  } catch {
    sessionValid.value = false;
    sessionMessage.value = 'Invalid JSON.';
  }
}

function saveSession(): void {
  const json = sessionJson.value.trim();
  if (!json || !sessionValid.value) return;
  setStoredSessionRaw(json);
  sessionMessage.value = 'Saved to storage. Reload the game to apply.';
}

function applyAndReload(): void {
  const json = sessionJson.value.trim();
  if (!writeSessionAndReload(json)) return;
  window.location.search = '';
  window.location.reload();
}

function exportFile(): void {
  const json = sessionJson.value.trim() || '{}';
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stellar-miner-save-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function triggerImportFile(): void {
  fileInputRef.value?.click();
}

function onImportFile(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = typeof reader.result === 'string' ? reader.result : '';
    sessionJson.value = text;
    sessionValid.value = validateSessionJson(text);
    sessionMessage.value = sessionValid.value ? 'File loaded and valid.' : 'File loaded but invalid session.';
  };
  reader.readAsText(file);
  input.value = '';
}

function refreshStorageKeys(): void {
  storageKeys.value = listStorageKeysApi();
  storageMessage.value = `${storageKeys.value.length} key(s).`;
}

function selectStorageKey(key: string): void {
  selectedStorageKey.value = key;
  storageValueEdit.value = getStorageValue(key) ?? '';
  storageValueDirty.value = false;
}

function saveStorageValue(): void {
  if (!selectedStorageKey.value) return;
  setStorageValue(selectedStorageKey.value, storageValueEdit.value);
  storageValueDirty.value = false;
  storageMessage.value = 'Saved.';
}

function deleteStorageKey(): void {
  if (!selectedStorageKey.value) return;
  removeStorageKey(selectedStorageKey.value);
  storageKeys.value = listStorageKeysApi();
  selectedStorageKey.value = '';
  storageValueEdit.value = '';
  storageValueDirty.value = false;
  storageMessage.value = 'Key deleted.';
}

onMounted(() => {
  loadSession();
  refreshStorageKeys();
  if (staticKeys.length && !selectedStaticKey.value) selectedStaticKey.value = staticKeys[0];
});
</script>

<style scoped>
@reference "../styles/index.css";

.btn {
  @apply px-3 py-1.5 rounded-md text-sm bg-surface border border-border hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>
