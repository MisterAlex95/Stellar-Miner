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

<style scoped>
.statistics-group-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin: 0 0 0.65rem 0;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid rgba(42, 47, 61, 0.8);
}

.statistics-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.65rem;
}
</style>
