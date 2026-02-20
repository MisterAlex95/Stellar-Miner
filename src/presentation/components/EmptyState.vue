<template>
  <div
    class="flex flex-col items-center gap-2 py-5 px-4 mb-3 text-center bg-card border border-dashed border-border rounded-md empty-state"
    :class="{ '!hidden': hidden }"
    :aria-hidden="hidden"
    :hidden="hidden"
    :id="id"
  >
    <span v-if="icon" class="text-3xl leading-none opacity-[0.85] empty-state-icon" aria-hidden="true">{{ icon }}</span>
    <p class="m-0 text-sm text-foreground-muted leading-snug max-w-[280px] empty-state-text">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
  icon?: string;
  hidden?: boolean;
  id?: string;
}>();
</script>
