<template>
  <div
    v-if="data"
    class="research-node-modal-overlay"
    aria-hidden="true"
    @click.self="emit('close')"
  >
    <div
      class="research-node-modal"
      role="dialog"
      :aria-labelledby="'research-node-modal-title-' + data.node.id"
    >
      <div class="research-node-modal-header">
        <h2
          :id="'research-node-modal-title-' + data.node.id"
          class="research-node-modal-title"
        >
          {{ data.name }}
        </h2>
        <button
          type="button"
          class="research-node-modal-close"
          :aria-label="t('close')"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <div class="research-node-modal-body">
        <ResearchCard
          :data="data"
          @attempt="(id, cardEl) => emit('attempt', id, cardEl)"
          @path-highlight="() => {}"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../application/strings.js';
import type { ResearchNodeDisplayData } from '../../application/researchDisplay.js';
import ResearchCard from './ResearchCard.vue';

defineProps<{
  data: ResearchNodeDisplayData | null;
}>();

const emit = defineEmits<{
  close: [];
  attempt: [id: string, cardEl: HTMLElement];
}>();
</script>

<style scoped>
.research-node-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.research-node-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
}

.research-node-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.research-node-modal-title {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--text);
}

.research-node-modal-close {
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
}

.research-node-modal-close:hover {
  color: var(--text);
  background: var(--bg-card);
}

.research-node-modal-body {
  padding: 1rem 1.25rem;
  overflow-y: auto;
  max-height: min(70vh, 480px);
}

.research-node-modal-body :deep(.research-card) {
  border-left-width: 4px;
}
</style>
