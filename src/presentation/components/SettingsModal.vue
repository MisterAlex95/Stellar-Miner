<template>
  <div
    id="settings-overlay"
    class="settings-overlay"
    aria-hidden="true"
    @click.self="closeSettings"
  >
    <div
      class="settings-modal"
      role="dialog"
      aria-labelledby="settings-title"
    >
      <div class="settings-header">
        <h2 id="settings-title">{{ t('settings') }}</h2>
        <button
          id="settings-close"
          type="button"
          class="settings-close"
          :aria-label="t('close')"
          @click="closeSettings"
        >
          ×
        </button>
      </div>
      <div class="settings-body">
        <div class="settings-group">
          <h3 class="settings-group-title">{{ t('settingsGroupVisual') }}</h3>
          <div class="settings-option">
            <label for="setting-language">{{ t('language') }}</label>
            <select
              id="setting-language"
              :aria-label="t('language')"
              :value="settings.language"
              @change="onLanguageChange"
            >
              <option value="en">{{ t('languageEn') }}</option>
              <option value="fr">{{ t('languageFr') }}</option>
            </select>
          </div>
          <div class="settings-option">
            <label for="setting-starfield-speed">{{ t('starfieldSpeed') }}</label>
            <select
              id="setting-starfield-speed"
              :aria-label="t('starfieldSpeed')"
              :value="String(settings.starfieldSpeed)"
              @change="onStarfieldSpeedChange"
            >
              <option value="0.5">{{ t('starfieldSpeedSlow') }}</option>
              <option value="1">{{ t('starfieldSpeedNormal') }}</option>
              <option value="1.5">{{ t('starfieldSpeedFast') }}</option>
            </select>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input
                id="setting-orbit-lines"
                type="checkbox"
                :checked="settings.showOrbitLines"
                @change="onShowOrbitLinesChange"
              >
              <span>{{ t('showOrbitLines') }}</span>
            </label>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input
                id="setting-click-particles"
                type="checkbox"
                :checked="settings.clickParticles"
                @change="onClickParticlesChange"
              >
              <span>{{ t('clickParticles') }}</span>
            </label>
          </div>
          <div class="settings-option">
            <label for="setting-theme">{{ t('theme') }}</label>
            <select
              id="setting-theme"
              :aria-label="t('theme')"
              :value="settings.theme"
              @change="onThemeChange"
            >
              <option value="dark">{{ t('themeDark') }}</option>
              <option value="light">{{ t('themeLight') }}</option>
            </select>
          </div>
        </div>
        <div class="settings-group">
          <h3 class="settings-group-title">{{ t('settingsGroupGameplay') }}</h3>
          <div class="settings-option">
            <label class="settings-toggle">
              <input
                id="setting-compact-numbers"
                type="checkbox"
                :checked="settings.compactNumbers"
                @change="onCompactNumbersChange"
              >
              <span>{{ t('compactNumbers') }}</span>
            </label>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input
                id="setting-space-key-repeat"
                type="checkbox"
                :checked="settings.spaceKeyRepeat"
                @change="onSpaceKeyRepeatChange"
              >
              <span>{{ t('spaceKeyRepeat') }}</span>
            </label>
          </div>
          <div class="settings-option">
            <label for="setting-layout">{{ t('layout') }}</label>
            <select
              id="setting-layout"
              :aria-label="t('layout')"
              :value="settings.layout"
              @change="onLayoutChange"
            >
              <option value="tabs">{{ t('layoutTabs') }}</option>
              <option value="one-page">{{ t('layoutOnePage') }}</option>
            </select>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input
                id="setting-pause-background"
                type="checkbox"
                :checked="settings.pauseWhenBackground"
                @change="onPauseWhenBackgroundChange"
              >
              <span>{{ t('pauseWhenBackground') }}</span>
            </label>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input
                id="setting-sound"
                type="checkbox"
                :checked="settings.soundEnabled"
                @change="onSoundEnabledChange"
              >
              <span>{{ t('soundEnabled') }}</span>
            </label>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input
                id="setting-reduced-motion"
                type="checkbox"
                :checked="settings.reducedMotion"
                @change="onReducedMotionChange"
              >
              <span>{{ t('reducedMotion') }}</span>
            </label>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input
                id="setting-story-toasts"
                type="checkbox"
                :checked="settings.showStoryToasts"
                @change="onShowStoryToastsChange"
              >
              <span>{{ t('showStoryToasts') }}</span>
            </label>
          </div>
        </div>
        <div class="settings-group">
          <h3 class="settings-group-title">{{ t('settingsGroupSaveData') }}</h3>
          <div class="settings-option settings-save-export">
            <div class="settings-save-buttons">
              <button
                type="button"
                class="settings-export-btn"
                @click="onExportClick"
              >
                {{ t('exportSave') }}
              </button>
              <button
                type="button"
                class="settings-import-btn"
                @click="onImportClick"
              >
                {{ t('importSave') }}
              </button>
            </div>
            <input
              ref="importFileInputRef"
              type="file"
              accept=".json,application/json"
              class="settings-import-file"
              aria-hidden="true"
              @change="onImportFileChange"
            >
            <p
              id="last-saved-indicator"
              class="settings-last-saved"
              aria-live="polite"
            >
              {{ appUI.lastSavedText }}
            </p>
          </div>
          <div class="settings-option settings-reset">
            <button
              type="button"
              class="reset-btn"
              @click="onResetClick"
            >
              {{ t('resetProgress') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { getSettings, setSettings } from '../../application/gameState.js';
import type { Settings } from '../../../settings.js';
import { t } from '../../application/strings.js';
import { subscribe } from '../../application/eventBus.js';
import { storeToRefs } from 'pinia';
import {
  closeSettings,
  updateLastSavedIndicator,
  openResetConfirmModal,
} from '../../application/handlers.js';
import { useAppUIStore } from '../stores/appUI.js';
import { handleExportSave, handleImportSave } from '../../application/handlers.js';

const appUI = storeToRefs(useAppUIStore());
const settings = reactive<Settings>({ ...getSettings() });
const importFileInputRef = ref<HTMLInputElement | null>(null);

function syncFromGameState(): void {
  const s = getSettings();
  Object.assign(settings, s);
}

function pushToGameState(): void {
  setSettings({ ...settings });
}

function onLanguageChange(e: Event): void {
  const v = (e.target as HTMLSelectElement).value as Settings['language'];
  settings.language = v;
  pushToGameState();
}
function onStarfieldSpeedChange(e: Event): void {
  settings.starfieldSpeed = Number((e.target as HTMLSelectElement).value);
  pushToGameState();
}
function onShowOrbitLinesChange(e: Event): void {
  settings.showOrbitLines = (e.target as HTMLInputElement).checked;
  pushToGameState();
}
function onClickParticlesChange(e: Event): void {
  settings.clickParticles = (e.target as HTMLInputElement).checked;
  pushToGameState();
}
function onThemeChange(e: Event): void {
  const v = (e.target as HTMLSelectElement).value as Settings['theme'];
  settings.theme = v;
  pushToGameState();
}
function onCompactNumbersChange(e: Event): void {
  settings.compactNumbers = (e.target as HTMLInputElement).checked;
  pushToGameState();
}
function onSpaceKeyRepeatChange(e: Event): void {
  settings.spaceKeyRepeat = (e.target as HTMLInputElement).checked;
  pushToGameState();
}
function onLayoutChange(e: Event): void {
  const v = (e.target as HTMLSelectElement).value as Settings['layout'];
  settings.layout = v;
  pushToGameState();
}
function onPauseWhenBackgroundChange(e: Event): void {
  settings.pauseWhenBackground = (e.target as HTMLInputElement).checked;
  pushToGameState();
}
function onSoundEnabledChange(e: Event): void {
  settings.soundEnabled = (e.target as HTMLInputElement).checked;
  pushToGameState();
}
function onReducedMotionChange(e: Event): void {
  settings.reducedMotion = (e.target as HTMLInputElement).checked;
  pushToGameState();
}
function onShowStoryToastsChange(e: Event): void {
  settings.showStoryToasts = (e.target as HTMLInputElement).checked;
  pushToGameState();
}

function onExportClick(): void {
  handleExportSave();
}

function onImportClick(): void {
  importFileInputRef.value?.click();
}

async function onImportFileChange(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const text = await file.text();
  const ok = await handleImportSave(text);
  input.value = '';
  if (ok) location.reload();
  else alert(t('invalidSaveFile'));
}

function onResetClick(): void {
  openResetConfirmModal();
}

let unsubSaveSuccess: (() => void) | null = null;

onMounted(() => {
  syncFromGameState();
  updateLastSavedIndicator();
  unsubSaveSuccess = subscribe('save_success', () => updateLastSavedIndicator());
});

onUnmounted(() => {
  unsubSaveSuccess?.();
});
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.settings-overlay--open {
  opacity: 1;
  visibility: visible;
}

.settings-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 360px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.settings-header h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text);
  margin: 0;
}

