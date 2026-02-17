<template>
  <div class="app-wrapper vue-shell">
    <AppHeader />
    <div id="legacy-root">
      <StatsBlock />
    </div>
    <AppTabs />
    <div id="legacy-panels">
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
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import AppTabs from './AppTabs.vue';
import ToastContainer from './ToastContainer.vue';
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
import StatsBlock from './components/StatsBlock.vue';
import PanelsShell from './components/PanelsShell.vue';

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
