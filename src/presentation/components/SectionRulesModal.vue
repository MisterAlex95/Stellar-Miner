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
import { t, type StringKey } from '../../application/strings.js';
import { closeSectionRulesModal } from '../modals/mount.js';
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

<style scoped>
.section-rules-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.6);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.section-rules-overlay--open {
  opacity: 1;
  visibility: visible;
}

.section-rules-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 440px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.section-rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.25rem 1.25rem 0.75rem;
  flex-shrink: 0;
}

.section-rules-title {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.02em;
}

.section-rules-close {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-dim);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s, background 0.2s;
}

.section-rules-close:hover {
  color: var(--text);
  background: var(--bg-card);
}

.section-rules-content {
  padding: 0 1.25rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.section-rules-body {
  margin: 0;
  padding: 1rem 1.25rem;
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--text);
}

.section-rules-body > p {
  margin: 0 0 0.75rem;
}

.section-rules-body > p:last-child,
.section-rules-body > .section-rules-list:last-child {
  margin-bottom: 0;
}

.section-rules-body .section-rules-list {
  margin: 0.5rem 0 0.75rem 1.25rem;
  padding: 0;
  list-style: disc;
}

.section-rules-body .section-rules-list li {
  margin-bottom: 0.35rem;
}

.section-rules-actions {
  padding: 1rem 1.25rem 1.25rem;
  flex-shrink: 0;
  border-top: 1px solid var(--border);
}

.section-rules-got-it {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.6rem 1.5rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  cursor: pointer;
  width: 100%;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.section-rules-got-it:hover:not(:disabled) {
  background: var(--bg-panel);
  border-color: var(--text-dim);
}
</style>
