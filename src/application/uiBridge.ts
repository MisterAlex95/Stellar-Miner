/**
 * Presentation port: UI callbacks used by application layer (handlers, achievements, etc.).
 * Set once at bootstrap from presentation so application never imports presentation.
 */

import type { GameEvent } from '../domain/entities/GameEvent.js';

export interface OpenOverlayOptions {
  focusId?: string;
  onOpen?: () => void;
}

export interface PresentationPort {
  showAchievementToast(name: string): void;
  showMiniMilestoneToast(message: string): void;
  showMilestoneToast(coins: number): void;
  showPrestigeMilestoneToast(level: number): void;
  showQuestStreakToast(streak: number, mult: number): void;
  showEventToast(gameEvent: GameEvent): void;
  showFloatingReward(amount: number, anchor: HTMLElement): void;
  showFloatingCoin(
    amount: number,
    clientX: number,
    clientY: number,
    options?: { lucky?: boolean; superLucky?: boolean; critical?: boolean }
  ): void;
  showSuperLuckyToast(coins: number): void;
  showCriticalToast(coins: number): void;
  showDailyBonusToast(): void;
  showToast(message: string, variant: string, options?: { duration?: number }): void;
  flashUpgradeCard(upgradeId: string): void;
  updateComboIndicator(): void;
  renderResearchSection(): void;
  openOverlay(overlayId: string, openClass: string, options?: OpenOverlayOptions): void;
  closeOverlay(overlayId: string, openClass: string): void;
  addQuestClaimedAnimation(): void;
}

function noop(): void {}
function noopStr(_: string): void {}
function noopNum(_: number): void {}
function noopNumNum(_n: number, _m: number): void {}
function noopNumEl(_a: number, _e: HTMLElement): void {}
function noopNumXY(_a: number, _x: number, _y: number, _o?: unknown): void {}
function noopStrStrOpt(_m: string, _v: string, _o?: unknown): void {}
function noopEvent(_e: GameEvent): void {}
function noopStrStrOpt2(_id: string, _cls: string, _o?: unknown): void {}

const defaultPort: PresentationPort = {
  showAchievementToast: noopStr,
  showMiniMilestoneToast: noopStr,
  showMilestoneToast: noopNum,
  showPrestigeMilestoneToast: noopNum,
  showQuestStreakToast: noopNumNum,
  showEventToast: noopEvent,
  showFloatingReward: noopNumEl,
  showFloatingCoin: noopNumXY,
  showSuperLuckyToast: noopNum,
  showCriticalToast: noopNum,
  showDailyBonusToast: noop,
  showToast: noopStrStrOpt,
  flashUpgradeCard: noopStr,
  updateComboIndicator: noop,
  renderResearchSection: noop,
  openOverlay: noopStrStrOpt2,
  closeOverlay: noopStrStrOpt2,
  addQuestClaimedAnimation: noop,
};

let port: PresentationPort = defaultPort;

export function setPresentationPort(p: PresentationPort): void {
  port = p;
}

export function getPresentationPort(): PresentationPort {
  return port;
}

/** Default no-op port. Tests can spread and override methods. */
export function getDefaultPresentationPort(): PresentationPort {
  return { ...defaultPort };
}
