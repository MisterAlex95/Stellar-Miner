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
import { PRESTIGE_COIN_THRESHOLD } from './domain/constants.js';

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
};

/** Upgrades: first at 100 (≈100 clicks), then ×5 per tier. Efficiency 50 coins per 1/s. Stretched so the clicker lasts. */
const UPGRADE_CATALOG: UpgradeDef[] = [
  { id: 'mining-robot', name: 'Mining Robot', description: 'Basic autonomous miner. Your first step into the belt.', cost: 100, coinsPerSecond: 2, tier: 1 },
  { id: 'drill-mk1', name: 'Drill Mk.I', description: 'Improved extraction head. Cuts through surface rock in seconds.', cost: 500, coinsPerSecond: 10, tier: 2 },
  { id: 'drill-mk2', name: 'Drill Mk.II', description: 'Heavy-duty surface drill. Built for long shifts in the void.', cost: 2500, coinsPerSecond: 50, tier: 3 },
  { id: 'asteroid-rig', name: 'Asteroid Rig', description: 'Full mining platform. Drills, crushes, and sorts in one unit.', cost: 12500, coinsPerSecond: 250, tier: 4 },
  { id: 'orbital-station', name: 'Orbital Station', description: 'Refinery and logistics hub. The heart of your operation.', cost: 62500, coinsPerSecond: 1250, tier: 5 },
  { id: 'deep-core-drill', name: 'Deep Core Drill', description: 'Penetrates dense ore layers. Reaches what others can\'t.', cost: 312500, coinsPerSecond: 6250, tier: 6 },
  { id: 'stellar-harvester', name: 'Stellar Harvester', description: 'Harvests rare minerals at scale. Feeds the entire sector.', cost: 1562500, coinsPerSecond: 31250, tier: 7 },
  { id: 'quantum-extractor', name: 'Quantum Extractor', description: 'Maximum efficiency extraction. Near-instant ore processing.', cost: 7812500, coinsPerSecond: 156250, tier: 8 },
  { id: 'void-crusher', name: 'Void Crusher', description: 'Pulverizes asteroid cores. Built for the endgame.', cost: 39062500, coinsPerSecond: 781250, tier: 9 },
  { id: 'nexus-collector', name: 'Nexus Collector', description: 'Harvests from multiple dimensions. The ultimate upgrade.', cost: 195312500, coinsPerSecond: 3906250, tier: 10 },
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

type QuestType = 'coins' | 'production' | 'upgrade';

type Quest = {
  type: QuestType;
  target: number;
  targetId?: string; // upgrade id for type 'upgrade'
  reward: number;
  description: string;
};

type QuestState = { quest: Quest | null };

let questState: QuestState = loadQuestState();

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
  if (roll < 0.4) {
    const targets = [100, 500, 1000, 5000, 10000];
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'coins',
      target,
      reward: Math.floor(target * 0.3) + 20,
      description: `Reach ${target.toLocaleString()} coins`,
    };
  }
  if (roll < 0.7) {
    const targets = [5, 10, 25, 50, 100];
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'production',
      target,
      reward: target * 2 + 30,
      description: `Reach ${target}/s production`,
    };
  }
  const def = UPGRADE_CATALOG[Math.floor(Math.random() * Math.min(5, UPGRADE_CATALOG.length))];
  const n = Math.floor(Math.random() * 2) + 1;
  return {
    type: 'upgrade',
    target: n,
    targetId: def.id,
    reward: def.cost * 0.2 + 50,
    description: `Own ${n}× ${def.name}`,
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
  return { current, target: q.target, done: current >= q.target };
}

function checkQuestProgress(): void {
  const p = getQuestProgress();
  if (p?.done) renderQuestSection();
}

