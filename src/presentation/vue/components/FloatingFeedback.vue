<template>
  <template v-if="bodyItems.length">
    <Teleport to="body">
      <span
        v-for="item in bodyItems"
        :key="item.id"
        :class="[item.className, activeIds.has(item.id) ? item.activeClass : '']"
        :style="floatStyle(item, 'fixed')"
        ref="(el) => setActiveAfterFrame(el, item.id)"
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
        :class="[item.className, activeIds.has(item.id) ? item.activeClass : '']"
        :style="floatStyle(item, 'absolute')"
        ref="(el) => setActiveAfterFrame(el, item.id)"
      >
        {{ item.content }}
      </span>
    </Teleport>
  </template>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { FloatItem } from '../stores/floatingFeedback.js';
import { useFloatingFeedbackStore } from '../stores/floatingFeedback.js';

const store = useFloatingFeedbackStore();
const activeIds = ref(new Set<number>());

const bodyItems = computed(() => store.items.filter((i) => i.parent === 'body'));
const mineZoneItems = computed(() => store.items.filter((i) => i.parent === 'mine-zone'));

function floatStyle(item: FloatItem, position: 'fixed' | 'absolute'): Record<string, string> {
  return {
    position,
    left: item.left + 'px',
    top: item.top + 'px',
  };
}

function setActiveAfterFrame(_el: unknown, id: number): void {
  requestAnimationFrame(() => {
    activeIds.value = new Set(activeIds.value).add(id);
  });
}

</script>

<style scoped>
span {
  pointer-events: none;
}
</style>
