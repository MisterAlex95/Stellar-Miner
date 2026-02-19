<template>
  <div v-if="pills.length" :class="rootClass">
    <span v-if="label" :class="labelClass">{{ label }}</span>
    <div :class="listClass">
      <span v-for="(text, i) in pills" :key="i" :class="pillClass">{{ text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    pills: string[];
    theme?: 'default' | 'dashboard';
  }>(),
  { theme: 'default' }
);

const isDashboard = props.theme === 'dashboard';
const rootClass = isDashboard ? 'dashboard-empire' : 'pills-row';
const labelClass = isDashboard ? 'dashboard-empire-label' : 'pills-row-label';
const listClass = isDashboard ? 'dashboard-empire-pills' : 'pills-row-list';
const pillClass = isDashboard ? 'dashboard-empire-pill' : 'pills-row-pill';
</script>

<style scoped>
.dashboard-empire {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
}

.dashboard-empire-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.dashboard-empire-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.dashboard-empire-pill {
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
}
</style>
