<template>
  <span
    class="research-icon"
    role="img"
    :aria-hidden="!ariaLabel"
    :aria-label="ariaLabel"
  >
    <span
      class="research-icon-sprite"
      :style="spriteStyle"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ResearchIconKey } from '../icons/researchIcons.js';
import {
  SPRITE_URL,
  SPRITE_COLS,
  SPRITE_ROWS,
  getSpriteIndex,
  getSpritePosition,
} from '../icons/spriteConfig.js';
import { getResearchSpriteIndexById } from '../../application/research.js';

const props = withDefaults(
  defineProps<{
    name: string;
    /** When set, icon index is computed from catalog (same icon everywhere: list, 3D, hover). */
    nodeId?: string;
    /** Fallback when nodeId not set (legacy). Prefer nodeId for research. */
    spriteIndex?: number;
    size?: number;
    ariaLabel?: string;
  }>(),
  { size: 24, ariaLabel: undefined }
);

const validKeys: ResearchIconKey[] = [
  'miner', 'scientist', 'pilot', 'medic', 'engineer',
  'expedition', 'click', 'production', 'refining', 'neural', 'secret', 'research',
];

const key = computed((): ResearchIconKey => {
  const k = props.name as ResearchIconKey;
  return validKeys.includes(k) ? k : 'research';
});

const spriteStyle = computed(() => {
  const index =
    props.nodeId != null
      ? getResearchSpriteIndexById(props.nodeId)
      : typeof props.spriteIndex === 'number'
        ? props.spriteIndex
        : getSpriteIndex(key.value);
  const pos = getSpritePosition(index);
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    backgroundImage: `url(${SPRITE_URL})`,
    backgroundSize: `${SPRITE_COLS * 100}% ${SPRITE_ROWS * 100}%`,
    backgroundPosition: `${pos.x} ${pos.y}`,
  };
});
</script>

<style scoped>
.research-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--accent);
}

.research-icon-sprite {
  display: block;
  flex-shrink: 0;
  background-repeat: no-repeat;
  border-radius: 50%;
}
</style>
