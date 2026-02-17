<template>
  <div :class="rootClass">
    <span v-if="icon" :class="iconClass" aria-hidden="true">{{ icon }}</span>
    <span :class="labelClass">{{ label }}</span>
    <span :id="valueId" :class="valueClass">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    icon?: string;
    label: string;
    value: string;
    primary?: boolean;
    /** When 'dashboard', uses exact dashboard CSS classes for same look. */
    theme?: 'default' | 'dashboard';
    /** For dashboard theme: 'dashboard-stat--coins' | 'dashboard-stat--rate' | 'dashboard-stat--run' */
    variant?: 'coins' | 'rate' | 'run';
    /** Optional id for the value span (e.g. dashboard-stat-coins). */
    valueId?: string;
  }>(),
  { theme: 'default', variant: 'coins' }
);

const isDashboard = props.theme === 'dashboard';
const rootClass = isDashboard
  ? `dashboard-stat dashboard-stat--${props.variant}`
  : ['stat-chip', { 'stat-chip--primary': props.primary }];
const iconClass = isDashboard
  ? props.variant === 'rate'
    ? 'dashboard-stat-icon dashboard-stat-icon--rate'
    : 'dashboard-stat-icon'
  : 'stat-chip-icon';
const labelClass = isDashboard ? 'dashboard-stat-label' : 'stat-chip-label';
const valueId = props.valueId ?? undefined;
const valueClass = isDashboard
  ? props.variant === 'coins'
    ? 'dashboard-stat-value dashboard-stat-value--primary'
    : props.variant === 'run'
      ? 'dashboard-stat-value dashboard-stat-value--run'
      : 'dashboard-stat-value'
  : ['stat-chip-value', { 'stat-chip--primary': props.primary }];
</script>

<style scoped>
.stat-chip {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.stat-chip-icon {
  opacity: 0.8;
}
.stat-chip-label {
  color: var(--text-muted, #888);
}
.stat-chip-value {
  font-variant-numeric: tabular-nums;
}
.stat-chip--primary .stat-chip-value {
  font-weight: 600;
}
</style>
