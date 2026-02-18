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
    <div
      v-if="progress"
      class="research-progress-overlay"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="research-progress-track">
        <div
          class="research-progress-fill"
          :style="{
            width: progressBarWidth + '%',
            transition: progressBarTransitionMs > 0 ? `width ${progressBarTransitionMs}ms linear` : 'none',
          }"
        />
      </div>
      <span class="research-progress-label">{{ t('researching') }}</span>
      <button
        v-if="progress?.hasCancel"
        type="button"
        class="research-progress-cancel"
        @click="onCancelProgress"
      >
        {{ t('cancel') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { t, tParam } from '../../application/strings.js';
import type { ResearchNodeDisplayData } from '../../application/researchDisplay.js';
import { useAppUIStore } from '../stores/appUI.js';
import { getPresentationPort } from '../../application/uiBridge.js';

const appUI = storeToRefs(useAppUIStore());
const props = defineProps<{ data: ResearchNodeDisplayData }>();
const emit = defineEmits<{
  attempt: [id: string, cardEl: HTMLElement];
  pathHighlight: [unlockPathIds: string[]];
}>();

const cardRef = ref<HTMLElement | null>(null);

const progress = computed(() => appUI.researchProgress[props.data.node.id]);

const cardClasses = computed(() => [
  'research-card',
  props.data.done && 'research-card--done',
  props.data.isRecommended && 'research-card--recommended',
  props.data.isSecret && 'research-card--secret',
  progress.value && 'research-card--in-progress',
].filter(Boolean));

const progressBarWidth = ref(0);
const progressBarTransitionMs = ref(0);

watch(progress, (p) => {
  if (!p) {
    progressBarWidth.value = 0;
    return;
  }
  const now = Date.now();
  const remainingMs = Math.max(0, p.endTimeMs - now);
  const elapsed = p.totalDurationMs - remainingMs;
  const initialPercent = p.totalDurationMs > 0 ? Math.min(100, (elapsed / p.totalDurationMs) * 100) : 0;
  progressBarWidth.value = initialPercent;
  progressBarTransitionMs.value = remainingMs;
  nextTick(() => {
    progressBarWidth.value = 100;
  });
}, { immediate: true });

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

function onCancelProgress(): void {
  getPresentationPort().cancelResearchProgress(props.data.node.id);
}
</script>
