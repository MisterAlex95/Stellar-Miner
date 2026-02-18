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

/** Local progress set on click so overlay shows immediately before store update (e.g. when panel uses same Pinia but update is async). */
const localProgress = ref<{ endTimeMs: number; totalDurationMs: number; hasCancel: boolean } | null>(null);

const progress = computed(() => {
  const fromStore = appUI.researchProgress[props.data.node.id];
  const raw = fromStore ?? (localProgress.value && !props.data.done ? localProgress.value : null);
  if (!raw) return undefined;
  if (Date.now() > raw.endTimeMs + 50) return undefined;
  return raw;
});

const cardClasses = computed(() => [
  'research-card',
  props.data.done && 'research-card--done',
  props.data.isRecommended && 'research-card--recommended',
  props.data.isSecret && 'research-card--secret',
  progress.value && 'research-card--in-progress',
].filter(Boolean));

const progressBarWidth = ref(0);
const progressBarTransitionMs = ref(0);
let hideOverlayTimeoutId: ReturnType<typeof setTimeout> | null = null;

watch(() => appUI.researchProgress[props.data.node.id], () => {
  localProgress.value = null;
});

watch(progress, (p) => {
  if (hideOverlayTimeoutId) {
    clearTimeout(hideOverlayTimeoutId);
    hideOverlayTimeoutId = null;
  }
  if (!p) {
    progressBarWidth.value = 0;
    progressBarTransitionMs.value = 0;
    localProgress.value = null;
    return;
  }
  const now = Date.now();
  const remainingMs = Math.max(0, p.endTimeMs - now);
  const elapsed = p.totalDurationMs - remainingMs;
  const initialPercent = p.totalDurationMs > 0 ? Math.min(100, (elapsed / p.totalDurationMs) * 100) : 0;
  progressBarWidth.value = initialPercent;
  progressBarTransitionMs.value = remainingMs;
  hideOverlayTimeoutId = setTimeout(() => {
    hideOverlayTimeoutId = null;
    localProgress.value = null;
  }, remainingMs + 100);
  nextTick(() => {
    requestAnimationFrame(() => {
      progressBarWidth.value = 100;
    });
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
  const totalDurationMs = Math.max(500, props.data.durationSec * 1000);
  const endTimeMs = Date.now() + totalDurationMs;
  localProgress.value = { endTimeMs, totalDurationMs, hasCancel: true };
  emit('attempt', props.data.node.id, cardRef.value);
}

function onCancelProgress(): void {
  localProgress.value = null;
  getPresentationPort().cancelResearchProgress(props.data.node.id);
}
</script>
