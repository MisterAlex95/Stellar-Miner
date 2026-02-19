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

<style scoped>
.dashboard-progress-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1rem 1.25rem;
}

.dashboard-progress-card--prestige {
  border-color: rgba(201, 162, 39, 0.35);
  background: linear-gradient(145deg, var(--bg-card) 0%, rgba(201, 162, 39, 0.06) 100%);
}

.dashboard-progress-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.dashboard-progress-card-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.dashboard-progress-card-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  font-family: 'Orbitron', sans-serif;
}

.dashboard-progress-bar-wrap {
  height: 6px;
  background: var(--bg-panel);
  border-radius: 3px;
  overflow: hidden;
}

.dashboard-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--prestige-color, #c9a227) 0%, #e5c547 100%);
  border-radius: 3px;
  transition: width 0.3s ease-out;
}

.dashboard-quest-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1rem 1.25rem;
}

.dashboard-quest-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.dashboard-quest-desc {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--text-dim);
  line-height: 1.4;
}

.dashboard-quest-card-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.dashboard-quest-card-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  font-family: 'Orbitron', sans-serif;
}

.dashboard-quest-bar-wrap {
  height: 8px;
  background: var(--bg-panel);
  border-radius: 4px;
  overflow: hidden;
}

.dashboard-quest-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent) 0%, #fbbf24 100%);
  border-radius: 4px;
  transition: width 0.25s ease-out;
}
</style>
