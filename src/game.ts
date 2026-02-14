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

type UpgradeDef = { id: string; name: string; cost: number; coinsPerSecond: number };

const UPGRADE_CATALOG: UpgradeDef[] = [
  { id: 'mining-robot', name: 'Mining Robot', cost: 50, coinsPerSecond: 1 },
  { id: 'drill-mk1', name: 'Drill Mk.I', cost: 200, coinsPerSecond: 5 },
  { id: 'drill-mk2', name: 'Drill Mk.II', cost: 1000, coinsPerSecond: 20 },
  { id: 'asteroid-rig', name: 'Asteroid Rig', cost: 5000, coinsPerSecond: 100 },
  { id: 'orbital-station', name: 'Orbital Station', cost: 25000, coinsPerSecond: 500 },
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
  player.addCoins(10);
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
  if (rateEl) rateEl.textContent = formatNumber(player.productionRate.value, settings.compactNumbers) + '/s';
}

/** Rebuild the upgrade list from scratch (init, after purchase, after mine). */
function renderUpgradeList() {
  if (!session) return;
  const player = session.player;
  const listEl = document.getElementById('upgrade-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const hasFreeSlot = player.getPlanetWithFreeSlot() !== null;
  for (const def of UPGRADE_CATALOG) {
    const owned = player.upgrades.filter((u) => u.id === def.id).length;
    const upgrade = createUpgrade(def);
    const canAfford = player.coins.gte(upgrade.cost);
    const canBuy = canAfford && hasFreeSlot;
    const buyLabel = owned > 0 ? `Buy (+1)` : `Buy`;

    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <div class="upgrade-info">
        <div class="upgrade-name">${def.name}${owned > 0 ? `<span class="count-badge">×${owned}</span>` : ''}</div>
        <div class="upgrade-effect">+${formatNumber(def.coinsPerSecond, settings.compactNumbers)} /s each</div>
      </div>
      <span class="upgrade-cost">${formatNumber(def.cost, settings.compactNumbers)} ⬡</span>
      <button class="upgrade-btn" type="button" data-upgrade-id="${def.id}" title="${!hasFreeSlot ? 'No free slot on any planet. Buy a new planet!' : ''}" ${canBuy ? '' : 'disabled'}>${buyLabel}</button>
    `;
    listEl.appendChild(card);
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
    const btn = card.querySelector('.upgrade-btn');
    const id = btn?.getAttribute('data-upgrade-id');
    if (!id) return;
    const def = UPGRADE_CATALOG.find((d) => d.id === id);
    if (!def) return;
    const owned = player.upgrades.filter((u) => u.id === id).length;
    const canAfford = player.coins.gte(def.cost);
    const canBuy = canAfford && hasFreeSlot;
    const buyLabel = owned > 0 ? 'Buy (+1)' : 'Buy';

    const nameEl = card.querySelector('.upgrade-name');
    if (nameEl) {
      nameEl.innerHTML = def.name + (owned > 0 ? `<span class="count-badge">×${owned}</span>` : '');
    }
    if (btn) {
      btn.textContent = buyLabel;
      btn.toggleAttribute('disabled', !canBuy);
      btn.setAttribute('title', !hasFreeSlot ? 'No free slot on any planet. Buy a new planet!' : '');
    }
  });
}

function render() {
  updateStats();
  renderUpgradeList();
}

function handleUpgradeBuy(upgradeId: string) {
  if (!session) return;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return;
  const player = session.player;
  const upgrade = createUpgrade(def);
  if (!player.coins.gte(upgrade.cost) || !player.getPlanetWithFreeSlot()) return;
  upgradeService.purchaseUpgrade(player, upgrade);
  saveSession();
  updateStats();
  renderUpgradeList();
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

/** Refresh the planet list DOM (slots + buy button). */
function renderPlanetList() {
  if (!session) return;
  const listEl = document.getElementById('planet-list');
  if (!listEl) return;
  const player = session.player;
  const cost = planetService.getNewPlanetCost(player);
  const canBuyPlanet = planetService.canBuyNewPlanet(player);
  listEl.innerHTML = player.planets
    .map(
      (p) =>
        `<div class="planet-slot" title="${p.usedSlots}/${p.maxUpgrades} upgrades">${p.name}: <strong>${p.usedSlots}/${p.maxUpgrades}</strong></div>`
    )
    .join('');
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
      <div class="stat-card">
        <div class="stat-label">Production</div>
        <div class="stat-value" id="production-value">0/s</div>
      </div>
    </section>
    <div class="mine-action">
      <button type="button" class="mine-btn" id="mine-btn">MINE</button>
    </div>
    <section class="mine-zone" id="mine-zone">
      <div class="mine-zone-visual" id="mine-zone-visual"></div>
    </section>
    <section class="planets-section">
      <h2>Planets</h2>
      <p class="planets-hint">Each planet has limited upgrade slots. Buy a new planet to expand.</p>
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

  const mineBtn = document.getElementById('mine-btn');
  if (mineBtn) {
    mineBtn.addEventListener('click', (e: Event) => handleMineClick(e as MouseEvent));
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
      const id = target.getAttribute('data-upgrade-id');
      if (id) {
        handleUpgradeBuy(id);
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
  const rate = session.player.productionRate.value;
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
