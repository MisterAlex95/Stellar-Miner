import './game.css';
import { Player } from './domain/entities/Player.js';
import { Upgrade } from './domain/entities/Upgrade.js';
import { GameEvent } from './domain/entities/GameEvent.js';
import { UpgradeEffect } from './domain/value-objects/UpgradeEffect.js';
import { EventEffect } from './domain/value-objects/EventEffect.js';
import { GameSession } from './domain/aggregates/GameSession.js';
import { UpgradeService } from './domain/services/UpgradeService.js';
import { PlanetService } from './domain/services/PlanetService.js';
import { SaveLoadService } from './infrastructure/SaveLoadService.js';
import { startStarfield } from './presentation/StarfieldCanvas.js';
import { createMineZoneCanvas } from './presentation/MineZoneCanvas.js';
import { loadSettings, saveSettings, type Settings } from './settings.js';
import { PRESTIGE_COIN_THRESHOLD, getAstronautCost } from './domain/constants.js';

const SAVE_INTERVAL_MS = 3000;
const EVENT_INTERVAL_MS = 90_000; // trigger a random event every 90s
const MIN_EVENT_DELAY_MS = 45_000; // first event at least 45s in

type UpgradeDef = {
  id: string;
  name: string;
  description: string;
  cost: number;
  coinsPerSecond: number;
  tier: number;
  /** Min astronauts required to purchase this upgrade. Higher tiers need more crew to operate. */
  requiredAstronauts: number;
};

/** Upgrades: first at 100 (≈100 clicks), then ×5 per tier. T2+ require crew to operate. */
const UPGRADE_CATALOG: UpgradeDef[] = [
  { id: 'mining-robot', name: 'Mining Robot', description: 'Basic autonomous miner. Your first step into the belt.', cost: 100, coinsPerSecond: 2, tier: 1, requiredAstronauts: 0 },
  { id: 'drill-mk1', name: 'Drill Mk.I', description: 'Improved extraction head. Needs an operator. Cuts through surface rock in seconds.', cost: 500, coinsPerSecond: 10, tier: 2, requiredAstronauts: 1 },
  { id: 'drill-mk2', name: 'Drill Mk.II', description: 'Heavy-duty surface drill. Built for long shifts in the void. Requires trained crew.', cost: 2500, coinsPerSecond: 50, tier: 3, requiredAstronauts: 2 },
  { id: 'asteroid-rig', name: 'Asteroid Rig', description: 'Full mining platform. Drills, crushes, and sorts in one unit. Needs a team.', cost: 12500, coinsPerSecond: 250, tier: 4, requiredAstronauts: 2 },
  { id: 'orbital-station', name: 'Orbital Station', description: 'Refinery and logistics hub. The heart of your operation. Crew-intensive.', cost: 62500, coinsPerSecond: 1250, tier: 5, requiredAstronauts: 3 },
  { id: 'deep-core-drill', name: 'Deep Core Drill', description: 'Penetrates dense ore layers. Reaches what others can\'t. Requires specialist crew.', cost: 312500, coinsPerSecond: 6250, tier: 6, requiredAstronauts: 3 },
  { id: 'stellar-harvester', name: 'Stellar Harvester', description: 'Harvests rare minerals at scale. Feeds the entire sector.', cost: 1562500, coinsPerSecond: 31250, tier: 7, requiredAstronauts: 4 },
  { id: 'quantum-extractor', name: 'Quantum Extractor', description: 'Maximum efficiency extraction. Near-instant ore processing. Needs expert crew.', cost: 7812500, coinsPerSecond: 156250, tier: 8, requiredAstronauts: 4 },
  { id: 'void-crusher', name: 'Void Crusher', description: 'Pulverizes asteroid cores. Built for the endgame.', cost: 39062500, coinsPerSecond: 781250, tier: 9, requiredAstronauts: 5 },
  { id: 'nexus-collector', name: 'Nexus Collector', description: 'Harvests from multiple dimensions. The ultimate upgrade. Full crew required.', cost: 195312500, coinsPerSecond: 3906250, tier: 10, requiredAstronauts: 5 },
];

function createUpgrade(def: UpgradeDef): Upgrade {
  return new Upgrade(def.id, def.name, def.cost, new UpgradeEffect(def.coinsPerSecond));
}

/** Random events: production multiplier for a duration. */
const EVENT_CATALOG: GameEvent[] = [
  new GameEvent('meteor-storm', 'Meteor Storm', new EventEffect(2, 30_000)),
  new GameEvent('solar-flare', 'Solar Flare', new EventEffect(1.5, 45_000)),
  new GameEvent('rich-vein', 'Rich Vein', new EventEffect(2.5, 20_000)),
  new GameEvent('void-bonus', 'Void Bonus', new EventEffect(1.25, 60_000)),
  new GameEvent('lucky-strike', 'Lucky Strike', new EventEffect(3, 15_000)),
];

type ActiveEventInstance = { event: GameEvent; endsAt: number };

let session: GameSession;
let activeEventInstances: ActiveEventInstance[] = [];
let nextEventAt = 0;
let gameStartTime = 0;
let settings: Settings = loadSettings();

const QUEST_STORAGE_KEY = 'stellar-miner-quest';
const MILESTONES_STORAGE_KEY = 'stellar-miner-milestones';

const COMBO_WINDOW_MS = 2500;
const COMBO_MIN_CLICKS = 5;
const COMBO_MULT_PER_LEVEL = 0.1;
const COMBO_MAX_MULT = 1.6;

const COMBO_NAMES: { minMult: number; name: string }[] = [
  { minMult: 1.6, name: 'Mega' },
  { minMult: 1.5, name: 'Legendary' },
  { minMult: 1.4, name: 'Unstoppable' },
  { minMult: 1.3, name: 'On fire' },
  { minMult: 1.2, name: 'Hot' },
  { minMult: 1.1, name: 'Combo' },
];

function getComboName(mult: number): string {
  for (const t of COMBO_NAMES) {
    if (mult >= t.minMult) return t.name;
  }
  return 'Combo';
}
const LUCKY_CLICK_CHANCE = 0.04;
const LUCKY_MIN = 5;
const LUCKY_MAX = 22;
const SUPER_LUCKY_CHANCE = 0.006;
const SUPER_LUCKY_MIN = 40;
const SUPER_LUCKY_MAX = 85;

const MILESTONES = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 500000, 1000000];

let clickTimestamps: number[] = [];
let sessionClickCount = 0;
let sessionCoinsFromClicks = 0;

const QUEST_STREAK_KEY = 'stellar-miner-quest-streak';
const QUEST_LAST_CLAIM_KEY = 'stellar-miner-quest-last-claim';
const QUEST_STREAK_WINDOW_MS = 5 * 60 * 1000;
const QUEST_STREAK_BONUS_PER_LEVEL = 0.15;
const QUEST_STREAK_MAX = 3;

type QuestType = 'coins' | 'production' | 'upgrade' | 'astronauts';

type Quest = {
  type: QuestType;
  target: number;
  targetId?: string; // upgrade id for type 'upgrade'
  reward: number;
  description: string;
};

type QuestState = { quest: Quest | null };

let questState: QuestState = loadQuestState();
let lastCoinsForBump = 0;

