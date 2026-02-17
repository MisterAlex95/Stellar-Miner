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
