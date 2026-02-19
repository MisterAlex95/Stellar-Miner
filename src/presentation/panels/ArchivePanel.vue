<template>
  <div class="archive-panel">
    <p class="archive-intro">{{ t('codexIntro') }}</p>
    <div class="ship-log" role="log" aria-label="Ship log">
      <template v-if="logEntries.length > 0">
        <div
          v-for="entry in logEntries"
          :key="entry.id"
          class="ship-log-line"
        >
          <div class="ship-log-head">
            <span class="ship-log-time">[{{ formatTime(entry.at) }}]</span>
            <span class="ship-log-tag">{{ (entry.category || 'log').toUpperCase() }}</span>
            <span class="ship-log-title">{{ entry.title }}</span>
          </div>
          <p class="ship-log-body">{{ entry.body }}</p>
        </div>
      </template>
      <p v-else class="ship-log-empty">{{ t('codexLockedPlaceholder') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../application/strings.js';
import { useCodexData } from '../composables/useCodexData.js';

const { logEntries } = useCodexData();

function formatTime(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return '--:--:--';
  const d = new Date(ms);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
</script>

<style scoped>
.archive-panel {
  padding: 0.5rem 0;
}

.archive-intro {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.ship-log {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  max-height: min(60vh, 420px);
  overflow-y: auto;
  overflow-x: hidden;
  font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text);
  box-shadow: var(--panel-shadow);
}

.ship-log::-webkit-scrollbar {
  width: 6px;
}

.ship-log::-webkit-scrollbar-track {
  background: var(--bg-panel);
  border-radius: 3px;
}

.ship-log::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.ship-log-line {
  margin-bottom: 0.85rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--border);
}

.ship-log-line:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.ship-log-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.5rem;
}

.ship-log-time {
  color: var(--accent);
  flex-shrink: 0;
}

.ship-log-tag {
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  flex-shrink: 0;
}

.ship-log-title {
  font-weight: 600;
  color: var(--text);
  min-width: 0;
}

.ship-log-body {
  margin: 0.35rem 0 0 0;
  padding-left: 0;
  color: var(--text-dim);
  font-size: 0.72rem;
  line-height: 1.45;
}

.ship-log-empty {
  margin: 0;
  font-style: italic;
  color: var(--text-dim);
}
</style>
