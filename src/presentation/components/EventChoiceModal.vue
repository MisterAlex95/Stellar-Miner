<template>
  <div
    id="event-choice-modal-overlay"
    class="event-choice-modal-overlay"
    aria-hidden="true"
    @click.self="handleClose"
  >
    <div
      v-if="eventChoice"
      class="event-choice-modal"
      role="dialog"
      aria-labelledby="event-choice-modal-title"
    >
      <div class="event-choice-modal-header">
        <h2
          id="event-choice-modal-title"
          class="event-choice-modal-title"
        >
          {{ eventChoice.eventName }}
        </h2>
        <button
          type="button"
          class="event-choice-modal-close"
          :aria-label="t('close')"
          @click="handleClose"
        >
          ×
        </button>
      </div>
      <div class="event-choice-modal-body">
        <p
          v-if="eventChoice.flavor"
          class="event-choice-flavor"
        >
          {{ eventChoice.flavor }}
        </p>
        <p class="event-choice-prompt">
          {{ t('eventChoicePrompt') }}
        </p>
        <div
          class="event-choice-buttons"
          role="group"
          :aria-label="t('eventChoicePrompt')"
        >
          <button
            v-for="choice in eventChoice.choices"
            :key="choice.id"
            type="button"
            class="event-choice-btn"
            :class="{ 'event-choice-btn--disabled': !canPickChoice(choice) }"
            :disabled="!canPickChoice(choice)"
            @click="selectChoice(choice.id)"
          >
            <span class="event-choice-btn-label">{{ choice.label }}</span>
            <span class="event-choice-btn-effect">{{ choice.effectSummary }}</span>
            <span
              v-if="choice.costAstronauts"
              class="event-choice-btn-cost"
            >
              −{{ choice.costAstronauts }} {{ t('astronautsLabel') }}
            </span>
            <span
              v-if="choice.costCoins"
              class="event-choice-btn-cost"
            >
              {{ tParam('eventChoiceCostCoins', { n: formatCoins(choice.costCoins) }) }}
            </span>
            <span
              v-if="choice.costUpgrade"
              class="event-choice-btn-cost"
            >
              {{ tParam('eventChoiceCostModule', { n: String(choice.costUpgrade) }) }}
            </span>
            <span
              v-if="choice.successChance != null && choice.successChance < 1"
              class="event-choice-btn-chance"
            >
              {{ tParam('eventChoiceSuccessChance', { pct: String(Math.round(choice.successChance * 100)) }) }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAppUIStore } from '../stores/appUI.js';
import { closeEventChoiceModal } from '../modals/eventChoice.js';
import { t, tParam } from '../../application/strings.js';
import { applyEventChoice } from '../../application/handlersEventChoice.js';
import { getSession } from '../../application/gameState.js';
import { formatNumber } from '../../application/format.js';
import { getSettings } from '../../application/gameState.js';

const store = useAppUIStore();
const { eventChoice } = storeToRefs(store);

const freeCrewCount = computed(() => {
  const session = getSession();
  return session?.player?.freeCrewCount ?? 0;
});

const coins = computed(() => {
  const session = getSession();
  return session?.player?.coins.toNumber() ?? 0;
});

const upgradeCount = computed(() => {
  const session = getSession();
  return session?.player?.planets?.reduce((s, p) => s + p.upgrades.length, 0) ?? 0;
});

function formatCoins(n: number): string {
  return formatNumber(n, getSettings().compactNumbers);
}

function canPickChoice(choice: { costAstronauts?: number; costCoins?: number; costUpgrade?: number }): boolean {
  if ((choice.costAstronauts ?? 0) > 0 && freeCrewCount.value < (choice.costAstronauts ?? 0)) return false;
  if ((choice.costCoins ?? 0) > 0 && coins.value < (choice.costCoins ?? 0)) return false;
  if ((choice.costUpgrade ?? 0) > 0 && upgradeCount.value < (choice.costUpgrade ?? 0)) return false;
  return true;
}

function handleClose(): void {
  closeEventChoiceModal();
}

function selectChoice(choiceId: string): void {
  const ec = eventChoice.value;
  if (!ec) return;
  const choice = ec.choices.find((c) => c.id === choiceId);
  if (!choice || !canPickChoice(choice)) return;
  applyEventChoice(ec.eventId, choiceId);
}
</script>

<style scoped>
.event-choice-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 101;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s ease, visibility 0.25s ease;
}

.event-choice-modal-overlay--open {
  opacity: 1;
  visibility: visible;
}

.event-choice-modal {
  background: linear-gradient(180deg, var(--bg-panel) 0%, color-mix(in srgb, var(--bg-panel) 95%, var(--accent)) 100%);
  border: 1px solid var(--border);
  border-top: 3px solid var(--accent);
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  padding: 0;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.event-choice-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.15);
}

.event-choice-modal-title {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text);
  flex: 1;
}

.event-choice-modal-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  line-height: 1;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 10px;
  transition: color 0.2s, background 0.2s;
}

.event-choice-modal-close:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.08);
}

.event-choice-modal-body {
  padding: 1.25rem 1.5rem;
}

.event-choice-flavor {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: var(--text-dim);
  font-style: italic;
  line-height: 1.4;
}

.event-choice-prompt {
  margin: 0 0 1rem 0;
  font-size: 0.85rem;
  color: var(--text);
  line-height: 1.35;
}

.event-choice-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.event-choice-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid var(--border);
  border-radius: 14px;
  background: var(--bg-card);
  color: var(--text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.15s;
}

.event-choice-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--accent) 60%, transparent);
  background: var(--bg-panel);
  transform: translateY(-1px);
}

.event-choice-btn--disabled,
.event-choice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.4);
}

.event-choice-btn--disabled .event-choice-btn-cost,
.event-choice-btn:disabled .event-choice-btn-cost {
  color: var(--text-dim);
}

.event-choice-btn-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.event-choice-btn-effect {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.event-choice-btn-cost {
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 500;
}

.event-choice-btn-chance {
  font-size: 0.72rem;
  color: var(--text-dim);
  font-style: italic;
}
</style>
