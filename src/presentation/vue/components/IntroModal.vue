<template>
  <div
    id="intro-overlay"
    class="intro-overlay"
    aria-hidden="true"
    @click.self="dismissIntroModal"
  >
    <div
      class="intro-modal"
      role="dialog"
      aria-labelledby="intro-title"
      aria-describedby="intro-body"
    >
      <h2 id="intro-title"></h2>
      <p id="intro-body"></p>
      <div
        id="intro-progress-wrap"
        class="intro-progress-wrap"
        aria-hidden="true"
      >
        <div
          id="intro-progress-bar"
          class="intro-progress-bar"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="0"
        ></div>
      </div>
      <button
        id="intro-got-it"
        type="button"
        class="intro-got-it"
      >
        {{ t('gotIt') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
import { dismissIntroModal } from '../../introModal.js';
</script>
