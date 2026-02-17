<template>
  <section
    v-show="visible"
    class="statistics-group"
    :aria-labelledby="titleId"
    :data-stat-group="dataStatGroup"
  >
    <h3 :id="titleId" class="statistics-group-title">{{ titleLabel }}</h3>
    <div class="statistics-cards">
      <slot></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  titleId: string;
  titleLabel: string;
  dataStatGroup: string;
  visible: boolean;
}>();
</script>