.settings-close {
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-dim);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.settings-close:hover {
  color: var(--text);
  background: var(--bg-card);
}

.settings-close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.settings-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings-group-title {
  margin: 0 0 0.15rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.settings-group:not(:first-child) .settings-group-title {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.settings-option {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.settings-option > label:not(.settings-toggle) {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.settings-option select {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.95rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  cursor: pointer;
}

.settings-option select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.settings-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--text);
}

.settings-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}

.settings-achievements {
  margin-top: 0.5rem;
}

.achievements-toggle-btn {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.achievements-toggle-btn:hover {
  background: var(--bg-panel);
  border-color: var(--accent);
}

.achievements-list {
  display: none;
  margin-top: 0.5rem;
  padding: 0.5rem 0;
  max-height: 200px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.achievements-list--open {
  display: block;
}

.achievement-item {
  font-size: 0.8rem;
  padding: 0.25rem 0;
  color: var(--text-dim);
}

.achievement-item--unlocked {
  color: var(--success);
}

.achievement-item--locked {
  color: var(--muted);
}

.settings-version-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.settings-version-label {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.settings-version-value {
  font-size: 0.9rem;
  font-family: var(--font-mono, monospace);
  color: var(--text);
}

.changelog-toggle-btn {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  cursor: pointer;
  margin-bottom: 0.5rem;
}

.changelog-toggle-btn:hover {
  background: var(--bg-card);
  border-color: var(--accent);
}

.changelog-list {
  display: none;
  margin-top: 0.25rem;
  padding: 0.5rem 0;
  max-height: 220px;
  overflow-y: auto;
}

.changelog-list--open {
  display: block;
}

.changelog-entry {
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.changelog-entry:last-child {
  margin-bottom: 0;
}

.changelog-entry-header {
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 0.25rem;
}

.changelog-date {
  font-weight: 400;
  color: var(--text-dim);
  font-size: 0.8rem;
}

.changelog-changes {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--text);
  line-height: 1.4;
}

.changelog-empty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.settings-save-export .settings-save-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.settings-export-btn,
.settings-import-btn {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.9rem;
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.settings-export-btn:hover,
.settings-import-btn:hover {
  background: var(--bg-panel);
  border-color: var(--accent);
  color: var(--accent);
}

.settings-import-file {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.settings-last-saved {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.settings-reset {
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.reset-btn {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.9rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.reset-btn:hover {
  background: rgba(220, 38, 38, 0.15);
  color: #f87171;
  border-color: #dc2626;
}

.reset-btn:focus-visible {
  outline: 2px solid #dc2626;
  outline-offset: 2px;
}
</style>
