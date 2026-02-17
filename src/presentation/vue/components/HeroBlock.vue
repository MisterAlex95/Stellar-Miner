<template>
  <div :class="rootClass">
    <div :class="headerClass">
      <span :class="badgeClass">{{ badge }}</span>
      <h3 :class="titleClass">{{ title }}</h3>
    </div>
    <div :class="actionClass">
      <button
        v-if="buttonId"
        type="button"
        :id="buttonId"
        :class="theme === 'dashboard' ? ['dashboard-hero-btn', buttonClass] : ['hero-block-btn', buttonClass]"
        :data-upgrade-id="dataUpgradeId ?? undefined"
        :data-planet-id="dataPlanetId ?? undefined"
        :data-goto="dataGoto ?? undefined"
      >
        {{ buttonLabel }}
      </button>
    </div>
    <p
      v-if="theme === 'dashboard' || timeText"
      :class="timeClass"
      :style="theme === 'dashboard' && !timeText ? { display: 'none' } : undefined"
    >{{ timeText }}</p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    badge: string;
    title: string;
    buttonId?: string;
    buttonClass?: string;
    buttonLabel?: string;
    dataUpgradeId?: string;
    dataPlanetId?: string;
    dataGoto?: string;
    timeText?: string;
    theme?: 'default' | 'dashboard';
  }>(),
  { theme: 'default' }
);

const rootClass = props.theme === 'dashboard' ? 'dashboard-hero' : 'hero-block';
const headerClass = props.theme === 'dashboard' ? 'dashboard-hero-header' : 'hero-block-header';
const badgeClass = props.theme === 'dashboard' ? 'dashboard-hero-badge' : 'hero-block-badge';
const titleClass = props.theme === 'dashboard' ? 'dashboard-hero-title' : 'hero-block-title';
const actionClass = props.theme === 'dashboard' ? 'dashboard-hero-action' : 'hero-block-action';
const timeClass = props.theme === 'dashboard' ? 'dashboard-hero-time' : 'hero-block-time';
</script>
