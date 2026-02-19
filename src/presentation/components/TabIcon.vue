<template>
  <span class="tab-icon" aria-hidden="true">
    <!-- mine: pickaxe -->
    <svg v-if="tabId === 'mine'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 20L13 6" />
      <path d="M9 5l8 6" />
    </svg>
    <!-- dashboard: grid overview -->
    <svg v-else-if="tabId === 'dashboard'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
    <!-- empire: planet + 2 continents (filled, currentColor) -->
    <svg v-else-if="tabId === 'empire'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path fill="currentColor" stroke="none" d="M7 9c1-1 2.5-.5 3.5.5s1.5 2 1 3.2c-.5 1-1.5 1.5-2.5 1.2-1-.3-1.8-1.2-1.8-2.2S6 10 7 9z" />
      <ellipse fill="currentColor" stroke="none" cx="15" cy="14" rx="2" ry="1.5" />
    </svg>
    <!-- research: lab flask -->
    <svg v-else-if="tabId === 'research'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 2v4l-3 12h12L15 6V2" />
      <path d="M9 6h6" />
    </svg>
    <!-- upgrades: stacked modules / layers -->
    <svg v-else-if="tabId === 'upgrades'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 4l6 3v6l-6 3-6-3V7z" />
      <path d="M12 14l6 3" />
      <path d="M12 14v6" />
      <path d="M12 14l-6 3" />
    </svg>
    <!-- stats: bar chart with baseline -->
    <svg v-else-if="tabId === 'stats'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 18V9M10 18v-5M15 18v-3M20 18V6" />
      <path d="M4 19h17" />
    </svg>
    <!-- archive: open book / codex -->
    <svg v-else-if="tabId === 'archive'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 6c0-1.5 2-2 4-2s4 .5 4 2v12c0 1.5-2 2-4 2s-4-.5-4-2V6z" />
      <path d="M20 6c0-1.5-2-2-4-2s-4 .5-4 2v12c0 1.5 2 2 4 2s4-.5 4-2V6z" />
      <path d="M12 4v16" />
    </svg>
    <!-- fallback: same as mine -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 20L13 6" />
      <path d="M9 5l8 6" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import type { TabId } from '../tabs.js';

defineProps<{
  tabId: TabId;
}>();
</script>

<style scoped>
.tab-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25em;
  height: 1.25em;
  flex-shrink: 0;
}
.tab-icon svg {
  width: 100%;
  height: 100%;
}
</style>
