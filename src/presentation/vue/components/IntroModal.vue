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
import { t } from '../../../application/strings.js';
import type { StringKey } from '../../../application/strings.js';
import { dismissIntroModal } from '../../modals/introModal.js';

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
