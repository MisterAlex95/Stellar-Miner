<template>
  <div class="app-wrapper vue-shell">
    <AppHeader />
    <AppTabs />
    <div id="legacy-root"></div>
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import AppTabs from './AppTabs.vue';
import ToastContainer from './ToastContainer.vue';

// Vue shell: header, tabs, legacy content in #legacy-root, toasts.
// Game init and mount(legacyRoot) are triggered from game.ts after this app is mounted.
</script>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
</style>
