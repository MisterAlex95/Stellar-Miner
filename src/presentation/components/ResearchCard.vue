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

<style scoped>
.research-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left-width: 4px;
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  min-width: 0;
  overflow: visible;
}

.research-card--compact {
  padding: 0.4rem 0.6rem;
}

.research-card--compact .research-card-body {
  display: flex;
  align-items: center;
  gap: 0.4rem 0.5rem;
  min-width: 0;
  flex-wrap: nowrap;
}

.research-card--compact .research-card-name {
  flex: 1;
  min-width: 0;
  white-space: normal;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  text-overflow: ellipsis;
}

.research-card-info-block {
  margin-top: 0.35rem;
  min-width: 0;
}

.research-card-info-block .research-card-meta:last-child {
  margin-bottom: 0.4rem;
}

.research-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  row-gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.4rem;
  min-width: 0;
}

.research-card-footer .research-card-meta {
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
}

.research-card-footer .research-card-expected,
.research-card-footer .research-card-duration,
.research-card-footer .research-card-data-req,
.research-card-footer .research-card-pity {
  min-width: 0;
  overflow-wrap: break-word;
}

.research-card-footer .research-card-data-req {
  flex: 1 1 0;
  max-width: 100%;
}

.research-card-footer .research-attempt-btn {
  flex-shrink: 0;
}

.research-card-footer :deep(.btn-tooltip-wrap) {
  flex-shrink: 0;
}

.research-card-desc,
.research-card-prereq {
  overflow-wrap: break-word;
}

.research-card-name {
  word-break: normal;
  overflow-wrap: normal;
  min-width: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text);
  letter-spacing: 0.02em;
}

.research-card:hover {
  border-color: rgba(245, 158, 11, 0.35);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(245, 158, 11, 0.08);
}

.research-card--path-highlight {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
}

.research-card--done {
  border-color: rgba(34, 197, 94, 0.35);
  border-left-color: var(--success);
}

.research-card-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  min-width: 0;
  padding-bottom: 0.45rem;
  margin-bottom: 0.25rem;
  border-bottom: 1px solid rgba(42, 47, 61, 0.5);
}

.research-card-level {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.2);
  color: var(--accent);
  font-size: 0.7rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.research-card--done .research-card-level {
  background: rgba(34, 197, 94, 0.2);
  color: var(--success);
}

.research-card-tier {
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 600;
}

.research-card-desc {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin: 0 0 0.35rem 0;
  line-height: 1.35;
  opacity: 0.95;
}

.research-card-mods,
.research-card-mods-preview,
.research-card-mods--done {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--accent);
  margin: 0;
}

.research-card-mods--done {
  color: var(--success);
}

.research-card .research-card-mods-preview {
  margin: 0 0 0.3rem 0;
  display: block;
}

.research-card-prereq {
  font-size: 0.7rem;
  color: var(--muted);
  margin: 0 0 0.4rem 0;
}

.research-card-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.78rem;
  color: var(--text-dim);
}

.research-card-cost {
  color: var(--accent);
  font-weight: 600;
}

.research-card-chance {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.research-attempt-btn {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: rgba(245, 158, 11, 0.12);
  color: var(--accent);
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.research-attempt-btn:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.22);
  box-shadow: 0 0 14px var(--accent-glow);
}

.research-attempt-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.research-attempt-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.research-card--in-progress {
  pointer-events: none;
}

.research-card--in-progress .research-progress-overlay {
  pointer-events: auto;
}

.research-progress-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 11, 15, 0.85);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.75rem;
}

.research-progress-track {
  width: 100%;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.research-progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), rgba(245, 158, 11, 0.8));
  border-radius: 3px;
  transition: width 2.5s linear;
}

.research-progress-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.05em;
}

.research-progress-cancel {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--text-dim);
  background: var(--bg-panel);
  color: var(--text);
  cursor: pointer;
  margin-top: 0.25rem;
}

.research-progress-cancel:hover {
  background: var(--border);
}

.research-card--recommended {
  border-color: rgba(100, 180, 255, 0.5);
  box-shadow: 0 0 0 1px rgba(100, 180, 255, 0.2);
}

.research-card--secret {
  border-style: dashed;
  opacity: 0.95;
}

.research-card-expected,
.research-card-duration,
.research-card-data-req,
.research-card-pity {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin: 0.15rem 0 0 0;
}

@media (max-width: 768px) {
  .research-card {
    padding: 0.6rem 0.75rem;
  }

  .research-card--compact {
    padding: 0.35rem 0.5rem;
  }

  .research-card--compact .research-card-body {
    flex-wrap: wrap;
  }

  .research-card-name {
    font-size: 0.8rem;
  }

  .research-card-desc {
    font-size: 0.72rem;
  }

  .research-card-meta {
    font-size: 0.75rem;
  }

  .research-attempt-btn {
    font-size: 0.7rem;
    padding: 0.22rem 0.55rem;
  }

  .research-card-level {
    width: 1.25rem;
    height: 1.25rem;
    font-size: 0.65rem;
  }
}

@media (max-width: 480px) {
  .research-card {
    padding: 0.55rem 0.65rem;
    border-radius: 10px;
  }

  .research-card--compact {
    padding: 0.3rem 0.5rem;
  }

  .research-card-header {
    padding-bottom: 0.35rem;
    margin-bottom: 0.2rem;
  }

  .research-card-name {
    font-size: 0.85rem;
  }

  .research-card-mods-preview {
    font-size: 0.68rem;
  }

  .research-card-desc {
    font-size: 0.7rem;
    margin: 0 0 0.25rem 0;
  }

  .research-card-prereq {
    font-size: 0.65rem;
    margin: 0 0 0.3rem 0;
  }

  .research-card-meta {
    gap: 0.5rem;
    margin-bottom: 0.4rem;
    font-size: 0.72rem;
  }

  .research-attempt-btn {
    font-size: 0.68rem;
    padding: 0.2rem 0.5rem;
  }

  .research-progress-overlay {
    padding: 0.5rem;
    gap: 0.4rem;
  }

  .research-progress-track {
    height: 5px;
  }

  .research-progress-label {
    font-size: 0.7rem;
  }

  .research-card-level {
    width: 1.15rem;
    height: 1.15rem;
    font-size: 0.6rem;
  }
}

@media (max-width: 360px) {
  .research-card {
    padding: 0.45rem 0.55rem;
  }

  .research-card-name {
    font-size: 0.74rem;
  }

  .research-card-desc,
  .research-card-prereq {
    font-size: 0.65rem;
  }

  .research-card-meta {
    font-size: 0.68rem;
  }

  .research-attempt-btn {
    font-size: 0.65rem;
    padding: 0.18rem 0.45rem;
  }

  .research-card-level {
    width: 1rem;
    height: 1rem;
    font-size: 0.58rem;
  }
}
</style>
