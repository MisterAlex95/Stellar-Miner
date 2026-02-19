<template>
  <div
    :id="ACHIEVEMENTS_OVERLAY_ID"
    class="achievements-overlay"
    aria-hidden="true"
    @click.self="closeAchievementsModal"
  >
    <div
      class="achievements-modal"
      role="dialog"
      :aria-labelledby="achievementsTitleId"
    >
      <div class="achievements-modal-header">
        <h2 :id="achievementsTitleId">{{ t('achievementsTitle') }}</h2>
        <button
          id="achievements-modal-close"
          type="button"
          class="achievements-modal-close"
          :aria-label="t('close')"
          @click="closeAchievementsModal"
        >
          ×
        </button>
      </div>
      <div class="achievements-modal-body">
        <div class="achievements-modal-list">
          <div
            v-for="a in achievementItems"
            :key="a.id"
            class="achievement-modal-item"
            :class="'achievement-modal-item--' + (a.isUnlocked ? 'unlocked' : 'locked')"
          >
            {{ a.isUnlocked ? '✓' : '×' }}
            <span class="achievement-modal-name">{{ a.name }}</span>
            <p v-if="a.desc" class="achievement-modal-desc">{{ a.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { t } from '../../application/strings.js';
import {
  closeAchievementsModal,
  ACHIEVEMENTS_OVERLAY_ID,
} from '../modals/mount.js';
import { ACHIEVEMENTS, getUnlockedAchievements } from '../../application/achievements.js';
import { getCatalogAchievementName, getCatalogAchievementDesc } from '../../application/i18nCatalogs.js';

const achievementsTitleId = 'achievements-modal-title';

const achievementItems = computed(() => {
  const unlocked = getUnlockedAchievements();
  return ACHIEVEMENTS.map((a) => {
    const isUnlocked = unlocked.has(a.id);
    const showDesc = isUnlocked || !a.secret;
    const name = isUnlocked
      ? getCatalogAchievementName(a.id)
      : a.secret
        ? t('achievementSecret')
        : getCatalogAchievementName(a.id);
    const desc = showDesc ? getCatalogAchievementDesc(a.id) : '';
    return { id: a.id, name, desc, isUnlocked };
  });
});
</script>

<style scoped>
.achievements-overlay {
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

.achievements-overlay--open {
  opacity: 1;
  visibility: visible;
}

.achievements-modal {
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

.achievements-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.achievements-modal-header h2 {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--text);
}

.achievements-modal-close {
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

.achievements-modal-close:hover {
  color: var(--text);
  background: var(--bg-card);
}

.achievements-modal-body {
  padding: 1rem 1.25rem;
  overflow-y: auto;
  max-height: min(60vh, 400px);
  scrollbar-gutter: stable;
}

.achievements-modal-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.achievement-modal-item {
  font-size: 0.9rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.achievement-modal-item:last-child {
  border-bottom: none;
}

.achievement-modal-item--unlocked {
  color: var(--text);
}

.achievement-modal-item--unlocked .achievement-modal-name {
  color: var(--accent);
}

.achievement-modal-item--locked {
  color: var(--text-dim);
}

.achievement-modal-desc {
  margin: 0.25rem 0 0 1.25rem;
  font-size: 0.8rem;
  color: var(--text-dim);
  line-height: 1.35;
}
</style>
