<template>
  <div v-if="wide" class="statistics-card statistics-card--wide">
    <span class="statistics-card-label">{{ label }}</span>
    <span class="statistics-card-value" :data-stat-id="statId1">{{ value1 ?? '—' }}</span>
    <span class="statistics-card-suffix">{{ suffix }}</span>
    <span class="statistics-card-value" :data-stat-id="statId2">{{ value2 ?? '—' }}</span>
  </div>
  <div v-else class="statistics-card">
    <span class="statistics-card-label">{{ label }}</span>
    <span class="statistics-card-value" :data-stat-id="statId">{{ value ?? '—' }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value?: string;
  statId?: string;
  wide?: boolean;
  value1?: string;
  suffix?: string;
  value2?: string;
  statId1?: string;
  statId2?: string;
}>();
</script>
