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