function loadQuestState(): QuestState {
  if (typeof localStorage === 'undefined') return { quest: null };
  try {
    const raw = localStorage.getItem(QUEST_STORAGE_KEY);
    if (!raw) return { quest: null };
    const data = JSON.parse(raw) as QuestState;
    return data.quest ? { quest: data.quest } : { quest: null };
  } catch {
    return { quest: null };
  }
}

function saveQuestState(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(questState));
  }
}

function generateQuest(): Quest {
  const roll = Math.random();
  if (roll < 0.35) {
    const targets = [100, 500, 1000, 5000, 10000];
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'coins',
      target,
      reward: Math.floor(target * 0.35) + 25,
      description: `Reach ${target.toLocaleString()} coins`,
    };
  }
  if (roll < 0.6) {
    const targets = [5, 10, 25, 50, 100];
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'production',
      target,
      reward: target * 2 + 40,
      description: `Reach ${target}/s production`,
    };
  }
  if (roll < 0.8) {
    const def = UPGRADE_CATALOG[Math.floor(Math.random() * Math.min(5, UPGRADE_CATALOG.length))];
    const n = Math.floor(Math.random() * 2) + 1;
    return {
      type: 'upgrade',
      target: n,
      targetId: def.id,
      reward: Math.floor(def.cost * 0.25) + 60,
      description: `Own ${n}× ${def.name}`,
    };
  }
  const targets = [1, 2, 3, 5, 8];
  const target = targets[Math.floor(Math.random() * targets.length)];
  return {
    type: 'astronauts',
    target,
    reward: 80 + target * 25,
    description: `Have ${target} astronaut${target > 1 ? 's' : ''}`,
  };
}

function getQuestProgress(): { current: number; target: number; done: boolean } | null {
  if (!session || !questState.quest) return null;
  const q = questState.quest;
  let current = 0;
  if (q.type === 'coins') current = session.player.coins.value;
  else if (q.type === 'production') current = session.player.effectiveProductionRate;
  else if (q.type === 'upgrade' && q.targetId)
    current = session.player.upgrades.filter((u) => u.id === q.targetId).length;
  else if (q.type === 'astronauts') current = session.player.astronautCount + getAssignedAstronauts();
  return { current, target: q.target, done: current >= q.target };
}

function checkQuestProgress(): void {
  const p = getQuestProgress();
  if (p?.done) renderQuestSection();
}

