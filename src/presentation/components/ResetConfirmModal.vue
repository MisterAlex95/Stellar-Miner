<template>
  <div
    id="reset-confirm-overlay"
    class="reset-confirm-overlay"
    aria-hidden="true"
    @click.self="closeResetConfirmModal"
  >
    <div
      class="reset-confirm-modal"
      role="alertdialog"
      aria-labelledby="reset-confirm-title"
      aria-describedby="reset-confirm-desc"
    >
      <h2 id="reset-confirm-title">{{ t('resetConfirmTitle') }}</h2>
      <p id="reset-confirm-desc">{{ t('resetConfirmDesc') }}</p>
      <div class="reset-confirm-actions">
        <button
          id="reset-confirm-cancel"
          type="button"
          class="reset-confirm-cancel"
          @click="closeResetConfirmModal"
        >
          {{ t('cancel') }}
        </button>
        <button
          id="reset-confirm-reset"
          type="button"
          class="reset-confirm-reset"
          @click="handleResetProgress"
        >
          {{ t('resetAll') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../application/strings.js';
import { closeResetConfirmModal, handleResetProgress } from '../../application/handlers.js';
</script>

<style scoped>
.reset-confirm-overlay {
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

.reset-confirm-overlay--open {
  opacity: 1;
  visibility: visible;
}

.reset-confirm-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 360px;
  padding: 1.5rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
}

.reset-confirm-modal h2 {
  margin: 0 0 0.75rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--text);
}

.reset-confirm-modal p {
  margin: 0 0 1.25rem 0;
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.4;
}

.reset-confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.reset-confirm-cancel {
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

.reset-confirm-cancel:hover {
  background: var(--bg-panel);
  border-color: var(--accent);
}

.reset-confirm-reset {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  border: 1px solid #dc2626;
  background: rgba(220, 38, 38, 0.2);
  color: #f87171;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.reset-confirm-reset:hover {
  background: rgba(220, 38, 38, 0.35);
  border-color: #ef4444;
}
</style>
