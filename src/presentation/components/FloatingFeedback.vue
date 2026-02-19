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

.float-coin {
  position: absolute;
  transform: translate(-50%, -50%);
  contain: layout style paint;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--accent);
  text-shadow: 0 0 8px var(--accent-glow);
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.6s ease;
  user-select: none;
  pointer-events: none;
  z-index: 55;
}

.float-coin--active {
  will-change: transform, opacity;
  opacity: 1;
  transform: translate(-50%, -50%) translateY(-28px);
}

.float-coin--lucky {
  color: #fde047;
  text-shadow: 0 0 12px rgba(253, 224, 71, 0.6);
  font-size: 1.4rem;
}

.float-coin--super-lucky {
  color: #fde047;
  font-size: 1.6rem;
  font-weight: 800;
  text-shadow: 0 0 16px rgba(253, 224, 71, 0.8);
}

.float-coin--critical {
  color: #f87171;
  font-size: 1.35rem;
  font-weight: 800;
  text-shadow: 0 0 14px rgba(248, 113, 113, 0.8);
}

.float-coin-combo {
  position: absolute;
  transform: translate(-50%, -50%);
  contain: layout style paint;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--accent);
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.6s ease;
  pointer-events: none;
  user-select: none;
  z-index: 3;
}

.float-coin-combo.float-coin--active {
  will-change: transform, opacity;
  opacity: 1;
  transform: translate(-50%, -50%) translateY(-42px);
}

.float-reward {
  position: fixed;
  contain: layout style paint;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--success);
  pointer-events: none;
  user-select: none;
  z-index: 60;
  opacity: 0;
  transform: translate(-50%, 0);
  transition: opacity 0.25s ease, transform 0.9s ease;
}

.float-reward--active {
  will-change: transform, opacity;
  opacity: 1;
  transform: translate(-50%, -48px);
}

@media (max-width: 360px) {
  .float-coin {
    font-size: 1rem;
  }
}
</style>
