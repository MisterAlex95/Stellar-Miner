<template>
  <div :class="rootClass">
    <div :class="headerClass">
      <span :class="labelClass">{{ label }}</span>
      <span :class="valueClass">{{ value }}{{ target ? ` / ${target}` : '' }}</span>
    </div>
    <p
      v-if="theme === 'dashboard-quest' || desc"
      :class="descClass"
      :style="theme === 'dashboard-quest' && !desc ? { display: 'none' } : undefined"
    >{{ desc }}</p>
    <div :class="barWrapClass">
      <div
        :class="barClass"
        role="progressbar"
        :style="{ width: pct + '%' }"
        :aria-valuenow="Math.round(pct)"
        aria-valuemin="0"
        aria-valuemax="100"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    value: string;
    target?: string;
    desc?: string;
    pct: number;
    cardClass?: string;
    theme?: 'default' | 'dashboard-prestige' | 'dashboard-quest';
  }>(),
  { theme: 'default' }
);

const isPrestige = props.theme === 'dashboard-prestige';
const isQuest = props.theme === 'dashboard-quest';
const isDashboard = isPrestige || isQuest;
const rootClass = [isPrestige ? 'dashboard-progress-card' : isQuest ? 'dashboard-quest-card' : 'progress-card', props.cardClass];
const headerClass = isPrestige ? 'dashboard-progress-card-header' : isQuest ? 'dashboard-quest-card-header' : 'progress-card-header';
const labelClass = isPrestige ? 'dashboard-progress-card-label' : isQuest ? 'dashboard-quest-card-label' : 'progress-card-label';
const valueClass = isPrestige ? 'dashboard-progress-card-value' : isQuest ? 'dashboard-quest-card-value' : 'progress-card-value';
const descClass = isQuest ? 'dashboard-quest-desc' : 'progress-card-desc';
const barWrapClass = isPrestige ? 'dashboard-progress-bar-wrap' : isQuest ? 'dashboard-quest-bar-wrap' : 'progress-card-bar-wrap';
const barClass = isPrestige ? 'dashboard-progress-bar' : isQuest ? 'dashboard-quest-bar' : 'progress-card-bar';
</script>
