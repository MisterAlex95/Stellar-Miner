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
        <div
          id="achievements-modal-list"
          class="achievements-modal-list"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
import {
  closeAchievementsModal,
  ACHIEVEMENTS_OVERLAY_ID,
} from '../../mount/mountModals.js';

const achievementsTitleId = 'achievements-modal-title';
</script>
