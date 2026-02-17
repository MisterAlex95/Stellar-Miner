<template>
  <div class="app-wrapper vue-shell">
    <AppHeader />
    <div id="legacy-root"></div>
    <AppTabs />
    <div id="legacy-panels"></div>
    <SettingsModal />
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import AppTabs from './AppTabs.vue';
import ToastContainer from './ToastContainer.vue';
import SettingsModal from './components/SettingsModal.vue';

// Vue shell: header, stats block in #legacy-root, tabs, tab panels in #legacy-panels, toasts.
// Game init and mount() are triggered from game.ts after this app is mounted.
</script>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
</style>
