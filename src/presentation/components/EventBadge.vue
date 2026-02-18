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
