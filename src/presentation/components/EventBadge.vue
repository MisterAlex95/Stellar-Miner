<template>
  <span
    :class="['event-badge', 'event-badge--' + modifier]"
    :data-mult="multStr"
    :title="title"
  >
    <span class="event-badge__name">{{ name }}</span>
    <span class="event-badge__mult">{{ multStr }}</span>
    <span class="event-badge__time">— {{ secondsLeft }}s</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  name: string;
  secondsLeft: number;
  title: string;
  mult: number;
  modifier: 'positive' | 'negative';
}>();

const multStr = computed(() =>
  props.mult >= 1 ? `×${props.mult}` : `×${props.mult}`
);
</script>

<style scoped>
.event-badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.55rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid;
  font-weight: 500;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.event-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.event-badge__name {
  font-weight: 600;
}

.event-badge__mult {
  opacity: 0.9;
  font-variant-numeric: tabular-nums;
}

.event-badge__time {
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
}

.event-badge--positive {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.18) 0%, rgba(22, 163, 74, 0.12) 100%);
  border-color: rgba(34, 197, 94, 0.6);
  color: #86efac;
}

.event-badge--negative {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(185, 28, 28, 0.12) 100%);
  border-color: rgba(239, 68, 68, 0.6);
  color: #fca5a5;
}
</style>
