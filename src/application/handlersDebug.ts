import { getSession, getNextEventAt, getActiveEventInstances, setActiveEventInstances, incrementRunEventsTriggered, addDiscoveredEvent } from './gameState.js';
import { getEventMultiplier } from './gameState.js';
import { getResearchProductionMultiplier } from './research.js';
import { getEventPoolForRun } from './catalogs.js';
import { getRunStats } from './gameState.js';
import { pushActiveEventInstance } from './gameState.js';
import { t } from './strings.js';
import { notifyRefresh } from './refreshSignal.js';
import { getPresentationPort } from './uiBridge.js';
import { Planet } from '../domain/entities/Planet.js';
import { generatePlanetName } from '../domain/constants.js';

function refreshAfterDebugAction(): void {
  notifyRefresh();
  updateDebugPanel();
}

export function triggerRandomEvent(): void {
  const pool = getEventPoolForRun(getRunStats().runEventsTriggered);
  const event = pool[Math.floor(Math.random() * pool.length)];
  pushActiveEventInstance({ event, endsAt: Date.now() + event.effect.durationMs });
  incrementRunEventsTriggered();
  addDiscoveredEvent(event.id);
  getPresentationPort().showEventToast(event);
  notifyRefresh();
}

export function openDebugMenu(): void {
  getPresentationPort().setDebugOpen(true);
  updateDebugPanel();
}

export function closeDebugMenu(): void {
  getPresentationPort().setDebugOpen(false);
}

export function toggleDebugMenu(): void {
  const isClosed = !getPresentationPort().getDebugOpen();
  if (isClosed) openDebugMenu();
  else closeDebugMenu();
}

export function updateDebugPanel(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const now = Date.now();
  const nextEventAt = getNextEventAt();
  const nextEventIn = Math.max(0, Math.ceil((nextEventAt - now) / 1000));
  const activeCount = getActiveEventInstances().filter((a) => a.endsAt > now).length;

  const rateNum = effectiveRate.toNumber();
  const coinsNum = player.coins.value.toNumber();
  const baseNum = player.productionRate.value.toNumber();
  const rows: { label: string; value: string }[] = [
    { label: t('debugCoinsRaw'), value: Number.isFinite(coinsNum) ? coinsNum.toFixed(1) : player.coins.value.toString() },
    { label: t('debugProductionBase'), value: `${Number.isFinite(baseNum) ? baseNum.toFixed(1) : player.productionRate.value.toString()}/s` },
    { label: t('debugProductionEffective'), value: `${Number.isFinite(rateNum) ? rateNum.toFixed(1) : effectiveRate.toString()}/s` },
    { label: t('debugEventMult'), value: `×${eventMult.toFixed(1)}` },
    { label: t('debugPrestigeLevel'), value: String(player.prestigeLevel) },
    { label: t('debugPlanets'), value: String(player.planets.length) },
    { label: t('debugUpgradesTotal'), value: String(player.upgrades.length) },
    { label: t('debugNextEventIn'), value: `${nextEventIn}s` },
    { label: t('debugActiveEvents'), value: String(activeCount) },
  ];
  getPresentationPort().setDebugStats(rows);
}

export function handleDebugAction(action: string): void {
  const session = getSession();
  if (!session) return;
  if (action === 'coins-1k') session.player.addCoins(1000);
  else if (action === 'coins-50k') session.player.addCoins(50_000);
  else if (action === 'trigger-event') triggerRandomEvent();
  else if (action === 'clear-events') setActiveEventInstances([]);
  else if (action === 'add-planet') {
    const n = session.player.planets.length + 1;
    const id = `planet-${n}`;
    const name = generatePlanetName(id);
    session.player.addPlanet(Planet.create(id, name));
  }
  refreshAfterDebugAction();
}