function getQuestStreak(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(QUEST_STREAK_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function getQuestLastClaimAt(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(QUEST_LAST_CLAIM_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function claimQuest(): void {
  if (!session || !questState.quest) return;
  const p = getQuestProgress();
  if (!p?.done) return;
  const now = Date.now();
  const lastClaim = getQuestLastClaimAt();
  const streak =
    now - lastClaim <= QUEST_STREAK_WINDOW_MS ? Math.min(QUEST_STREAK_MAX, getQuestStreak() + 1) : 1;
  const baseReward = questState.quest.reward;
  const bonusMult = 1 + (streak - 1) * QUEST_STREAK_BONUS_PER_LEVEL;
  const reward = Math.floor(baseReward * bonusMult);
  session.player.addCoins(reward);
  questState.quest = generateQuest();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(QUEST_LAST_CLAIM_KEY, String(now));
    localStorage.setItem(QUEST_STREAK_KEY, String(streak));
  }
  saveQuestState();
  saveSession();
  updateStats();
  renderUpgradeList();
  renderQuestSection();
  const claimBtn = document.getElementById('quest-claim');
  if (claimBtn) showFloatingReward(reward, claimBtn);
  if (streak > 1) showQuestStreakToast(streak, bonusMult);
}

function showQuestStreakToast(streak: number, mult: number): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--streak';
  el.setAttribute('role', 'status');
  el.textContent = `Quest streak ×${streak}! +${Math.round((mult - 1) * 100)}% reward`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

function showFloatingReward(amount: number, anchor: HTMLElement): void {
  const el = document.createElement('span');
  el.className = 'float-reward';
  el.textContent = `+${formatNumber(amount, settings.compactNumbers)} ⬡`;
  const rect = anchor.getBoundingClientRect();
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('float-reward--active'));
  setTimeout(() => {
    el.classList.remove('float-reward--active');
    setTimeout(() => el.remove(), 400);
  }, 1200);
}

function renderQuestSection(): void {
  const container = document.getElementById('quest-section');
  const progressEl = document.getElementById('quest-progress');
  const claimBtn = document.getElementById('quest-claim');
  if (!container) return;

  if (!questState.quest) {
    questState.quest = generateQuest();
    saveQuestState();
  }

  const q = questState.quest;
  const p = getQuestProgress();
  if (!q || !p) return;

  container.classList.toggle('quest-section--complete', p.done);
  const progressBar = document.getElementById('quest-progress-bar');
  if (progressBar) {
    const pct = p.target > 0 ? Math.min(100, (p.current / p.target) * 100) : 0;
    progressBar.style.width = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', String(Math.round(pct)));
  }
  if (progressEl) {
    progressEl.textContent = p.done
      ? `${q.description} ✓`
      : `${q.description}: ${formatNumber(p.current, false)} / ${formatNumber(p.target, false)}`;
  }
  if (claimBtn) {
    const streak = getQuestStreak();
    const nextBonus = streak < QUEST_STREAK_MAX ? ` (streak +${Math.round(QUEST_STREAK_BONUS_PER_LEVEL * 100)}%)` : '';
    claimBtn.textContent = p.done ? `Claim ${formatNumber(Math.floor(q.reward), settings.compactNumbers)} ⬡${nextBonus}` : 'Claim';
    claimBtn.toggleAttribute('disabled', !p.done);
  }
  const streakHint = document.getElementById('quest-streak-hint');
  if (streakHint) {
    const streak = getQuestStreak();
    const lastClaim = getQuestLastClaimAt();
    const withinWindow = Date.now() - lastClaim <= QUEST_STREAK_WINDOW_MS;
    if (streak > 0 && withinWindow) streakHint.textContent = `Streak ×${streak} · claim next within 5 min to keep it`;
    else if (streak > 0) streakHint.textContent = 'Streak expired. Claim a quest to start a new streak.';
    else streakHint.textContent = '';
    streakHint.style.display = streak > 0 ? 'block' : 'none';
  }
}
const saveLoad = new SaveLoadService();
const upgradeService = new UpgradeService();
const planetService = new PlanetService();
let starfieldApi: ReturnType<typeof startStarfield> | null = null;
let mineZoneCanvasApi: ReturnType<typeof createMineZoneCanvas> | null = null;

function getSettings(): Settings {
  return settings;
}

/** Active event ids for canvas effects (read by Starfield and MineZone). */
function getEventContext(): { activeEventIds: string[] } {
  const now = Date.now();
  return {
    activeEventIds: activeEventInstances.filter((a) => a.endsAt > now).map((a) => a.event.id),
  };
}

async function getOrCreateSession(): Promise<GameSession> {
  const loaded = await saveLoad.load();
  if (loaded) return loaded;
  const player = Player.create('player-1');
  player.addCoins(0);
  return new GameSession('session-1', player);
}

function formatNumber(n: number, compact: boolean = true): string {
  if (!compact) return Math.floor(n).toLocaleString();
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toLocaleString();
}

/** Combined multiplier from all active (non-expired) events. */
function getEventMultiplier(): number {
  const now = Date.now();
  activeEventInstances = activeEventInstances.filter((a) => a.endsAt > now);
  let mult = 1;
  for (const a of activeEventInstances) mult *= a.event.effect.multiplier;
  return mult;
}

/** Only update coins and production display (no list rebuild). */
function updateStats() {
  if (!session) return;
  const player = session.player;
  const eventMult = getEventMultiplier();
  const effectiveRate = player.effectiveProductionRate * eventMult;
  const coinsEl = document.getElementById('coins-value');
  const rateEl = document.getElementById('production-value');
  const coinsCard = document.getElementById('coins-stat-card');
  if (coinsEl) coinsEl.textContent = formatNumber(player.coins.value, settings.compactNumbers);
  if (rateEl) rateEl.textContent = formatNumber(effectiveRate, settings.compactNumbers) + '/s';
  if (coinsCard && player.coins.value > lastCoinsForBump) {
    coinsCard.classList.add('stat-card--bump');
    setTimeout(() => coinsCard.classList.remove('stat-card--bump'), 400);
  }
  lastCoinsForBump = player.coins.value;

  const productionCard = document.getElementById('production-stat-card');
  const productionLive = document.getElementById('production-live');
  if (productionCard) productionCard.classList.toggle('stat-card--live', effectiveRate > 0);
  if (productionLive) productionLive.textContent = effectiveRate > 0 ? '●' : '';
  const breakdownEl = document.getElementById('production-breakdown');
  if (breakdownEl) {
    const base = player.productionRate.value;
    const planetBonus = player.planets.length > 1 ? (player.planets.length - 1) * 5 : 0;
    const prestigeBonus = player.prestigeLevel > 0 ? player.prestigeLevel * 5 : 0;
    const crewBonus = player.astronautCount > 0 ? player.astronautCount * 2 : 0;
    const parts: string[] = [];
    if (base > 0) parts.push(`Base ${formatNumber(base, settings.compactNumbers)}/s`);
    if (planetBonus > 0) parts.push(`+${planetBonus}% planets`);
    if (prestigeBonus > 0) parts.push(`+${prestigeBonus}% prestige`);
    if (crewBonus > 0) parts.push(`+${crewBonus}% crew`);
    if (eventMult > 1) parts.push(`×${eventMult.toFixed(1)} event`);
    breakdownEl.textContent = parts.length > 0 ? parts.join(' · ') : '';
    breakdownEl.style.display = parts.length > 0 ? '' : 'none';
  }
  const sessionEl = document.getElementById('session-stats');
  if (sessionEl) {
    if (sessionClickCount > 0 || sessionCoinsFromClicks > 0) {
      sessionEl.textContent = `Session: ${sessionClickCount} clicks · ${formatNumber(sessionCoinsFromClicks, settings.compactNumbers)} ⬡ from clicks`;
      sessionEl.style.display = 'block';
    } else {
      sessionEl.style.display = 'none';
    }
  }
  renderPrestigeSection();
  renderCrewSection();

  const activeEl = document.getElementById('active-events');
  if (activeEl) {
    const now = Date.now();
    const active = activeEventInstances.filter((a) => a.endsAt > now);
    if (active.length === 0) {
      activeEl.innerHTML = '';
      activeEl.style.display = 'none';
    } else {
      activeEl.style.display = 'block';
      activeEl.innerHTML = active
        .map(
          (a) =>
            `<span class="event-badge" title="${a.event.name}: ×${a.event.effect.multiplier} production">${a.event.name} (${Math.ceil((a.endsAt - now) / 1000)}s)</span>`
        )
        .join('');
    }
  }
  const nextEventEl = document.getElementById('next-event-countdown');
  if (nextEventEl) {
    const now = Date.now();
    const active = activeEventInstances.filter((a) => a.endsAt > now);
    if (active.length > 0) {
      nextEventEl.textContent = '';
      nextEventEl.style.display = 'none';
    } else {
      const secs = Math.max(0, Math.ceil((nextEventAt - now) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      nextEventEl.textContent = m > 0 ? `Next event in ${m}:${s.toString().padStart(2, '0')}` : `Next event in ${secs}s`;
      nextEventEl.style.display = 'block';
    }
  }
}

/** Astronauts "assigned" to owned upgrades (spent when buying). Used for display only. */
function getAssignedAstronauts(): number {
  if (!session) return 0;
  let assigned = 0;
  for (const def of UPGRADE_CATALOG) {
    const count = session.player.upgrades.filter((u) => u.id === def.id).length;
    assigned += count * def.requiredAstronauts;
  }
  return assigned;
}

/** Base production from one planet (sum of its upgrades' coins/s). */
function getPlanetBaseProduction(planet: { upgrades: { effect: { coinsPerSecond: number } }[] }): number {
  return planet.upgrades.reduce((s, u) => s + u.effect.coinsPerSecond, 0);
}

/** Effective production from one planet (share of total with global bonuses). */
function getPlanetEffectiveProduction(planet: { upgrades: { effect: { coinsPerSecond: number } }[] }): number {
  if (!session) return 0;
  const totalBase = session.player.productionRate.value;
  if (totalBase <= 0) return 0;
  const planetBase = getPlanetBaseProduction(planet);
  return (planetBase / totalBase) * session.player.effectiveProductionRate;
}

const UPGRADE_GROUPS: { label: string; minTier: number; maxTier: number }[] = [
  { label: 'Early', minTier: 1, maxTier: 3 },
  { label: 'Mid', minTier: 4, maxTier: 6 },
  { label: 'Late', minTier: 7, maxTier: 10 },
];

/** Rebuild the upgrade list from scratch (init, after purchase, after mine). */
function renderUpgradeList() {
  if (!session) return;
  const player = session.player;
  const listEl = document.getElementById('upgrade-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const planetsWithSlot = player.getPlanetsWithFreeSlot();
  const hasFreeSlot = planetsWithSlot.length > 0;
  const choosePlanet = planetsWithSlot.length > 1;

  for (const group of UPGRADE_GROUPS) {
    const groupDefs = UPGRADE_CATALOG.filter((d) => d.tier >= group.minTier && d.tier <= group.maxTier);
    if (groupDefs.length === 0) continue;

    const header = document.createElement('div');
    header.className = 'upgrade-group-header';
    header.textContent = group.label;
    listEl.appendChild(header);

    for (const def of groupDefs) {
      const owned = player.upgrades.filter((u) => u.id === def.id).length;
      const upgrade = createUpgrade(def);
      const hasCrew = player.astronautCount >= def.requiredAstronauts;
      const canAfford = player.coins.gte(upgrade.cost);
      const canBuy = canAfford && hasFreeSlot && hasCrew;
      const buyLabel = owned > 0 ? `+1` : `Buy`;
      const maxCount = getMaxBuyCount(def.id);
      const maxLabel = maxCount > 1 ? `Max (${maxCount})` : `Max`;

      let buyTitle = '';
      if (!hasCrew && def.requiredAstronauts > 0) buyTitle = `Costs ${formatNumber(def.cost, settings.compactNumbers)} ⬡ + ${def.requiredAstronauts} astronaut${def.requiredAstronauts > 1 ? 's' : ''}. Hire crew in the Crew section.`;
      else if (!hasFreeSlot) buyTitle = 'No free slot. Add a slot to a planet or buy a new planet!';

      const crewBadge =
        def.requiredAstronauts > 0
          ? `<span class="upgrade-crew-req" title="Cost in astronauts (spent when you buy)">${def.requiredAstronauts} crew</span>`
          : '';

      const costLine =
        def.requiredAstronauts > 0
          ? `${formatNumber(def.cost, settings.compactNumbers)} ⬡ + ${def.requiredAstronauts} astronaut${def.requiredAstronauts > 1 ? 's' : ''}`
          : `${formatNumber(def.cost, settings.compactNumbers)} ⬡`;

      const planetOptions = choosePlanet
        ? planetsWithSlot.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')
        : '';
      const planetSelectHtml = choosePlanet
        ? `<label class="upgrade-planet-label" for="planet-${def.id}">To</label><select class="upgrade-planet-select" id="planet-${def.id}" data-upgrade-id="${def.id}" aria-label="Assign to planet">${planetOptions}</select>`
        : '';

      const isRecommended = canBuy && !player.upgrades.some((u) => u.id === def.id);
      const card = document.createElement('div');
      card.className =
        'upgrade-card' +
        (canBuy ? ' upgrade-card--affordable' : '') +
        (isRecommended ? ' upgrade-card--recommended' : '') +
        (!hasCrew && def.requiredAstronauts > 0 ? ' upgrade-card--needs-crew' : '');
      card.setAttribute('data-tier', String(def.tier));
      card.innerHTML = `
        <div class="upgrade-info">
          <div class="upgrade-header">
            <span class="upgrade-tier" aria-label="Tier ${def.tier}">T${def.tier}</span>
            <div class="upgrade-name">${def.name}${owned > 0 ? `<span class="count-badge">×${owned}</span>` : ''}${crewBadge}${isRecommended ? '<span class="upgrade-recommended">Recommended</span>' : ''}</div>
          </div>
          <div class="upgrade-description">${def.description}</div>
          <div class="upgrade-effect">+${formatNumber(def.coinsPerSecond, settings.compactNumbers)} /s each${owned > 0 ? ` · Total: +${formatNumber(owned * def.coinsPerSecond, settings.compactNumbers)}/s` : ''}</div>
        </div>
        <span class="upgrade-cost">${costLine}</span>
        <div class="upgrade-actions">
          ${planetSelectHtml}
          <div class="upgrade-buttons">
            <button class="upgrade-btn upgrade-btn--buy" type="button" data-upgrade-id="${def.id}" data-action="buy" title="${buyTitle}" ${canBuy ? '' : 'disabled'}>${buyLabel}</button>
            <button class="upgrade-btn upgrade-btn--max" type="button" data-upgrade-id="${def.id}" data-action="max" title="Buy as many as you can afford with current slots" ${maxCount > 0 && hasCrew ? '' : 'disabled'}>${maxLabel}</button>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    }
  }
}

/** Update only labels and disabled state on existing cards (no DOM replace = no flicker). */
function updateUpgradeListInPlace() {
  if (!session) return;
  const player = session.player;
  const listEl = document.getElementById('upgrade-list');
  if (!listEl) return;

  const hasFreeSlot = player.getPlanetWithFreeSlot() !== null;
  listEl.querySelectorAll('.upgrade-card').forEach((card) => {
    const buyBtn = card.querySelector('.upgrade-btn--buy');
    const id = buyBtn?.getAttribute('data-upgrade-id');
    if (!id) return;
    const def = UPGRADE_CATALOG.find((d) => d.id === id);
    if (!def) return;
    const owned = player.upgrades.filter((u) => u.id === id).length;
    const hasCrew = player.astronautCount >= def.requiredAstronauts;
    const canAfford = player.coins.gte(def.cost);
    const canBuy = canAfford && hasFreeSlot && hasCrew;
    const buyLabel = owned > 0 ? '+1' : 'Buy';
    const maxCount = getMaxBuyCount(id);
    const maxLabel = maxCount > 1 ? `Max (${maxCount})` : 'Max';

    let buyTitle = '';
    if (!hasCrew && def.requiredAstronauts > 0) buyTitle = `Costs ${formatNumber(def.cost, settings.compactNumbers)} ⬡ + ${def.requiredAstronauts} astronaut${def.requiredAstronauts > 1 ? 's' : ''}. Hire crew in the Crew section.`;
    else if (!hasFreeSlot) buyTitle = 'No free slot. Add a slot to a planet or buy a new planet!';

    const isRecommended = canBuy && !player.upgrades.some((u) => u.id === id);
    const crewBadge = def.requiredAstronauts > 0 ? `<span class="upgrade-crew-req" title="Cost in astronauts (spent when you buy)">${def.requiredAstronauts} crew</span>` : '';
    const nameEl = card.querySelector('.upgrade-name');
    if (nameEl) {
      nameEl.innerHTML = def.name + (owned > 0 ? `<span class="count-badge">×${owned}</span>` : '') + crewBadge + (isRecommended ? '<span class="upgrade-recommended">Recommended</span>' : '');
    }
    const select = card.querySelector('.upgrade-planet-select') as HTMLSelectElement | null;
    if (select) {
      const planetsWithSlot = player.getPlanetsWithFreeSlot();
      if (planetsWithSlot.length !== select.options.length) {
        updateStats();
        renderUpgradeList();
        return;
      }
      const selectedId = select.options[select.selectedIndex]?.value;
      if (selectedId && !planetsWithSlot.some((p) => p.id === selectedId)) {
        select.value = planetsWithSlot[0]?.id ?? '';
      }
    }
    if (buyBtn) {
      buyBtn.textContent = buyLabel;
      buyBtn.toggleAttribute('disabled', !canBuy);
      buyBtn.setAttribute('title', buyTitle);
    }
    const maxBtn = card.querySelector('.upgrade-btn--max');
    if (maxBtn) {
      maxBtn.textContent = maxLabel;
      maxBtn.toggleAttribute('disabled', maxCount <= 0 || !hasCrew);
    }
    card.classList.toggle('upgrade-card--affordable', canBuy);
    card.classList.toggle('upgrade-card--recommended', isRecommended);
    card.classList.toggle('upgrade-card--needs-crew', !hasCrew && def.requiredAstronauts > 0);
  });
}

function render() {
  updateStats();
  renderUpgradeList();
}

function flashUpgradeCard(upgradeId: string): void {
  const listEl = document.getElementById('upgrade-list');
  if (!listEl) return;
  const card = listEl.querySelector(`.upgrade-card .upgrade-btn--buy[data-upgrade-id="${upgradeId}"]`)?.closest('.upgrade-card');
  if (card instanceof HTMLElement) {
    card.classList.add('upgrade-card--just-bought');
    setTimeout(() => card.classList.remove('upgrade-card--just-bought'), 700);
  }
}

/** How many of this upgrade can be bought with current coins, free slots, and astronauts. */
function getMaxBuyCount(upgradeId: string): number {
  if (!session) return 0;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return 0;
  const player = session.player;
  const freeSlots = player.planets.reduce((s, p) => s + p.freeSlots, 0);
  if (freeSlots <= 0 || !player.coins.gte(def.cost)) return 0;
  const byCoins = Math.floor(player.coins.value / def.cost);
  const byAstronauts = def.requiredAstronauts === 0 ? freeSlots : Math.floor(player.astronautCount / def.requiredAstronauts);
  return Math.min(byCoins, freeSlots, byAstronauts);
}

function handleUpgradeBuy(upgradeId: string, planetId?: string) {
  if (!session) return;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return;
  const player = session.player;
  const upgrade = createUpgrade(def);
  const targetPlanet = planetId ? player.planets.find((p) => p.id === planetId) : undefined;
  if (!player.coins.gte(upgrade.cost) || !player.getPlanetWithFreeSlot()) return;
  if (planetId && !targetPlanet?.hasFreeSlot()) return;
  if (player.astronautCount < def.requiredAstronauts) return;
  if (!player.spendAstronauts(def.requiredAstronauts)) return;
  upgradeService.purchaseUpgrade(player, upgrade, targetPlanet ?? null);
  saveSession();
  updateStats();
  renderUpgradeList();
  renderCrewSection();
  renderPlanetList();
  flashUpgradeCard(upgradeId);
  renderQuestSection();
}

/** Buy as many as possible (limited by coins, free slots, and astronauts). */
function handleUpgradeBuyMax(upgradeId: string, planetId?: string) {
  if (!session) return;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return;
  const player = session.player;
  let bought = 0;
  while (
    player.coins.gte(def.cost) &&
    player.astronautCount >= def.requiredAstronauts
  ) {
    let target = planetId ? player.planets.find((p) => p.id === planetId) : null;
    if (!target?.hasFreeSlot()) target = player.getPlanetWithFreeSlot();
    if (!target) break;
    if (!player.spendAstronauts(def.requiredAstronauts)) break;
    const upgrade = createUpgrade(def);
    upgradeService.purchaseUpgrade(player, upgrade, target);
    bought++;
  }
  if (bought > 0) {
    saveSession();
    updateStats();
    renderUpgradeList();
    renderCrewSection();
    renderPlanetList();
    renderQuestSection();
  }
  renderPlanetList();
}

function handleBuyNewPlanet() {
  if (!session) return;
  const player = session.player;
  if (!planetService.canBuyNewPlanet(player)) return;
  planetService.buyNewPlanet(player);
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
}

function handleAddSlot(planetId: string) {
  if (!session) return;
  const planet = session.player.planets.find((p) => p.id === planetId);
  if (!planet || !planetService.canAddSlot(session.player, planet)) return;
  planetService.addSlot(session.player, planet);
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
}

/** Refresh the planet list DOM (slots + add-slot + buy planet). */
function renderPlanetList() {
  if (!session) return;
  const listEl = document.getElementById('planet-list');
  if (!listEl) return;
  const player = session.player;
  const cost = planetService.getNewPlanetCost(player);
  const canBuyPlanet = planetService.canBuyNewPlanet(player);
  listEl.innerHTML = player.planets
    .map((p) => {
      const addSlotCost = planetService.getAddSlotCost(p);
      const canAddSlot = planetService.canAddSlot(player, p);
      const planetProd = getPlanetEffectiveProduction(p);
      const prodLine = planetProd > 0 ? `<div class="planet-card-production">${formatNumber(planetProd, settings.compactNumbers)}/s</div>` : '';
      return `<div class="planet-card" data-planet-id="${p.id}" title="${p.usedSlots}/${p.maxUpgrades} slots${player.planets.length > 1 ? ' • +' + (player.planets.length - 1) * 5 + '% prod from planets' : ''}">
        <div class="planet-card-name">${p.name}</div>
        <div class="planet-card-slots"><span class="planet-slot-value">${p.usedSlots}/${p.maxUpgrades}</span> slots</div>
        ${prodLine}
        <button type="button" class="add-slot-btn" data-planet-id="${p.id}" ${canAddSlot ? '' : 'disabled'} title="Add one upgrade slot">+1 slot · ${formatNumber(addSlotCost, settings.compactNumbers)} ⬡</button>
      </div>`;
    })
    .join('');
  listEl.querySelectorAll('.add-slot-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-planet-id');
      if (id) handleAddSlot(id);
    });
  });
  const buyPlanetBtn = document.getElementById('buy-planet-btn');
  if (buyPlanetBtn) {
    buyPlanetBtn.textContent = `Buy new planet (${formatNumber(cost, settings.compactNumbers)} ⬡)`;
    buyPlanetBtn.toggleAttribute('disabled', !canBuyPlanet);
  }
}

function renderPrestigeSection(): void {
  if (!session) return;
  const player = session.player;
  const statusEl = document.getElementById('prestige-status');
  const btnEl = document.getElementById('prestige-btn');
  if (!statusEl || !btnEl) return;
  const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
  statusEl.textContent =
    player.prestigeLevel > 0
      ? `Prestige level ${player.prestigeLevel} (+${player.prestigeLevel * 5}% prod). Need ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to prestige again.`
      : `Reach ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to unlock Prestige.`;
  btnEl.toggleAttribute('disabled', !canPrestige);
}

function renderCrewSection(): void {
  if (!session) return;
  const player = session.player;
  const listEl = document.getElementById('crew-section');
  const hireBtn = document.getElementById('hire-astronaut-btn');
  const crewCountEl = document.getElementById('crew-count');
  const crewOperatesEl = document.getElementById('crew-operates');
  if (!listEl || !hireBtn) return;
  const cost = getAstronautCost(player.astronautCount);
  const canHire = player.coins.gte(cost);
  hireBtn.textContent = `Hire astronaut · ${formatNumber(cost, settings.compactNumbers)} ⬡`;
  hireBtn.toggleAttribute('disabled', !canHire);
  const assigned = getAssignedAstronauts();
  const free = player.astronautCount;
  if (crewCountEl) {
    if (free === 0 && assigned === 0) {
      crewCountEl.textContent = 'No crew yet';
    } else if (free === 0) {
      crewCountEl.textContent = `${assigned} on equipment · 0 free (hire more for +% production)`;
    } else if (assigned > 0) {
      crewCountEl.textContent = `${free} free · +${free * 2}% production | ${assigned} on equipment`;
    } else {
      crewCountEl.textContent = `${free} astronaut${free > 1 ? 's' : ''} · +${free * 2}% production`;
    }
  }
  if (crewOperatesEl) {
    const totalUpgrades = player.upgrades.length;
    const nextUnlock = UPGRADE_CATALOG.find((d) => d.requiredAstronauts > player.astronautCount);
    if (player.astronautCount === 0 && assigned === 0) {
      crewOperatesEl.textContent = 'Hire crew to buy tier 2+ upgrades (each costs coins + astronauts).';
    } else if (nextUnlock) {
      crewOperatesEl.textContent = `${free} available. Next: ${nextUnlock.name} costs ${nextUnlock.requiredAstronauts} crew.`;
    } else {
      crewOperatesEl.textContent = totalUpgrades > 0 ? `${totalUpgrades} upgrade${totalUpgrades !== 1 ? 's' : ''} operated by crew.` : `${free} available.`;
    }
  }
}

function handleHireAstronaut(): void {
  if (!session) return;
  const player = session.player;
  const cost = getAstronautCost(player.astronautCount);
  if (!player.hireAstronaut(cost)) return;
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderCrewSection();
}

function openDebugMenu(): void {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    panel.classList.remove('debug-panel--closed');
    panel.setAttribute('aria-hidden', 'false');
    updateDebugPanel();
  }
}

function closeDebugMenu(): void {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    panel.classList.add('debug-panel--closed');
    panel.setAttribute('aria-hidden', 'true');
  }
}

function toggleDebugMenu(): void {
  const panel = document.getElementById('debug-panel');
  if (!panel) return;
  const isClosed = panel.classList.contains('debug-panel--closed');
  if (isClosed) openDebugMenu();
  else closeDebugMenu();
}

function updateDebugPanel(): void {
  const statsEl = document.getElementById('debug-stats');
  if (!statsEl || !session) return;

  const player = session.player;
  const eventMult = getEventMultiplier();
  const effectiveRate = player.effectiveProductionRate * eventMult;
  const now = Date.now();
  const nextEventIn = Math.max(0, Math.ceil((nextEventAt - now) / 1000));
  const activeCount = activeEventInstances.filter((a) => a.endsAt > now).length;

  statsEl.innerHTML = `
    <div class="debug-row"><span>Coins (raw)</span><span>${player.coins.value.toLocaleString()}</span></div>
    <div class="debug-row"><span>Production (base)</span><span>${player.productionRate.value}/s</span></div>
    <div class="debug-row"><span>Production (effective)</span><span>${effectiveRate.toFixed(1)}/s</span></div>
    <div class="debug-row"><span>Event mult</span><span>×${eventMult.toFixed(2)}</span></div>
    <div class="debug-row"><span>Prestige level</span><span>${player.prestigeLevel}</span></div>
    <div class="debug-row"><span>Planets</span><span>${player.planets.length}</span></div>
    <div class="debug-row"><span>Upgrades total</span><span>${player.upgrades.length}</span></div>
    <div class="debug-row"><span>Next event in</span><span>${nextEventIn}s</span></div>
    <div class="debug-row"><span>Active events</span><span>${activeCount}</span></div>
  `;
}

function handleDebugAction(action: string): void {
  if (!session) return;
  if (action === 'coins-1k') session.player.addCoins(1000);
  else if (action === 'coins-50k') session.player.addCoins(50_000);
  else if (action === 'trigger-event') triggerRandomEvent();
  else if (action === 'clear-events') activeEventInstances = [];
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderPrestigeSection();
  updateDebugPanel();
}

function saveSession() {
  saveLoad.save(session);
}

function openSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.classList.add('settings-overlay--open');
    overlay.setAttribute('aria-hidden', 'false');
  }
}

function closeSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.classList.remove('settings-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function applySettingsToUI() {
  updateStats();
  renderUpgradeList();
  renderPlanetList();
}

function handleResetProgress() {
  if (!confirm('Reset all progress? Coins, planets and upgrades will be lost. This cannot be undone.')) return;
  saveLoad.clearProgress();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(QUEST_STORAGE_KEY);
    localStorage.removeItem(MILESTONES_STORAGE_KEY);
  }
  closeSettings();
  location.reload();
}

function triggerRandomEvent(): void {
  const event = EVENT_CATALOG[Math.floor(Math.random() * EVENT_CATALOG.length)];
  activeEventInstances.push({ event, endsAt: Date.now() + event.effect.durationMs });
  showEventToast(event);
}

function showEventToast(gameEvent: GameEvent): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast';
  el.setAttribute('role', 'status');
  el.textContent = `${gameEvent.name}: ×${gameEvent.effect.multiplier} production for ${gameEvent.effect.durationMs / 1000}s`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

function showOfflineToast(coins: number): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--offline';
  el.setAttribute('role', 'status');
  el.textContent = `Welcome back! +${formatNumber(coins, false)} coins while you were away.`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 5000);
}

function showSuperLuckyToast(coins: number): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--super-lucky';
  el.setAttribute('role', 'status');
  el.textContent = `★ LUCKY! +${formatNumber(coins, false)} ⬡`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

function showFloatingCoin(amount: number, clientX: number, clientY: number, options?: { lucky?: boolean; superLucky?: boolean; comboMult?: number }): void {
  const zone = document.getElementById('mine-zone');
  const floats = document.getElementById('mine-zone-floats');
  if (!zone || !floats) return;
  const rect = zone.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'float-coin' + (options?.superLucky ? ' float-coin--super-lucky' : options?.lucky ? ' float-coin--lucky' : '');
  el.textContent = options?.superLucky ? `★ +${amount}` : `+${amount}`;
  el.style.left = `${clientX - rect.left}px`;
  el.style.top = `${clientY - rect.top}px`;
  floats.appendChild(el);
  if (options?.comboMult && options.comboMult > 1) {
    const comboEl = document.createElement('span');
    comboEl.className = 'float-coin-combo';
    comboEl.textContent = `${getComboName(options.comboMult)} ×${options.comboMult.toFixed(1)}`;
    comboEl.style.left = `${clientX - rect.left}px`;
    comboEl.style.top = `${clientY - rect.top - 12}px`;
    floats.appendChild(comboEl);
    requestAnimationFrame(() => comboEl.classList.add('float-coin--active'));
    setTimeout(() => {
      comboEl.classList.remove('float-coin--active');
      setTimeout(() => comboEl.remove(), 350);
    }, 800);
  }
  requestAnimationFrame(() => el.classList.add('float-coin--active'));
  setTimeout(() => {
    el.classList.remove('float-coin--active');
    setTimeout(() => el.remove(), 350);
  }, 650);
}

function getReachedMilestones(): number[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MILESTONES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function markMilestoneReached(value: number): void {
  const reached = getReachedMilestones();
  if (reached.includes(value)) return;
  reached.push(value);
  reached.sort((a, b) => a - b);
  if (typeof localStorage !== 'undefined') localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(reached));
}

function checkAndShowMilestones(): void {
  if (!session) return;
  const total = session.player.totalCoinsEver;
  const reached = getReachedMilestones();
  for (const m of MILESTONES) {
    if (total >= m && !reached.includes(m)) {
      markMilestoneReached(m);
      showMilestoneToast(m);
      break;
    }
  }
}

function showMilestoneToast(coins: number): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--milestone';
  el.setAttribute('role', 'status');
  el.textContent = `Milestone: ${formatNumber(coins, false)} total coins earned!`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

function updateComboIndicator(): void {
  const now = Date.now();
  const recent = clickTimestamps.filter((t) => t > now - COMBO_WINDOW_MS);
  const comboCount = recent.length;
  const mult =
    comboCount >= COMBO_MIN_CLICKS
      ? Math.min(COMBO_MAX_MULT, 1 + (comboCount - COMBO_MIN_CLICKS + 1) * COMBO_MULT_PER_LEVEL)
      : 0;
  const el = document.getElementById('combo-indicator');
  if (!el) return;
  if (mult > 1) {
    const name = getComboName(mult);
    el.textContent = `${name} ×${mult.toFixed(1)}`;
    el.setAttribute('data-combo-tier', name.toLowerCase().replace(/\s+/g, '-'));
    el.classList.add('combo-indicator--active');
  } else {
    el.removeAttribute('data-combo-tier');
    el.classList.remove('combo-indicator--active');
  }
}

function handleMineClick(e?: MouseEvent) {
  if (!session) return;

  const now = Date.now();
  clickTimestamps = clickTimestamps.filter((t) => t > now - COMBO_WINDOW_MS);
  clickTimestamps.push(now);

  const comboCount = clickTimestamps.length;
  const comboMult =
    comboCount >= COMBO_MIN_CLICKS
      ? Math.min(COMBO_MAX_MULT, 1 + (comboCount - COMBO_MIN_CLICKS + 1) * COMBO_MULT_PER_LEVEL)
      : 1;

  const superLucky = Math.random() < SUPER_LUCKY_CHANCE;
  const isLucky = !superLucky && Math.random() < LUCKY_CLICK_CHANCE;
  let baseCoins = 1;
  if (superLucky) baseCoins = SUPER_LUCKY_MIN + Math.floor(Math.random() * (SUPER_LUCKY_MAX - SUPER_LUCKY_MIN + 1));
  else if (isLucky) baseCoins = LUCKY_MIN + Math.floor(Math.random() * (LUCKY_MAX - LUCKY_MIN + 1));
  const coins = Math.max(1, Math.round(baseCoins * comboMult));

  session.player.addCoins(coins);
  sessionClickCount++;
  sessionCoinsFromClicks += coins;

  const clientX = e?.clientX ?? 0;
  const clientY = e?.clientY ?? 0;
  if (e) showFloatingCoin(coins, clientX, clientY, { lucky: isLucky, superLucky, comboMult: comboMult > 1 ? comboMult : undefined });
  if (superLucky) showSuperLuckyToast(coins);
  mineZoneCanvasApi?.onMineClick(e?.clientX, e?.clientY);
  updateComboIndicator();
  checkAndShowMilestones();
  saveSession();
  updateStats();
  renderUpgradeList();
  if (questState.quest) checkQuestProgress();
}

function handlePrestige(): void {
  if (!session) return;
  if (!session.player.coins.gte(PRESTIGE_COIN_THRESHOLD)) return;
  if (
    !confirm(
      `Prestige? You'll reset to 0 coins and 1 planet but keep Prestige level ${session.player.prestigeLevel + 1} (+${(session.player.prestigeLevel + 1) * 5}% production forever).`
    )
  )
    return;
  const newPlayer = Player.createAfterPrestige(session.player);
  session = new GameSession(session.id, newPlayer, []);
  activeEventInstances = [];
  questState.quest = generateQuest();
  saveQuestState();
  saveSession();
  sessionClickCount = 0;
  sessionCoinsFromClicks = 0;
  if ([2, 5, 10, 20].includes(newPlayer.prestigeLevel)) showPrestigeMilestoneToast(newPlayer.prestigeLevel);
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderPrestigeSection();
  renderCrewSection();
  renderQuestSection();
}

function showPrestigeMilestoneToast(level: number): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--prestige-milestone';
  el.setAttribute('role', 'status');
  el.textContent = `Prestige level ${level}! +${level * 5}% production forever`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

function mount() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <header>
      <div class="header-row">
        <div>
          <h1>STELLAR MINER</h1>
          <p class="subtitle">Mine coins. Buy upgrades. Conquer the belt.</p>
        </div>
        <button type="button" class="settings-btn" id="settings-btn" title="Settings" aria-label="Open settings">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-1.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h1.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v1.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-1.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </header>
    <div class="settings-overlay" id="settings-overlay" aria-hidden="true">
      <div class="settings-modal" role="dialog" aria-labelledby="settings-title">
        <div class="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" class="settings-close" id="settings-close" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          <div class="settings-option">
            <label for="setting-starfield-speed">Starfield speed</label>
            <select id="setting-starfield-speed">
              <option value="0.5">Slow</option>
              <option value="1" selected>Normal</option>
              <option value="1.5">Fast</option>
            </select>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input type="checkbox" id="setting-orbit-lines" checked />
              <span>Show orbit lines</span>
            </label>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input type="checkbox" id="setting-click-particles" checked />
              <span>Click particles</span>
            </label>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input type="checkbox" id="setting-compact-numbers" checked />
              <span>Compact numbers (1.2K)</span>
            </label>
          </div>
          <div class="settings-option settings-reset">
            <button type="button" class="reset-btn" id="settings-reset-btn">Reset progress</button>
          </div>
        </div>
      </div>
    </div>
    <section class="stats">
      <div class="stat-card stat-card--coins" id="coins-stat-card">
        <div class="stat-label">Coins</div>
        <div class="stat-value stat-value--hero" id="coins-value">0</div>
      </div>
      <div class="stat-card stat-card--production" id="production-stat-card" title="Base × planets × prestige × events">
        <div class="stat-label">Production <span class="production-live" id="production-live" aria-hidden="true"></span></div>
        <div class="stat-value" id="production-value">0/s</div>
        <div class="stat-breakdown" id="production-breakdown" aria-hidden="true"></div>
        <div class="session-stats" id="session-stats" aria-live="polite"></div>
        <div class="active-events" id="active-events" aria-live="polite"></div>
        <div class="next-event-countdown" id="next-event-countdown" aria-live="polite"></div>
      </div>
    </section>
    <div class="event-toasts" id="event-toasts" aria-live="polite"></div>
    <section class="mine-zone" id="mine-zone" title="Click or press Space to mine">
      <div class="mine-zone-floats" id="mine-zone-floats" aria-hidden="true"></div>
      <div class="mine-zone-visual" id="mine-zone-visual"></div>
      <p class="mine-zone-hint" aria-hidden="true">Click or press Space to mine</p>
      <span class="combo-indicator" id="combo-indicator" aria-live="polite"></span>
    </section>
    <section class="quest-section" id="quest-section">
      <h2>Quest</h2>
      <div class="quest-progress-wrap">
        <div class="quest-progress-bar" id="quest-progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <p class="quest-progress" id="quest-progress"></p>
      <p class="quest-streak-hint" id="quest-streak-hint" aria-live="polite"></p>
      <button type="button" class="quest-claim-btn" id="quest-claim" disabled>Claim</button>
    </section>
    <section class="prestige-section">
      <h2>Prestige</h2>
      <p class="prestige-hint">Reset coins and planets to gain +5% production per prestige level forever.</p>
      <div class="prestige-status" id="prestige-status"></div>
      <button type="button" class="prestige-btn" id="prestige-btn" disabled>Prestige</button>
    </section>
    <section class="crew-section" id="crew-section">
      <h2>Crew</h2>
      <p class="crew-hint">Hire astronauts for +2% production each. Upgrades cost coins and astronauts (crew is assigned to operate the equipment). Resets on Prestige.</p>
      <div class="crew-count" id="crew-count">No crew yet</div>
      <div class="crew-operates" id="crew-operates"></div>
      <button type="button" class="hire-astronaut-btn" id="hire-astronaut-btn">Hire astronaut</button>
    </section>
    <section class="planets-section">
      <h2>Planets</h2>
      <p class="planets-hint">Each planet has upgrade slots (expandable). More planets = +5% production each. Buy a new planet or add slots to expand.</p>
      <div class="planet-list" id="planet-list"></div>
      <button type="button" class="buy-planet-btn" id="buy-planet-btn">Buy new planet</button>
    </section>
    <section class="upgrades-section">
      <h2>Upgrades</h2>
      <p class="upgrades-hint">You can buy each upgrade multiple times; production stacks. Assigns to a planet with a free slot.</p>
      <div class="upgrade-list" id="upgrade-list"></div>
    </section>
  `;

  const mineZoneVisual = document.getElementById('mine-zone-visual');
  if (mineZoneVisual) {
    mineZoneCanvasApi = createMineZoneCanvas(mineZoneVisual, getSettings, getEventContext);
  }

  const settingsBtn = document.getElementById('settings-btn');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsClose = document.getElementById('settings-close');
  if (settingsBtn && settingsOverlay) {
    settingsBtn.addEventListener('click', openSettings);
    settingsOverlay.addEventListener('click', (e) => {
      if (e.target === settingsOverlay) closeSettings();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsOverlay.classList.contains('settings-overlay--open')) closeSettings();
    });
  }
  if (settingsClose) settingsClose.addEventListener('click', closeSettings);

  const starfieldSpeedEl = document.getElementById('setting-starfield-speed') as HTMLSelectElement | null;
  const orbitLinesEl = document.getElementById('setting-orbit-lines') as HTMLInputElement | null;
  const clickParticlesEl = document.getElementById('setting-click-particles') as HTMLInputElement | null;
  const compactNumbersEl = document.getElementById('setting-compact-numbers') as HTMLInputElement | null;
  if (starfieldSpeedEl) starfieldSpeedEl.value = String(settings.starfieldSpeed);
  if (orbitLinesEl) orbitLinesEl.checked = settings.showOrbitLines;
  if (clickParticlesEl) clickParticlesEl.checked = settings.clickParticles;
  if (compactNumbersEl) compactNumbersEl.checked = settings.compactNumbers;
  if (starfieldSpeedEl) starfieldSpeedEl.addEventListener('change', () => { settings.starfieldSpeed = Number(starfieldSpeedEl.value); saveSettings(settings); });
  if (orbitLinesEl) orbitLinesEl.addEventListener('change', () => { settings.showOrbitLines = orbitLinesEl.checked; saveSettings(settings); });
  if (clickParticlesEl) clickParticlesEl.addEventListener('change', () => { settings.clickParticles = clickParticlesEl.checked; saveSettings(settings); });
  if (compactNumbersEl) compactNumbersEl.addEventListener('change', () => { settings.compactNumbers = compactNumbersEl.checked; saveSettings(settings); applySettingsToUI(); });

  const resetBtn = document.getElementById('settings-reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', handleResetProgress);

  const mineZone = document.getElementById('mine-zone');
  if (mineZone) {
    mineZone.addEventListener('click', (e: Event) => handleMineClick(e as MouseEvent));
    mineZone.addEventListener('mousedown', () => mineZone.classList.add('mine-zone--active'));
    mineZone.addEventListener('mouseup', () => mineZone.classList.remove('mine-zone--active'));
    mineZone.addEventListener('mouseleave', () => mineZone.classList.remove('mine-zone--active'));
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code !== 'Space') return;
    const target = e.target as HTMLElement;
    if (target?.closest('input, select, textarea, [role="dialog"]')) return;
    e.preventDefault();
    handleMineClick();
  });

  const buyPlanetBtn = document.getElementById('buy-planet-btn');
  if (buyPlanetBtn) {
    buyPlanetBtn.addEventListener('click', handleBuyNewPlanet);
  }

  const prestigeBtn = document.getElementById('prestige-btn');
  if (prestigeBtn) prestigeBtn.addEventListener('click', handlePrestige);

  const hireAstronautBtn = document.getElementById('hire-astronaut-btn');
  if (hireAstronautBtn) hireAstronautBtn.addEventListener('click', handleHireAstronaut);

  renderPrestigeSection();
  renderCrewSection();
  renderQuestSection();

  const claimBtn = document.getElementById('quest-claim');
  if (claimBtn) claimBtn.addEventListener('click', claimQuest);

  if (!document.getElementById('debug-panel')) {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.className = 'debug-panel debug-panel--closed';
    debugPanel.setAttribute('aria-hidden', 'true');
    debugPanel.innerHTML = `
      <div class="debug-panel-header">
        <span>Debug</span>
        <button type="button" class="debug-close" id="debug-close" aria-label="Close debug">×</button>
      </div>
      <div class="debug-panel-body">
        <div class="debug-section" id="debug-stats"></div>
        <div class="debug-section">
          <div class="debug-actions">
            <button type="button" class="debug-btn" data-debug="coins-1k">+1K coins</button>
            <button type="button" class="debug-btn" data-debug="coins-50k">+50K coins</button>
            <button type="button" class="debug-btn" data-debug="trigger-event">Trigger event</button>
            <button type="button" class="debug-btn" data-debug="clear-events">Clear events</button>
          </div>
        </div>
      </div>
      <p class="debug-hint">F3 to toggle</p>
    `;
    document.body.appendChild(debugPanel);
    document.getElementById('debug-close')?.addEventListener('click', closeDebugMenu);
    debugPanel.querySelectorAll('.debug-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).getAttribute('data-debug');
        if (action) handleDebugAction(action);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        toggleDebugMenu();
      }
    });
  }

  const upgradeList = document.getElementById('upgrade-list');
  if (upgradeList) {
    upgradeList.addEventListener('click', (e: Event) => {
      const target = (e.target as HTMLElement).closest('button.upgrade-btn');
      if (!target || target.hasAttribute('disabled')) return;
      e.preventDefault();
      const upgradeId = target.getAttribute('data-upgrade-id');
      if (!upgradeId) return;
      const card = target.closest('.upgrade-card');
      const select = card?.querySelector('.upgrade-planet-select') as HTMLSelectElement | null;
      const planetId = select?.value || undefined;
      if (target.getAttribute('data-action') === 'max') {
        handleUpgradeBuyMax(upgradeId, planetId);
      } else {
        handleUpgradeBuy(upgradeId, planetId);
      }
    });
  }

  renderPlanetList();
}

let lastTime = performance.now();

function gameLoop(now: number) {
  if (!session) {
    requestAnimationFrame(gameLoop);
    return;
  }
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  const nowMs = Date.now();
  if (nowMs >= nextEventAt) {
    triggerRandomEvent();
    nextEventAt = nowMs + EVENT_INTERVAL_MS;
  }

  const eventMult = getEventMultiplier();
  const rate = session.player.effectiveProductionRate * eventMult;
  if (rate > 0) {
    session.player.addCoins(rate * dt);
    updateStats();
    updateUpgradeListInPlace();
    const p = getQuestProgress();
    if (p?.done) renderQuestSection();
  }
  const planetViews = session.player.planets.map((p) => {
    const upgradeCounts: Record<string, number> = {};
    for (const u of p.upgrades) {
      upgradeCounts[u.id] = (upgradeCounts[u.id] ?? 0) + 1;
    }
    return {
      id: p.id,
      name: p.name,
      usedSlots: p.usedSlots,
      maxUpgrades: p.maxUpgrades,
      upgradeCounts,
    };
  });
  starfieldApi?.update(dt);
  starfieldApi?.draw();
  mineZoneCanvasApi?.setPlanets(planetViews);
  mineZoneCanvasApi?.update(dt);
  mineZoneCanvasApi?.draw();

  updateComboIndicator();

  const debugPanel = document.getElementById('debug-panel');
  if (debugPanel && !debugPanel.classList.contains('debug-panel--closed')) {
    updateDebugPanel();
  }

  requestAnimationFrame(gameLoop);
}

async function init() {
  session = await getOrCreateSession();
  const offlineCoins = saveLoad.getLastOfflineCoins();
  gameStartTime = Date.now();
  nextEventAt = gameStartTime + MIN_EVENT_DELAY_MS;
  starfieldApi = startStarfield(getSettings, getEventContext);
  mount();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  if (offlineCoins > 0) showOfflineToast(offlineCoins);
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  setInterval(saveSession, SAVE_INTERVAL_MS);
}

init();
