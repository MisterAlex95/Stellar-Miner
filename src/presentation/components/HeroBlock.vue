<template>
  <div :class="rootClass">
    <div :class="headerClass">
      <span :class="badgeClass">{{ badge }}</span>
      <h3 :class="titleClass">{{ title }}</h3>
    </div>
    <div :class="actionClass">
      <button
        v-if="buttonId"
        type="button"
        :id="buttonId"
        :class="theme === 'dashboard' ? ['dashboard-hero-btn', buttonClass] : ['hero-block-btn', buttonClass]"
        :data-upgrade-id="dataUpgradeId ?? undefined"
        :data-planet-id="dataPlanetId ?? undefined"
        :data-goto="dataGoto ?? undefined"
      >
        {{ buttonLabel }}
      </button>
    </div>
    <p
      v-if="theme === 'dashboard' || timeText"
      :class="timeClass"
      :style="theme === 'dashboard' && !timeText ? { display: 'none' } : undefined"
    >{{ timeText }}</p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    badge: string;
    title: string;
    buttonId?: string;
    buttonClass?: string;
    buttonLabel?: string;
    dataUpgradeId?: string;
    dataPlanetId?: string;
    dataGoto?: string;
    timeText?: string;
    theme?: 'default' | 'dashboard';
  }>(),
  { theme: 'default' }
);

const rootClass = props.theme === 'dashboard' ? 'dashboard-hero' : 'hero-block';
const headerClass = props.theme === 'dashboard' ? 'dashboard-hero-header' : 'hero-block-header';
const badgeClass = props.theme === 'dashboard' ? 'dashboard-hero-badge' : 'hero-block-badge';
const titleClass = props.theme === 'dashboard' ? 'dashboard-hero-title' : 'hero-block-title';
const actionClass = props.theme === 'dashboard' ? 'dashboard-hero-action' : 'hero-block-action';
const timeClass = props.theme === 'dashboard' ? 'dashboard-hero-time' : 'hero-block-time';
</script>

<style scoped>
.dashboard-hero {
  background: linear-gradient(160deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.08) 50%, var(--bg-card) 100%);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.05), 0 4px 16px rgba(0, 0, 0, 0.2);
}

.dashboard-hero-header {
  margin-bottom: 0.75rem;
}

.dashboard-hero-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--accent);
  margin-bottom: 0.35rem;
}

.dashboard-hero-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.35;
}

.dashboard-hero-action {
  margin-bottom: 0.5rem;
}

.dashboard-hero-btn {
  display: inline-block;
  padding: 0.65rem 1.4rem;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: filter 0.2s, transform 0.1s, box-shadow 0.2s;
}

.dashboard-hero-btn:hover {
  filter: brightness(1.1);
}

.dashboard-hero-btn:active {
  transform: scale(0.98);
}

.dashboard-hero-btn--claim {
  background: var(--accent);
  color: var(--bg-dark);
  box-shadow: 0 2px 12px var(--accent-glow);
}

.dashboard-hero-btn--prestige {
  background: var(--prestige-color, #c9a227);
  color: var(--bg);
  box-shadow: 0 2px 12px rgba(201, 162, 39, 0.4);
}

.dashboard-hero-btn--upgrade {
  background: var(--accent);
  color: var(--bg-dark);
  box-shadow: 0 2px 12px var(--accent-glow);
}

.dashboard-hero-btn--goto {
  background: var(--bg-panel);
  color: var(--text);
  border: 1px solid var(--border);
}

.dashboard-hero-btn--goto:hover {
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.dashboard-hero-time {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-dim);
}
</style>
