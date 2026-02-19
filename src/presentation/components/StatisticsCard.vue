<template>
  <div v-if="wide" class="statistics-card statistics-card--wide">
    <span class="statistics-card-label">{{ label }}</span>
    <span class="statistics-card-value" :data-stat-id="statId1">{{ value1 ?? '—' }}</span>
    <span class="statistics-card-suffix">{{ suffix }}</span>
    <span class="statistics-card-value" :data-stat-id="statId2">{{ value2 ?? '—' }}</span>
  </div>
  <div v-else class="statistics-card">
    <span class="statistics-card-label">{{ label }}</span>
    <span class="statistics-card-value" :data-stat-id="statId">{{ value ?? '—' }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value?: string;
  statId?: string;
  wide?: boolean;
  value1?: string;
  suffix?: string;
  value2?: string;
  statId1?: string;
  statId2?: string;
}>();
</script>

<style scoped>
.statistics-card {
  background: linear-gradient(145deg, rgba(26, 29, 40, 0.95) 0%, var(--bg-card) 100%);
  border: 1px solid rgba(42, 47, 61, 0.9);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: border-color 0.2s ease, box-shadow 0.25s ease, transform 0.2s ease;
}

.statistics-card:hover {
  border-color: rgba(245, 158, 11, 0.2);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(245, 158, 11, 0.08);
}

.statistics-card-label {
  display: block;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  margin-bottom: 0.2rem;
}

.statistics-card-value {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent);
}

.statistics-card-suffix {
  font-size: 0.9rem;
  color: var(--text-dim);
}

.statistics-card--wide {
  grid-column: 1 / -1;
}
</style>
