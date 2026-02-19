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

/* Dashboard theme */
.dashboard-stat {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  position: relative;
}

.dashboard-stat-icon {
  position: absolute;
  top: 0.6rem;
  right: 0.75rem;
  font-size: 0.75rem;
  opacity: 0.5;
  font-family: 'Orbitron', sans-serif;
}

.dashboard-stat-icon--rate {
  font-weight: 700;
  color: var(--accent);
  opacity: 0.7;
}

.dashboard-stat--coins {
  grid-column: 1 / -1;
  background: linear-gradient(145deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.06) 100%);
  border-color: rgba(245, 158, 11, 0.25);
}

.dashboard-stat--run .dashboard-stat-value {
  font-size: 0.8rem;
  line-height: 1.35;
  word-break: break-word;
}

.dashboard-stat-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.dashboard-stat-value {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.dashboard-stat-value--primary {
  font-size: 1.35rem;
  color: var(--accent);
  text-shadow: 0 0 20px var(--accent-glow);
}

.dashboard-stat-value--run {
  font-family: 'Exo 2', sans-serif;
  font-weight: 500;
  color: var(--text);
}
</style>
