<template>
  <div
    id="intro-overlay"
    class="intro-overlay"
    :class="{ 'intro-overlay--open': !!appUI.introBlockId }"
    :aria-hidden="!appUI.introBlockId"
    @click.self="onDismiss"
  >
    <div
      class="intro-modal"
      role="dialog"
      aria-labelledby="intro-title"
      aria-describedby="intro-body"
    >
      <h2 id="intro-title">{{ introTitle }}</h2>
      <p id="intro-body">{{ introBody }}</p>
      <div
        v-show="!appUI.introCanClose"
        id="intro-progress-wrap"
        class="intro-progress-wrap"
        :aria-hidden="appUI.introCanClose"
      >
        <div
          id="intro-progress-bar"
          class="intro-progress-bar"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(appUI.introProgress)"
          :style="{ width: appUI.introProgress + '%' }"
        />
      </div>
      <button
        ref="gotItRef"
        id="intro-got-it"
        type="button"
        class="intro-got-it"
        :disabled="!appUI.introCanClose"
        @click="onDismiss"
      >
        {{ t('gotIt') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useAppUIStore } from '../stores/appUI.js';
import { t } from '../../application/strings.js';
import type { StringKey } from '../../application/strings.js';
import { dismissIntroModal } from '../modals/intro.js';

const appUI = useAppUIStore();
const gotItRef = ref<HTMLButtonElement | null>(null);

const introTitle = computed(() => {
  const id = appUI.introBlockId;
  if (!id) return '';
  const key = ('progression' + id.charAt(0).toUpperCase() + id.slice(1) + 'Title') as StringKey;
  return t(key);
});

const introBody = computed(() => {
  const id = appUI.introBlockId;
  if (!id) return '';
  const key = ('progression' + id.charAt(0).toUpperCase() + id.slice(1) + 'Body') as StringKey;
  return t(key);
});

function onDismiss(): void {
  dismissIntroModal();
}

watch(
  () => appUI.introCanClose,
  (canClose) => {
    if (canClose) nextTick(() => gotItRef.value?.focus());
  }
);
</script>

<style scoped>
.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 101;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.intro-overlay--open {
  opacity: 1;
  visibility: visible;
}

.intro-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  padding: 1.5rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
}

.intro-modal h2 {
  margin: 0 0 0.75rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--accent);
}

.intro-modal p {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.5;
}

.intro-progress-wrap {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.intro-progress-bar {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), #fbbf24);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.intro-got-it {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--accent);
  background: rgba(245, 158, 11, 0.2);
  color: var(--accent);
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background 0.2s, border-color 0.2s;
}

.intro-got-it:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.35);
  border-color: #fbbf24;
}

.intro-got-it:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
