<template>
  <div :class="rootClass">
    <span :class="labelClass">{{ label }}</span>
    <div :class="gridClass">
      <button
        v-for="item in items"
        :key="item.tab"
        type="button"
        :class="btnClass"
        :data-goto="item.tab"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    items: { tab: string; label: string }[];
    theme?: 'default' | 'dashboard';
  }>(),
  { theme: 'default' }
);

const isDashboard = props.theme === 'dashboard';
const rootClass = isDashboard ? 'dashboard-shortcuts' : 'shortcut-grid-wrap';
const labelClass = isDashboard ? 'dashboard-shortcuts-label' : 'shortcut-grid-label';
const gridClass = isDashboard ? 'dashboard-shortcuts-grid' : 'shortcut-grid';
const btnClass = isDashboard ? 'dashboard-shortcut' : 'shortcut-grid-btn';
</script>

<style scoped>
.dashboard-shortcuts {
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.dashboard-shortcuts-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
}

.dashboard-shortcuts-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.dashboard-shortcut {
  padding: 0.4rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.1s;
}

.dashboard-shortcut:hover {
  background: var(--bg-panel);
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

.dashboard-shortcut:active {
  transform: translateY(0);
}
</style>
