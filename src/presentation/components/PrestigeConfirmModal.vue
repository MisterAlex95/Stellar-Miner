<template>
  <div
    id="prestige-confirm-overlay"
    class="prestige-confirm-overlay"
    aria-hidden="true"
    @click.self="closePrestigeConfirmModal"
  >
    <div
      class="prestige-confirm-modal"
      role="alertdialog"
      aria-labelledby="prestige-confirm-title"
      aria-describedby="prestige-confirm-desc"
    >
      <h2 id="prestige-confirm-title">{{ t('prestigeConfirmTitle') }}</h2>
      <p v-if="appUI.prestigeConfirmChapterTitle" id="prestige-confirm-chapter" class="prestige-confirm-chapter">
        {{ appUI.prestigeConfirmChapterTitle }}
      </p>
      <p v-if="appUI.prestigeConfirmChapterQuote" class="prestige-confirm-quote">"{{ appUI.prestigeConfirmChapterQuote }}"</p>
      <p id="prestige-confirm-desc">{{ appUI.prestigeConfirmDesc }}</p>
      <p id="prestige-confirm-after" class="prestige-confirm-after">{{ appUI.prestigeConfirmAfter }}</p>
      <p v-if="appUI.prestigeConfirmGainEstimate" id="prestige-confirm-gain" class="prestige-confirm-gain">
        {{ appUI.prestigeConfirmGainEstimate }}
      </p>
      <p class="prestige-confirm-run-bonus-title">{{ t('prestigeRunBonusTitle') }}</p>
      <div class="prestige-confirm-choices" role="group" aria-label="Run bonus">
        <button
          v-for="choice in prestigeChoices"
          :key="choice.id"
          type="button"
          class="prestige-confirm-choice"
          :class="{ 'prestige-confirm-choice--selected': selectedChoiceId === choice.id }"
          @click="selectedChoiceId = choice.id"
        >
          <span class="prestige-confirm-choice-label">{{ t(choice.labelKey) }}</span>
          <span v-if="choice.flavorKey" class="prestige-confirm-choice-flavor">{{ t(choice.flavorKey) }}</span>
        </button>
      </div>
      <div class="prestige-confirm-actions">
        <button
          id="prestige-confirm-cancel"
          type="button"
          class="prestige-confirm-cancel"
          @click="closePrestigeConfirmModal"
        >
          {{ t('cancel') }}
        </button>
        <button
          id="prestige-confirm-do"
          type="button"
          class="prestige-confirm-do"
          @click="doConfirm"
        >
          {{ t('prestige') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { t } from '../../application/strings.js';
import { closePrestigeConfirmModal, confirmPrestige } from '../../application/handlers.js';
import { PRESTIGE_CHOICES } from '../../application/catalogs.js';
import { useAppUIStore } from '../stores/appUI.js';

const appUI = storeToRefs(useAppUIStore());
const prestigeChoices = PRESTIGE_CHOICES;
const selectedChoiceId = ref<string | null>(PRESTIGE_CHOICES[0]?.id ?? null);

function doConfirm(): void {
  confirmPrestige(selectedChoiceId.value);
}
</script>

<style scoped>
.prestige-confirm-overlay {
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

.prestige-confirm-overlay--open {
  opacity: 1;
  visibility: visible;
}

.prestige-confirm-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 360px;
  max-height: min(85vh, 640px);
  padding: 1.5rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.prestige-confirm-modal h2 {
  margin: 0 0 0.75rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--text);
}

.prestige-confirm-chapter {
  margin: 0 0 0.25rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent);
}

.prestige-confirm-quote {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-style: italic;
  color: var(--text-dim);
}

.prestige-confirm-modal p {
  margin: 0 0 1.25rem 0;
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.4;
}

.prestige-confirm-after {
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.prestige-confirm-gain {
  margin-bottom: 1rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: var(--success, #22c55e);
  font-weight: 700;
  font-size: 0.95rem;
}

.prestige-confirm-run-bonus-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.prestige-confirm-choices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.prestige-confirm-choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 2px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  cursor: pointer;
  font-family: 'Exo 2', sans-serif;
  font-size: 0.9rem;
  transition: border-color 0.2s, background 0.2s;
}

.prestige-confirm-choice:hover {
  border-color: var(--accent);
  background: var(--bg-panel);
}

.prestige-confirm-choice--selected {
  border-color: var(--accent);
  background: rgba(245, 158, 11, 0.15);
  box-shadow: 0 0 0 1px var(--accent);
}

.prestige-confirm-choice-label {
  font-weight: 600;
  color: var(--accent);
}

.prestige-confirm-choice-flavor {
  margin-top: 0.2rem;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.prestige-confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.prestige-confirm-cancel {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.95rem;
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.prestige-confirm-cancel:hover {
  background: var(--bg-panel);
  border-color: var(--accent);
}

.prestige-confirm-do {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  border: 2px solid var(--accent);
  background: rgba(245, 158, 11, 0.25);
  color: var(--accent);
  cursor: pointer;
  box-shadow: 0 0 16px rgba(245, 158, 11, 0.3);
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}

.prestige-confirm-do:hover {
  background: rgba(245, 158, 11, 0.4);
  border-color: #fbbf24;
  box-shadow: 0 0 24px rgba(251, 191, 36, 0.45);
  transform: scale(1.02);
}
</style>
