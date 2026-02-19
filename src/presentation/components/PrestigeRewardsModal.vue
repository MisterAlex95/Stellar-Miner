<template>
  <div
    id="prestige-rewards-overlay"
    class="prestige-rewards-overlay"
    aria-hidden="true"
    @click.self="closePrestigeRewardsModal"
  >
    <div
      class="prestige-rewards-modal"
      role="dialog"
      aria-labelledby="prestige-rewards-title"
      aria-describedby="prestige-rewards-desc"
    >
      <h2 id="prestige-rewards-title">{{ t('prestigeRewardsTitle') }}</h2>
      <p
        id="prestige-rewards-desc"
        class="prestige-rewards-intro"
      >
        {{ t('prestigeRewardsIntro') }}
      </p>
      <ul
        id="prestige-rewards-list"
        class="prestige-rewards-list"
        aria-describedby="prestige-rewards-desc"
      >
        <li
          v-for="(line, i) in prestigeRewardsLevels"
          :key="i"
        >
          {{ line }}
        </li>
      </ul>
      <div class="prestige-confirm-actions">
        <button
          id="prestige-rewards-close"
          type="button"
          class="prestige-confirm-cancel"
          @click="closePrestigeRewardsModal"
        >
          {{ t('gotIt') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { t } from '../../application/strings.js';
import { closePrestigeRewardsModal } from '../../application/handlers.js';
import { useAppUIStore } from '../stores/appUI.js';

const { prestigeRewardsLevels } = storeToRefs(useAppUIStore());
</script>

<style scoped>
.prestige-rewards-overlay {
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

.prestige-rewards-overlay--open {
  opacity: 1;
  visibility: visible;
}

.prestige-rewards-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow: auto;
  padding: 1.5rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
}

.prestige-rewards-modal h2 {
  margin: 0 0 0.5rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--text);
}

.prestige-rewards-intro {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.4;
}

.prestige-rewards-list {
  margin: 0 0 1.25rem 0;
  padding-left: 1.25rem;
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.5;
}

.prestige-rewards-list li {
  margin-bottom: 0.35rem;
}

.prestige-confirm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
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
</style>
