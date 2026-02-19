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
import { useToastStore } from './toasts/store.js';

const toastStore = useToastStore();
</script>

<style scoped>
.event-toasts {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
  max-width: calc(100vw - 2rem);
}

.event-toast {
  padding: 0.6rem 1rem;
  border-radius: 10px;
  background: var(--bg-panel);
  border: 1px solid var(--accent);
  color: var(--text);
  font-size: 0.9rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.event-toast--visible {
  opacity: 1;
  transform: translateY(0);
}

.event-toast--offline {
  border-color: var(--success);
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(34, 197, 94, 0.1) 100%);
}

.event-toast--milestone {
  border-color: var(--accent);
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(99, 102, 241, 0.12) 100%);
  font-weight: 500;
}

.event-toast--super-lucky {
  border-color: #fbbf24;
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(251, 191, 36, 0.2) 100%);
  color: #fef9c3;
  font-weight: 700;
}

.event-toast--streak {
  border-color: var(--success);
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(34, 197, 94, 0.15) 100%);
  color: #bbf7d0;
}

.event-toast--prestige-milestone {
  border-color: #a78bfa;
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(167, 139, 250, 0.15) 100%);
  color: #e9d5ff;
}

.event-toast--achievement {
  border-color: #fbbf24;
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(251, 191, 36, 0.18) 100%);
  color: #fef9c3;
  font-weight: 600;
}

.event-toast--daily {
  border-color: #22c55e;
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(34, 197, 94, 0.12) 100%);
  color: #bbf7d0;
}

.event-toast--critical {
  border-color: #dc2626;
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(220, 38, 38, 0.2) 100%);
  color: #fecaca;
  font-weight: 700;
}

.event-toast--event-positive {
  border-color: #16a34a;
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(34, 197, 94, 0.15) 100%);
  color: #bbf7d0;
  font-weight: 500;
}

.event-toast--negative {
  border-color: #b91c1c;
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(185, 28, 28, 0.18) 100%);
  color: #fecaca;
}

@media (max-width: 360px) {
  .event-toast {
    font-size: 0.75rem;
    padding: 0.5rem 0.75rem;
  }
}
</style>
