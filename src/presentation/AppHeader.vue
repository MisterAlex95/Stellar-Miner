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

<style scoped>
.offline-banner {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: var(--bg-dark);
  text-align: center;
  font-size: 0.875rem;
  font-weight: 500;
}

.offline-banner[hidden] {
  display: none;
}

header {
  margin-bottom: 2rem;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.header-row > div {
  flex: 1;
  text-align: center;
}

.subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-dim);
}

@media (min-width: 361px) and (max-width: 767px) {
  header {
    margin-bottom: 1.5rem;
  }
}

@media (max-width: 360px) {
  header :deep(h1) {
    font-size: 1.1rem;
    letter-spacing: 0.08em;
  }

  .subtitle {
    font-size: 0.7rem;
  }
}
</style>
