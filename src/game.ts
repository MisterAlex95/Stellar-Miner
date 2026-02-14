import './game.css';
import { Player } from './domain/entities/Player.js';
import { Upgrade } from './domain/entities/Upgrade.js';
import { UpgradeEffect } from './domain/value-objects/UpgradeEffect.js';
import { GameSession } from './domain/aggregates/GameSession.js';
import { UpgradeService } from './domain/services/UpgradeService.js';
import { PlanetService } from './domain/services/PlanetService.js';
import { SaveLoadService } from './infrastructure/SaveLoadService.js';
import { startStarfield } from './presentation/StarfieldCanvas.js';
import { createMineZoneCanvas } from './presentation/MineZoneCanvas.js';
import { loadSettings, saveSettings, type Settings } from './settings.js';

const SAVE_INTERVAL_MS = 3000;

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

let session: GameSession;
let settings: Settings = loadSettings();
const saveLoad = new SaveLoadService();
const upgradeService = new UpgradeService();
const planetService = new PlanetService();
let starfieldApi: ReturnType<typeof startStarfield> | null = null;
let mineZoneCanvasApi: ReturnType<typeof createMineZoneCanvas> | null = null;

function getSettings(): Settings {
  return settings;
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

/** Only update coins and production display (no list rebuild). */
function updateStats() {
  if (!session) return;
  const player = session.player;
  const coinsEl = document.getElementById('coins-value');
  const rateEl = document.getElementById('production-value');
  if (coinsEl) coinsEl.textContent = formatNumber(player.coins.value, settings.compactNumbers);
  if (rateEl) rateEl.textContent = formatNumber(player.effectiveProductionRate, settings.compactNumbers) + '/s';
  const breakdownEl = document.getElementById('production-breakdown');
  if (breakdownEl) {
    const base = player.productionRate.value;
    const bonus = player.planets.length > 1 ? (player.planets.length - 1) * 5 : 0;
    if (base > 0 || bonus > 0) {
      breakdownEl.textContent = bonus > 0
        ? `Base ${formatNumber(base, settings.compactNumbers)}/s + ${bonus}% (${player.planets.length} planets)`
        : `Base ${formatNumber(base, settings.compactNumbers)}/s`;
      breakdownEl.style.display = '';
    } else {
      breakdownEl.style.display = 'none';
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
  closeSettings();
  location.reload();
}

function handleMineClick(e?: MouseEvent) {
  if (!session) return;
  session.player.addCoins(1);
  mineZoneCanvasApi?.onMineClick(e?.clientX, e?.clientY);
  saveSession();
  updateStats();
  renderUpgradeList();
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
      <div class="stat-card stat-card--production" title="Base rate from upgrades × (1 + 5% per extra planet)">
        <div class="stat-label">Production</div>
        <div class="stat-value" id="production-value">0/s</div>
        <div class="stat-breakdown" id="production-breakdown" aria-hidden="true"></div>
      </div>
    </section>
    <section class="mine-zone" id="mine-zone" title="Click to mine">
      <div class="mine-zone-visual" id="mine-zone-visual"></div>
      <p class="mine-zone-hint" aria-hidden="true">Click to mine</p>
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
    mineZoneCanvasApi = createMineZoneCanvas(mineZoneVisual, getSettings);
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
  const rate = session.player.effectiveProductionRate;
  if (rate > 0) {
    session.player.addCoins(rate * dt);
    updateStats();
    updateUpgradeListInPlace();
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
  requestAnimationFrame(gameLoop);
}

async function init() {
  session = await getOrCreateSession();
  starfieldApi = startStarfield(getSettings);
  mount();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  setInterval(saveSession, SAVE_INTERVAL_MS);
}

init();
