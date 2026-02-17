<template>
  <div class="event-toasts vue-toast-container" aria-live="polite" role="region" aria-label="Notifications">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toastStore.items"
        :key="toast.id"
        class="event-toast event-toast--visible"
        :class="toast.variant ? `event-toast--${toast.variant}` : ''"
        role="status"
      >
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from './stores/toast.js';

const toastStore = useToastStore();
</script>
