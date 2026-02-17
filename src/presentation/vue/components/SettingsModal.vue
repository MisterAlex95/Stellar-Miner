<template>
  <div
    id="settings-overlay"
    class="settings-overlay"
    aria-hidden="true"
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
            ></p>
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
import { getSettings, setSettings } from '../../../application/gameState.js';
import type { Settings } from '../../../settings.js';
import { t } from '../../../application/strings.js';
import { subscribe } from '../../../application/eventBus.js';
import {
  closeSettings,
  updateLastSavedIndicator,
  openResetConfirmModal,
} from '../../../application/handlers.js';
import { handleExportSave, handleImportSave } from '../../../application/handlers.js';

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
