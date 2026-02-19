<template>
  <div
    id="info-overlay"
    class="info-overlay"
    aria-hidden="true"
    @click.self="closeInfoModal"
  >
    <div
      class="info-modal"
      role="dialog"
      aria-labelledby="info-title"
    >
      <div class="info-header">
        <h2 id="info-title">{{ t('infoTitle') }}</h2>
        <button
          id="info-close"
          type="button"
          class="info-close"
          :aria-label="t('close')"
          @click="closeInfoModal"
        >
          ×
        </button>
      </div>
      <div class="info-body">
        <div class="info-version-row">
          <span class="info-version-label">{{ t('infoVersionLabel') }}</span>
          <span
            id="info-version-value"
            class="info-version-value"
          >{{ appUI.infoVersion || '–' }}</span>
        </div>
        <div
          id="info-changelog-list"
          class="info-changelog-list"
          role="list"
        >
          <template v-if="changelog.length === 0">
            <p class="changelog-empty">—</p>
          </template>
          <details
            v-for="(entry, i) in changelog"
            v-else
            :key="entry.version"
            class="changelog-entry"
            :open="i === 0"
          >
            <summary class="changelog-entry-header">
              v{{ entry.version }} <span class="changelog-date">{{ entry.date }}</span>
            </summary>
            <ul class="changelog-changes">
              <li v-for="(change, j) in entry.changes" :key="j">{{ change }}</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { t } from '../../application/strings.js';
import { closeInfoModal } from '../modals/mount.js';
import { useAppUIStore } from '../stores/appUI.js';
import { getChangelog } from '../../application/changelog.js';

const appUI = useAppUIStore();
const changelog = computed(() => getChangelog());
</script>

<style scoped>
.info-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.info-overlay--open {
  opacity: 1;
  visibility: visible;
}

.info-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.info-header h2 {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--text);
}

.info-close {
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

.info-close:hover {
  color: var(--text);
  background: var(--bg-card);
}

.info-body {
  padding: 1rem 1.25rem;
  overflow-y: auto;
  max-height: min(60vh, 400px);
  scrollbar-gutter: stable;
}

.info-version-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.info-version-label {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.info-version-value {
  font-size: 0.9rem;
  font-family: var(--font-mono, monospace);
  color: var(--text);
}

.info-changelog-list {
  font-size: 0.85rem;
  line-height: 1.4;
}

.info-changelog-list .changelog-entry {
  margin-bottom: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.info-changelog-list .changelog-entry:last-child {
  margin-bottom: 0;
}

.info-changelog-list .changelog-entry summary.changelog-entry-header {
  font-weight: 600;
  color: var(--accent);
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  user-select: none;
}

.info-changelog-list .changelog-entry summary.changelog-entry-header::-webkit-details-marker,
.info-changelog-list .changelog-entry summary.changelog-entry-header::marker {
  display: none;
}

.info-changelog-list .changelog-entry summary.changelog-entry-header::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 5px solid var(--text-dim);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.info-changelog-list .changelog-entry[open] summary.changelog-entry-header::before {
  transform: rotate(90deg);
}

.info-changelog-list .changelog-entry summary.changelog-entry-header:hover {
  background: var(--bg-card);
}

.info-changelog-list .changelog-date {
  font-weight: 400;
  color: var(--text-dim);
  font-size: 0.8rem;
}

.info-changelog-list .changelog-changes {
  margin: 0;
  padding: 0.5rem 0.75rem 0.75rem 1.5rem;
  color: var(--text);
  border-top: 1px solid var(--border);
}

.changelog-empty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-dim);
}
</style>
