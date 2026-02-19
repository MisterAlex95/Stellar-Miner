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
      <p id="prestige-confirm-desc">{{ appUI.prestigeConfirmDesc }}</p>
      <p id="prestige-confirm-after" class="prestige-confirm-after">{{ appUI.prestigeConfirmAfter }}</p>
      <p v-if="appUI.prestigeConfirmGainEstimate" id="prestige-confirm-gain" class="prestige-confirm-gain">
        {{ appUI.prestigeConfirmGainEstimate }}
      </p>
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
          @click="confirmPrestige"
        >
          {{ t('prestige') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { t } from '../../application/strings.js';
import { closePrestigeConfirmModal, confirmPrestige } from '../../application/handlers.js';
import { useAppUIStore } from '../stores/appUI.js';

const appUI = storeToRefs(useAppUIStore());
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
  padding: 1.5rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
}

.prestige-confirm-modal h2 {
  margin: 0 0 0.75rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--text);
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
