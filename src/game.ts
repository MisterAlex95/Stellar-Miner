import './game.css';
import { Player } from './domain/entities/Player.js';
import { Upgrade } from './domain/entities/Upgrade.js';
import { UpgradeEffect } from './domain/value-objects/UpgradeEffect.js';
import { GameSession } from './domain/aggregates/GameSession.js';
import { UpgradeService } from './domain/services/UpgradeService.js';
import { SaveLoadService } from './infrastructure/SaveLoadService.js';

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
const saveLoad = new SaveLoadService();
const upgradeService = new UpgradeService();

async function getOrCreateSession(): Promise<GameSession> {
  const loaded = await saveLoad.load();
  if (loaded) return loaded;
  const player = Player.create('player-1');
  player.addCoins(10);
  return new GameSession('session-1', player);
}

function formatNumber(n: number): string {
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
  if (coinsEl) coinsEl.textContent = formatNumber(player.coins.value);
  if (rateEl) rateEl.textContent = formatNumber(player.productionRate.value) + '/s';
}

/** Rebuild the upgrade list from scratch (init, after purchase, after mine). */
function renderUpgradeList() {
  if (!session) return;
  const player = session.player;
  const listEl = document.getElementById('upgrade-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  for (const def of UPGRADE_CATALOG) {
    const owned = player.upgrades.filter((u) => u.id === def.id).length;
    const upgrade = createUpgrade(def);
    const canAfford = player.coins.gte(upgrade.cost);
    const buyLabel = owned > 0 ? `Buy (+1)` : `Buy`;

    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <div class="upgrade-info">
        <div class="upgrade-name">${def.name}${owned > 0 ? `<span class="count-badge">×${owned}</span>` : ''}</div>
        <div class="upgrade-effect">+${formatNumber(def.coinsPerSecond)} /s each</div>
      </div>
      <span class="upgrade-cost">${formatNumber(def.cost)} ⬡</span>
      <button class="upgrade-btn" type="button" data-upgrade-id="${def.id}" ${canAfford ? '' : 'disabled'}>${buyLabel}</button>
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

  listEl.querySelectorAll('.upgrade-card').forEach((card) => {
    const btn = card.querySelector('.upgrade-btn');
    const id = btn?.getAttribute('data-upgrade-id');
    if (!id) return;
    const def = UPGRADE_CATALOG.find((d) => d.id === id);
    if (!def) return;
    const owned = player.upgrades.filter((u) => u.id === id).length;
    const canAfford = player.coins.gte(def.cost);
    const buyLabel = owned > 0 ? 'Buy (+1)' : 'Buy';

    const nameEl = card.querySelector('.upgrade-name');
    if (nameEl) {
      nameEl.innerHTML = def.name + (owned > 0 ? `<span class="count-badge">×${owned}</span>` : '');
    }
    if (btn) {
      btn.textContent = buyLabel;
      btn.toggleAttribute('disabled', !canAfford);
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
  if (!player.coins.gte(upgrade.cost)) return;
  upgradeService.purchaseUpgrade(player, upgrade);
  saveSession();
  updateStats();
  renderUpgradeList();
}

function saveSession() {
  saveLoad.save(session);
}

function handleMineClick() {
  if (!session) return;
  session.player.addCoins(1);
  saveSession();
  updateStats();
  renderUpgradeList();
}

function mount() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <header>
      <h1>STELLAR MINER</h1>
      <p class="subtitle">Mine coins. Buy upgrades. Conquer the belt.</p>
    </header>
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
    <section class="mine-zone">
      <button type="button" class="mine-btn" id="mine-btn">MINE</button>
      <p class="mine-hint">+1 coin per click · Production runs automatically</p>
    </section>
    <section class="upgrades-section">
      <h2>Upgrades</h2>
      <p class="upgrades-hint">You can buy each upgrade multiple times; production stacks.</p>
      <div class="upgrade-list" id="upgrade-list"></div>
    </section>
  `;

  const mineBtn = document.getElementById('mine-btn');
  if (mineBtn) {
    mineBtn.addEventListener('click', handleMineClick);
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
  requestAnimationFrame(gameLoop);
}

async function init() {
  session = await getOrCreateSession();
  mount();
  updateStats();
  renderUpgradeList();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  setInterval(saveSession, SAVE_INTERVAL_MS);
}

init();
