<template>
  <span class="header-actions">
    <span class="info-btn-wrap">
      <button
        type="button"
        class="info-btn"
        :aria-label="t('whatsNew')"
        @click="onInfoClick"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      </button>
      <span
        class="info-update-badge"
        :class="{ 'info-update-badge--visible': hasUpdate() }"
        :aria-hidden="!hasUpdate()"
      ></span>
    </span>
    <button
      type="button"
      class="achievements-btn"
      :aria-label="t('openAchievements')"
      @click="onAchievementsClick"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
    </button>
    <button
      type="button"
      class="settings-btn"
      :aria-label="t('openSettings')"
      @click="onSettingsClick"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-1.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h1.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v1.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-1.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </button>
  </span>
</template>

<script setup lang="ts">
import { t } from '../../application/strings.js';
import { openSettings } from '../../application/handlers.js';
import { openInfoModal, openAchievementsModal } from '../mountModals.js';
import { updateVersionAndChangelogUI } from '../initPresentation.js';
import { useAppUIStore } from '../stores/appUI.js';

const appUI = useAppUIStore();
const hasUpdate = () => appUI.infoHasUpdate;

function onInfoClick(): void {
  openInfoModal(updateVersionAndChangelogUI);
}

function onAchievementsClick(): void {
  openAchievementsModal();
}

function onSettingsClick(): void {
  openSettings();
}

</script>
