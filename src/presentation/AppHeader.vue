<template>
  <div class="vue-shell-header">
    <div
      class="offline-banner"
      role="status"
      aria-live="polite"
      :aria-hidden="!offline"
      :hidden="!offline"
    >
      {{ t('offlineIndicator') }}
    </div>
    <header>
      <div class="header-row">
        <div>
          <h1>{{ t('appTitle') }}</h1>
          <p class="subtitle">{{ t('appSubtitle') }}</p>
        </div>
        <HeaderActions />
      </div>
    </header>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { t } from '../application/strings.js';
import HeaderActions from './components/HeaderActions.vue';

const offline = ref(typeof navigator !== 'undefined' && !navigator.onLine);

function updateOffline(): void {
  offline.value = typeof navigator !== 'undefined' && !navigator.onLine;
}

onMounted(() => {
  window.addEventListener('online', updateOffline);
  window.addEventListener('offline', updateOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOffline);
  window.removeEventListener('offline', updateOffline);
});
</script>
