import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyEventChoice, canShowChoiceEvent } from './handlersEventChoice.js';
import {
  setSession,
  getPendingChoiceEvent,
  setPendingChoiceEvent,
  getActiveEventInstances,
  setActiveEventInstances,
  setRunStatsFromPayload,
  setDiscoveredEventIds,
} from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { CHOICE_EVENT_CATALOG } from './catalogs.js';

const mockClearEventChoice = vi.fn();
const mockShowEventToast = vi.fn();
vi.mock('./uiBridge.js', () => ({
  getPresentationPort: vi.fn(() => ({
    clearEventChoice: mockClearEventChoice,
    showEventToast: mockShowEventToast,
  })),
}));

describe('handlersEventChoice', () => {
  beforeEach(() => {
    mockClearEventChoice.mockClear();
    mockShowEventToast.mockClear();
    setActiveEventInstances([]);
    setPendingChoiceEvent(null);
    setDiscoveredEventIds([]);
    setRunStatsFromPayload({ runStartTime: Date.now(), runCoinsEarned: 0, runQuestsClaimed: 0, runEventsTriggered: 0, runMaxComboMult: 1 });
  });

  it('applyEventChoice does nothing when no pending choice', () => {
    setSession(new GameSession('s1', Player.create('p1')));
    applyEventChoice('any-id', 'nothing');
    expect(getPendingChoiceEvent()).toBeNull();
  });

  it('applyEventChoice applies "nothing" choice and clears pending', () => {
    const ce = CHOICE_EVENT_CATALOG[0];
    if (!ce) throw new Error('no choice event');
    setPendingChoiceEvent(ce);
    setSession(new GameSession('s1', Player.create('p1')));
    applyEventChoice(ce.id, 'nothing');
    expect(getPendingChoiceEvent()).toBeNull();
    expect(getActiveEventInstances()).toHaveLength(0);
    expect(mockClearEventChoice).toHaveBeenCalledTimes(1);
  });

  it('applyEventChoice applies "risk" choice when player has crew, spends 1 astronaut and pushes effect', () => {
    const ce = CHOICE_EVENT_CATALOG[0];
    if (!ce) throw new Error('no choice event');
    const riskChoice = ce.choices.find((c) => c.id === 'risk');
    if (!riskChoice || riskChoice.costAstronauts !== 1) throw new Error('expected risk choice with cost 1');
    const player = Player.create('p1');
    player.addCoins(10_000);
    player.hireAstronaut(100, 'astronaut');
    player.hireAstronaut(200, 'astronaut');
    setSession(new GameSession('s1', player));
    setPendingChoiceEvent(ce);
    applyEventChoice(ce.id, 'risk');
    expect(getPendingChoiceEvent()).toBeNull();
    expect(player.astronautCount).toBe(1);
    expect(getActiveEventInstances()).toHaveLength(1);
    expect(getActiveEventInstances()[0].event.effect.multiplier).toBe(2);
    expect(getActiveEventInstances()[0].event.effect.durationMs).toBe(30000);
  });

  it('canShowChoiceEvent returns true when catalog has choice with no cost', () => {
    expect(CHOICE_EVENT_CATALOG.length).toBeGreaterThan(0);
    expect(canShowChoiceEvent(0)).toBe(true);
  });
});
