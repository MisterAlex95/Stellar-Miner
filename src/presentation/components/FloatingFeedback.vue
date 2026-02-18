<template>
  <template v-if="bodyItems.length">
    <Teleport to="body">
      <span
        v-for="item in bodyItems"
        :key="item.id"
        :class="[item.className, item.active ? item.activeClass : '']"
        :style="floatStyle(item, 'fixed')"
      >
        {{ item.content }}
      </span>
    </Teleport>
  </template>
  <template v-if="mineZoneItems.length">
    <Teleport to="#mine-zone-floats">
      <span
        v-for="item in mineZoneItems"
        :key="item.id"
        :class="[item.className, item.active ? item.activeClass : '']"
        :style="floatStyle(item, 'absolute')"
      >
        {{ item.content }}
      </span>
    </Teleport>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FloatItem } from '../stores/floatingFeedback.js';
import { useFloatingFeedbackStore } from '../stores/floatingFeedback.js';

const store = useFloatingFeedbackStore();

const bodyItems = computed(() => store.items.filter((i) => i.parent === 'body'));
const mineZoneItems = computed(() => store.items.filter((i) => i.parent === 'mine-zone'));

function floatStyle(item: FloatItem, position: 'fixed' | 'absolute'): Record<string, string> {
  return {
    position,
    left: item.left + 'px',
    top: item.top + 'px',
  };
}
</script>

<style scoped>
span {
  pointer-events: none;
}
</style>
