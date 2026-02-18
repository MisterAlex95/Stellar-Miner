<template>
  <section
    :id="id"
    :class="[
      'gameplay-block',
      unlocked ? 'gameplay-block--unlocked' : 'gameplay-block--locked',
      sectionClass,
      { 'gameplay-block--collapsed': isCollapsed },
    ]"
    :data-block="dataBlock"
  >
    <div class="gameplay-block-header">
      <h2 :id="titleId">{{ t(titleKey) }}</h2>
      <span class="gameplay-block-summary" :id="summaryId" aria-hidden="true">{{ summary }}</span>
      <div class="gameplay-block-header-actions">
        <button
          v-if="rulesKey"
          type="button"
          class="gameplay-block-rules-btn"
          :data-rules-key="rulesKey"
          :data-title-key="titleKey"
          :aria-label="t('sectionRulesAria')"
          @click="onRulesClick"
        >
          ?
        </button>
        <button
          type="button"
          class="gameplay-block-toggle"
          :aria-expanded="!isCollapsed"
          :aria-label="isCollapsed ? t('expandSection') : t('collapseSection')"
          :title="isCollapsed ? t('expandSection') : t('collapseSection')"
          @click="toggle"
        >
          <span class="gameplay-block-toggle-icon" aria-hidden="true">{{ isCollapsed ? '▶' : '▼' }}</span>
        </button>
      </div>
    </div>
    <div class="gameplay-block-body">
      <slot></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { t } from '../../application/strings.js';
import { openSectionRulesModal } from '../mountModals.js';

const props = withDefaults(
  defineProps<{
    id: string;
    sectionClass: string;
    titleKey: string;
    dataBlock?: string;
    rulesKey?: string;
    summary?: string;
    unlocked?: boolean;
  }>(),
  { dataBlock: undefined, rulesKey: undefined, summary: '', unlocked: true }
);

const STORAGE_PREFIX = 'stellar-miner-collapsed-';

const isCollapsed = ref(false);

const titleId = computed(() => `${props.id}-title`);
const summaryId = computed(() => `${props.id}-summary`);

function toggle(): void {
  isCollapsed.value = !isCollapsed.value;
  try {
    localStorage.setItem(STORAGE_PREFIX + props.id, isCollapsed.value ? '1' : '0');
  } catch {
    // ignore
  }
}

function onRulesClick(): void {
  if (props.rulesKey) openSectionRulesModal(props.rulesKey, props.titleKey);
}

onMounted(() => {
  try {
    isCollapsed.value = localStorage.getItem(STORAGE_PREFIX + props.id) === '1';
  } catch {
    // ignore
  }
});
</script>
