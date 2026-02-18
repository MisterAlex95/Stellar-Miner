<template>
  <div
    id="section-rules-overlay"
    class="section-rules-overlay"
    aria-hidden="true"
    @click.self="closeSectionRulesModal"
  >
    <div
      class="section-rules-modal"
      role="dialog"
      aria-labelledby="section-rules-title"
      aria-describedby="section-rules-body"
    >
      <div class="section-rules-header">
        <h2
          id="section-rules-title"
          class="section-rules-title"
        >
          {{ title }}
        </h2>
        <button
          id="section-rules-close"
          type="button"
          class="section-rules-close"
          :aria-label="t('close')"
          @click="closeSectionRulesModal"
        >
          ×
        </button>
      </div>
      <div class="section-rules-content">
        <div
          id="section-rules-body"
          class="section-rules-body"
        >
          <template v-for="(block, i) in rulesBlocks" :key="i">
            <ul v-if="block.type === 'list'" class="section-rules-list">
              <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
            </ul>
            <p v-else>{{ block.text }}</p>
          </template>
        </div>
      </div>
      <div class="section-rules-actions">
        <button
          id="section-rules-got-it"
          type="button"
          class="section-rules-got-it"
          @click="closeSectionRulesModal"
        >
          {{ t('gotIt') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { t, type StringKey } from '../../../application/strings.js';
import { closeSectionRulesModal } from '../mountModals.js';
import { useAppUIStore } from '../stores/appUI.js';

const appUI = useAppUIStore();

const title = computed(() => {
  const d = appUI.sectionRules;
  return d ? t(d.titleKey as StringKey) : '';
});

type RulesBlock = { type: 'list'; items: string[] } | { type: 'paragraph'; text: string };

function parseRulesContent(text: string): RulesBlock[] {
  const blocks: RulesBlock[] = [];
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let currentList: string[] | null = null;
  for (const line of lines) {
    const isListItem = line.startsWith('- ') || line.startsWith('• ');
    const content = isListItem ? line.slice(2).trim() : line;
    if (isListItem) {
      if (!currentList) {
        currentList = [];
        blocks.push({ type: 'list', items: currentList });
      }
      currentList.push(content);
    } else {
      currentList = null;
      blocks.push({ type: 'paragraph', text: content });
    }
  }
  return blocks;
}

const rulesBlocks = computed(() => {
  const d = appUI.sectionRules;
  if (!d) return [];
  return parseRulesContent(t(d.rulesKey as StringKey));
});
</script>
