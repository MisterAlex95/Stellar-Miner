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
