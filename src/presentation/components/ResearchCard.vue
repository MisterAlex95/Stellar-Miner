<template>
  <div
    ref="cardRef"
    :class="cardClasses"
    :data-research-id="data.node.id"
    :data-unlock-path="data.unlockPathIds.join(',')"
    :data-level="data.levelLabel"
    role="treeitem"
    :aria-selected="data.done"
    :title="data.pathTitle"
    @mouseenter="$emit('pathHighlight', data.unlockPathIds)"
  >
    <div class="research-card-header">
      <span class="research-card-name">{{ data.name }}</span>
    </div>
    <div class="research-card-info-block">
      <p class="research-card-desc">{{ data.desc }}</p>
      <p v-if="data.modText && data.modText !== '—'" class="research-card-mods research-card-mods-preview">
        {{ t('researchEffectsLabel') }} {{ data.modText }}
      </p>
      <p v-if="data.prereqText && !data.done" class="research-card-prereq">
        {{ tParam('researchRequires', { names: data.prereqText }) }}
      </p>
    </div>
    <template v-if="!data.done">
      <div class="research-card-footer">
        <p class="research-card-meta">
          <span class="research-card-cost">{{ data.costStr }} ⬡</span>
          <span class="research-card-chance">{{ chanceText }}</span>
        </p>
        <p v-if="data.expectedCostStr" class="research-card-expected">{{ data.expectedCostStr }}</p>
        <p class="research-card-duration">{{ tParam('researchDurationSec', { sec: data.durationSec }) }}</p>
        <p v-if="data.dataCost > 0" class="research-card-data-req">
          {{ tParam('researchDataRequirement', { n: String(data.dataCost) }) }}
        </p>
        <p v-if="data.hasPity" class="research-card-pity">{{ t('researchPityNext') }}</p>
        <button
          type="button"
          class="research-attempt-btn"
          :disabled="!data.canAttempt"
          :title="attemptTitle"
          @click="onAttemptClick"
        >
          {{ t('attempt') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { t, tParam } from '../../application/strings.js';
import type { ResearchNodeDisplayData } from '../../application/researchDisplay.js';

const props = defineProps<{ data: ResearchNodeDisplayData }>();
const emit = defineEmits<{
  attempt: [id: string, cardEl: HTMLElement];
  pathHighlight: [unlockPathIds: string[]];
}>();

const cardRef = ref<HTMLElement | null>(null);

const cardClasses = computed(() => [
  'research-card',
  props.data.done && 'research-card--done',
  props.data.isRecommended && 'research-card--recommended',
  props.data.isSecret && 'research-card--secret',
].filter(Boolean));

const chanceText = computed(() =>
  props.data.scientistBonusPct > 0
    ? `${tParam('percentSuccess', { pct: props.data.effectivePct })} ${tParam('researchScientistBonus', { pct: props.data.scientistBonusPct })}`
    : tParam('percentSuccess', { pct: props.data.effectivePct })
);

const attemptTitle = computed(() =>
  props.data.canAttempt
    ? tParam('researchAttemptTooltip', { pct: props.data.effectivePct })
    : t('researchAttemptDisabled')
);

function onAttemptClick(): void {
  if (!props.data.canAttempt || !cardRef.value) return;
  emit('attempt', props.data.node.id, cardRef.value);
}
</script>