function claimQuest(): void {
  if (!session || !questState.quest) return;
  const p = getQuestProgress();
  if (!p?.done) return;
  session.player.addCoins(Math.floor(questState.quest.reward));
  questState.quest = generateQuest();
  saveQuestState();
  saveSession();
  updateStats();
  renderUpgradeList();
  renderQuestSection();
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

  if (progressEl) {
    progressEl.textContent = `${q.description}: ${formatNumber(p.current, false)} / ${formatNumber(p.target, false)}`;
  }
  if (claimBtn) {
    claimBtn.textContent = `Claim ${formatNumber(Math.floor(q.reward), settings.compactNumbers)} ⬡`;
    claimBtn.toggleAttribute('disabled', !p.done);
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
  if (coinsEl) coinsEl.textContent = formatNumber(player.coins.value, settings.compactNumbers);
  if (rateEl) rateEl.textContent = formatNumber(effectiveRate, settings.compactNumbers) + '/s';
  const breakdownEl = document.getElementById('production-breakdown');
  if (breakdownEl) {
    const base = player.productionRate.value;
    const planetBonus = player.planets.length > 1 ? (player.planets.length - 1) * 5 : 0;
    const prestigeBonus = player.prestigeLevel > 0 ? player.prestigeLevel * 5 : 0;
    const parts: string[] = [];
    if (base > 0) parts.push(`Base ${formatNumber(base, settings.compactNumbers)}/s`);
    if (planetBonus > 0) parts.push(`+${planetBonus}% planets`);
    if (prestigeBonus > 0) parts.push(`+${prestigeBonus}% prestige`);
    if (eventMult > 1) parts.push(`×${eventMult.toFixed(1)} event`);
    breakdownEl.textContent = parts.length > 0 ? parts.join(' · ') : '';
    breakdownEl.style.display = parts.length > 0 ? '' : 'none';
  }
  renderPrestigeSection();

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
      const canAfford = player.coins.gte(upgrade.cost);
      const canBuy = canAfford && hasFreeSlot;
      const buyLabel = owned > 0 ? `+1` : `Buy`;
      const maxCount = getMaxBuyCount(def.id);
      const maxLabel = maxCount > 1 ? `Max (${maxCount})` : `Max`;

      const planetOptions = choosePlanet
        ? planetsWithSlot.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')
        : '';
      const planetSelectHtml = choosePlanet
        ? `<label class="upgrade-planet-label" for="planet-${def.id}">To</label><select class="upgrade-planet-select" id="planet-${def.id}" data-upgrade-id="${def.id}" aria-label="Assign to planet">${planetOptions}</select>`
        : '';

      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.setAttribute('data-tier', String(def.tier));
      card.innerHTML = `
        <div class="upgrade-info">
          <div class="upgrade-header">
            <span class="upgrade-tier" aria-label="Tier ${def.tier}">T${def.tier}</span>
            <div class="upgrade-name">${def.name}${owned > 0 ? `<span class="count-badge">×${owned}</span>` : ''}</div>
          </div>
          <div class="upgrade-description">${def.description}</div>
          <div class="upgrade-effect">+${formatNumber(def.coinsPerSecond, settings.compactNumbers)} /s each</div>
        </div>
        <span class="upgrade-cost">${formatNumber(def.cost, settings.compactNumbers)} ⬡</span>
        <div class="upgrade-actions">
          ${planetSelectHtml}
          <div class="upgrade-buttons">
            <button class="upgrade-btn upgrade-btn--buy" type="button" data-upgrade-id="${def.id}" data-action="buy" title="${!hasFreeSlot ? 'No free slot. Add a slot to a planet or buy a new planet!' : ''}" ${canBuy ? '' : 'disabled'}>${buyLabel}</button>
            <button class="upgrade-btn upgrade-btn--max" type="button" data-upgrade-id="${def.id}" data-action="max" title="Buy as many as you can afford with current slots" ${maxCount > 0 ? '' : 'disabled'}>${maxLabel}</button>
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
    const canAfford = player.coins.gte(def.cost);
    const canBuy = canAfford && hasFreeSlot;
    const buyLabel = owned > 0 ? '+1' : 'Buy';
    const maxCount = getMaxBuyCount(id);
    const maxLabel = maxCount > 1 ? `Max (${maxCount})` : 'Max';

    const nameEl = card.querySelector('.upgrade-name');
    if (nameEl) {
      nameEl.innerHTML = def.name + (owned > 0 ? `<span class="count-badge">×${owned}</span>` : '');
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
      buyBtn.setAttribute('title', !hasFreeSlot ? 'No free slot. Add a slot to a planet or buy a new planet!' : '');
    }
    const maxBtn = card.querySelector('.upgrade-btn--max');
    if (maxBtn) {
      maxBtn.textContent = maxLabel;
      maxBtn.toggleAttribute('disabled', maxCount <= 0);
    }
  });
}

function render() {
  updateStats();
  renderUpgradeList();
}

/** How many of this upgrade can be bought with current coins and free slots. */
function getMaxBuyCount(upgradeId: string): number {
  if (!session) return 0;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return 0;
  const player = session.player;
  const freeSlots = player.planets.reduce((s, p) => s + p.freeSlots, 0);
  if (freeSlots <= 0 || !player.coins.gte(def.cost)) return 0;
  const byCoins = Math.floor(player.coins.value / def.cost);
  return Math.min(byCoins, freeSlots);
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
  upgradeService.purchaseUpgrade(player, upgrade, targetPlanet ?? null);
  saveSession();
  updateStats();
  renderUpgradeList();
  renderQuestSection();
}

/** Buy as many as possible (limited by coins and free slots). Uses selected planet first, then others. */
function handleUpgradeBuyMax(upgradeId: string, planetId?: string) {
  if (!session) return;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return;
  const player = session.player;
  let bought = 0;
  while (player.coins.gte(def.cost)) {
    let target = planetId ? player.planets.find((p) => p.id === planetId) : null;
    if (!target?.hasFreeSlot()) target = player.getPlanetWithFreeSlot();
    if (!target) break;
    const upgrade = createUpgrade(def);
    upgradeService.purchaseUpgrade(player, upgrade, target);
    bought++;
  }
  if (bought > 0) {
    saveSession();
    updateStats();
    renderUpgradeList();
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
      return `<div class="planet-row" data-planet-id="${p.id}" title="${p.usedSlots}/${p.maxUpgrades} slots${player.planets.length > 1 ? ' • +' + (player.planets.length - 1) * 5 + '% prod from planets' : ''}">
        <span class="planet-slot">${p.name}: <strong>${p.usedSlots}/${p.maxUpgrades}</strong></span>
        <button type="button" class="add-slot-btn" data-planet-id="${p.id}" ${canAddSlot ? '' : 'disabled'} title="Add one upgrade slot">+1 slot (${formatNumber(addSlotCost, settings.compactNumbers)} ⬡)</button>
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
  if (typeof localStorage !== 'undefined') localStorage.removeItem(QUEST_STORAGE_KEY);
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

function showFloatingCoin(amount: number, clientX: number, clientY: number): void {
  const zone = document.getElementById('mine-zone');
  const floats = document.getElementById('mine-zone-floats');
  if (!zone || !floats) return;
  const rect = zone.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'float-coin';
  el.textContent = `+${amount}`;
  el.style.left = `${clientX - rect.left}px`;
  el.style.top = `${clientY - rect.top}px`;
  floats.appendChild(el);
  requestAnimationFrame(() => el.classList.add('float-coin--active'));
  setTimeout(() => {
    el.classList.remove('float-coin--active');
    setTimeout(() => el.remove(), 350);
  }, 650);
}

function handleMineClick(e?: MouseEvent) {
  if (!session) return;
  session.player.addCoins(1);
  if (e) showFloatingCoin(1, e.clientX, e.clientY);
  mineZoneCanvasApi?.onMineClick(e?.clientX, e?.clientY);
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
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderPrestigeSection();
  renderQuestSection();
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
      <div class="stat-card">
        <div class="stat-label">Coins</div>
        <div class="stat-value" id="coins-value">0</div>
      </div>
      <div class="stat-card stat-card--production" title="Base × planets × prestige × events">
        <div class="stat-label">Production</div>
        <div class="stat-value" id="production-value">0/s</div>
        <div class="stat-breakdown" id="production-breakdown" aria-hidden="true"></div>
        <div class="active-events" id="active-events" aria-live="polite"></div>
      </div>
    </section>
    <div class="event-toasts" id="event-toasts" aria-live="polite"></div>
    <section class="mine-zone" id="mine-zone" title="Click to mine">
      <div class="mine-zone-floats" id="mine-zone-floats" aria-hidden="true"></div>
      <div class="mine-zone-visual" id="mine-zone-visual"></div>
      <p class="mine-zone-hint" aria-hidden="true">Click to mine</p>
    </section>
    <section class="quest-section" id="quest-section">
      <h2>Quest</h2>
      <p class="quest-progress" id="quest-progress"></p>
      <button type="button" class="quest-claim-btn" id="quest-claim" disabled>Claim</button>
    </section>
    <section class="prestige-section">
      <h2>Prestige</h2>
      <p class="prestige-hint">Reset coins and planets to gain +5% production per prestige level forever.</p>
      <div class="prestige-status" id="prestige-status"></div>
      <button type="button" class="prestige-btn" id="prestige-btn" disabled>Prestige</button>
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
  }

  const buyPlanetBtn = document.getElementById('buy-planet-btn');
  if (buyPlanetBtn) {
    buyPlanetBtn.addEventListener('click', handleBuyNewPlanet);
  }

  const prestigeBtn = document.getElementById('prestige-btn');
  if (prestigeBtn) prestigeBtn.addEventListener('click', handlePrestige);

  renderPrestigeSection();
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
