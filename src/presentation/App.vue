<template>
  <div ref="appWrapperRef" class="app-wrapper vue-shell">
    <AppHeader />
    <div ref="mainContentRef" id="main-content">
      <StatsBlock />
    </div>
    <AppTabs v-show="store.layout === 'tabs'" />
    <div ref="panelsRef" id="panels">
      <PanelsShell />
    </div>
    <SettingsModal />
    <InfoModal />
    <AchievementsModal />
    <ResetConfirmModal />
    <PrestigeConfirmModal />
    <PrestigeRewardsModal />
    <EventsHintModal />
    <ChartHelpModal />
    <SectionRulesModal />
    <UpgradeChoosePlanetModal />
    <PlanetDetailModal />
    <ExpeditionModal />
    <IntroModal />
    <ToastContainer />
    <FloatingFeedback />
    <DebugPanel />
    <GlobalTooltip />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import AppHeader from './AppHeader.vue';
import AppTabs from './AppTabs.vue';
import ToastContainer from './ToastContainer.vue';
import FloatingFeedback from './components/FloatingFeedback.vue';
import SettingsModal from './components/SettingsModal.vue';
import InfoModal from './components/InfoModal.vue';
import AchievementsModal from './components/AchievementsModal.vue';
import ResetConfirmModal from './components/ResetConfirmModal.vue';
import PrestigeConfirmModal from './components/PrestigeConfirmModal.vue';
import PrestigeRewardsModal from './components/PrestigeRewardsModal.vue';
import EventsHintModal from './components/EventsHintModal.vue';
import ChartHelpModal from './components/ChartHelpModal.vue';
import SectionRulesModal from './components/SectionRulesModal.vue';
import UpgradeChoosePlanetModal from './components/UpgradeChoosePlanetModal.vue';
import PlanetDetailModal from './components/PlanetDetailModal.vue';
import ExpeditionModal from './components/ExpeditionModal.vue';
import IntroModal from './components/IntroModal.vue';
import DebugPanel from './components/DebugPanel.vue';
import GlobalTooltip from './components/GlobalTooltip.vue';
import StatsBlock from './components/StatsBlock.vue';
import PanelsShell from './components/PanelsShell.vue';
import { useGameStateStore } from './stores/gameState.js';
import { useAppUIStore } from './stores/appUI.js';
import { useGlobalKeyboard } from './composables/useGlobalKeyboard.js';
import { useChartHelpTrigger } from './composables/useChartHelpTrigger.js';
import { settingsStore } from '../application/gameState.js';

const store = useGameStateStore();
const appUI = useAppUIStore();
const appWrapperRef = ref<HTMLElement | null>(null);
const mainContentRef = ref<HTMLElement | null>(null);
const panelsRef = ref<HTMLElement | null>(null);

function syncAppAttributes(): void {
  const app = appUI.appRoot;
  if (app) {
    app.setAttribute('data-active-tab', store.activeTab);
    app.setAttribute('data-layout', store.layout);
    const s = settingsStore.get();
    app.setAttribute('data-show-tab-labels', s.showTabLabels ? 'true' : 'false');
  }
}

let unsubSettings: (() => void) | null = null;

onMounted(() => {
  appUI.setAppRoot(appWrapperRef.value?.parentElement ?? null);
  appUI.setMainContentRoot(mainContentRef.value ?? null);
  appUI.setPanelsRoot(panelsRef.value ?? null);
  syncAppAttributes();
  unsubSettings = settingsStore.subscribe(() => syncAppAttributes());
});
onBeforeUnmount(() => {
  unsubSettings?.();
  appUI.setAppRoot(null);
  appUI.setMainContentRoot(null);
  appUI.setPanelsRoot(null);
});
watch(
  () => [store.activeTab, store.layout],
  () => syncAppAttributes(),
  { flush: 'sync' },
);

useGlobalKeyboard();
useChartHelpTrigger();
</script>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
</style>
