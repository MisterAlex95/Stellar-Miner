import { getSession, getNextEventAt, getActiveEventInstances, setActiveEventInstances, incrementRunEventsTriggered, addDiscoveredEvent, getDiscoveredEventIds, setPendingChoiceEvent } from './gameState.js';
import { getEventMultiplier } from './gameState.js';
import { getResearchProductionMultiplier } from './research.js';
import { getSetBonusMultiplier } from './moduleSetBonuses.js';
import { getEventPoolForRun, CHOICE_EVENT_CATALOG, CHOICE_EVENT_CHANCE } from './catalogs.js';
import { getRunStats } from './gameState.js';
import { pushActiveEventInstance } from './gameState.js';
import { t } from './strings.js';
import { notifyRefresh } from './refreshSignal.js';
import { getPresentationPort } from './uiBridge.js';
import { checkCodexUnlocks } from './codex.js';
import { tryShowNarrator } from './narrator.js';
import { canShowChoiceEvent } from './handlersEventChoice.js';
import { Planet } from '../domain/entities/Planet.js';
import { generatePlanetName } from '../domain/constants.js';

function refreshAfterDebugAction(): void {
  notifyRefresh();
  updateDebugPanel();
}

export function triggerRandomEvent(): void {
  const runStats = getRunStats();
  if (runStats.runEventsTriggered === 0) tryShowNarrator('first_event');
  const session = getSession();
  const astronautCount = session?.player.astronautCount ?? 0;
  const coins = session?.player.coins.toNumber() ?? 0;
  const upgradeCount = session?.player.planets.reduce((s, p) => s + p.upgrades.length, 0) ?? 0;
  const useChoiceEvent =
    CHOICE_EVENT_CATALOG.length > 0 &&
    Math.random() < CHOICE_EVENT_CHANCE &&
    canShowChoiceEvent(astronautCount, coins, upgradeCount);
  if (useChoiceEvent) {
    const pool = CHOICE_EVENT_CATALOG.filter((ce) =>
      ce.choices.some(
        (c) =>
          (c.costAstronauts === 0 || astronautCount >= c.costAstronauts) &&
          (c.costCoins === 0 || coins >= c.costCoins) &&
          (c.costUpgrade === 0 || upgradeCount >= c.costUpgrade)
      )
    );
    if (pool.length > 0) {
      const choiceEvent = pool[Math.floor(Math.random() * pool.length)];
      setPendingChoiceEvent(choiceEvent);
      incrementRunEventsTriggered();
      getPresentationPort().showEventChoice(choiceEvent);
      notifyRefresh();
      return;
    }
  }
  const pool = getEventPoolForRun(runStats.runEventsTriggered);
  const event = pool[Math.floor(Math.random() * pool.length)];
  const firstTime = !getDiscoveredEventIds().includes(event.id);
  pushActiveEventInstance({ event, endsAt: Date.now() + event.effect.durationMs });
  incrementRunEventsTriggered();
  addDiscoveredEvent(event.id);
  getPresentationPort().showEventToast(event, { firstTime });
  if (event.effect.multiplier < 1) tryShowNarrator('first_negative_event');
  checkCodexUnlocks();
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
  const setBonusMult = getSetBonusMultiplier(player);
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult * setBonusMult);
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
  if (action === 'open-balance') {
    if (typeof window !== 'undefined') {
      const url = new URL('balance.html', window.location.origin).href;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  const session = getSession();
  if (!session) return;
  if (action === 'coins-1k') session.player.addCoins(1000);
  else if (action === 'coins-50k') session.player.addCoins(50_000);
  else if (action === 'trigger-event') triggerRandomEvent();
  else if (action === 'spawn-event') triggerRandomEvent();
  else if (action === 'clear-events') setActiveEventInstances([]);
  else if (action === 'add-planet') {
    const n = session.player.planets.length + 1;
    const id = `planet-${n}`;
    const name = generatePlanetName(id);
    session.player.addPlanet(Planet.create(id, name));
  }
  refreshAfterDebugAction();
}
