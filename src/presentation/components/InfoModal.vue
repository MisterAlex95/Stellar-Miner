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
