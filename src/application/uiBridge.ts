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
  showPrestigeMilestoneToast(level: number, pct?: number): void;
  showQuestStreakToast(streak: number, mult: number): void;
  showEventToast(gameEvent: GameEvent): void;
  showFloatingReward(amount: number, anchor: HTMLElement): void;
  /** Quest claim button element for floating reward (Vue sets via store). */
  getQuestClaimAnchor(): HTMLElement | null;
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
  /** Set prestige confirm modal content before opening (Vue reads from store). gainEstimate = breakdown of bonus after reset. */
  setPrestigeConfirmContent(desc: string, after: string, gainEstimate?: string): void;
  /** Set prestige rewards modal list content before opening (Vue reads from store). */
  setPrestigeRewardsContent(levels: string[]): void;
  /** Set last saved indicator text (settings modal). */
  setLastSavedText(text: string): void;
  /** Set research progress overlay (Vue shows it). onCancel called when user cancels. */
  setResearchProgress(researchId: string, data: { endTimeMs: number; totalDurationMs: number; hasCancel: boolean } | null, onCancel?: () => void): void;
  /** User cancelled research; port runs stored callback and clears. */
  cancelResearchProgress(researchId: string): void;
  /** Set upgrade install/uninstall progress (Vue shows it). onCancel optional. */
  setUpgradeProgress(key: string, data: { current: number; total: number; label: string; showCancel: boolean; isUninstall?: boolean } | null, onCancel?: () => void): void;
  /** User cancelled upgrade progress; port runs stored callback and clears. */
  cancelUpgradeProgress(key: string): void;
  /** Debug panel: open state and stats (Vue renders). */
  setDebugOpen(open: boolean): void;
  getDebugOpen(): boolean;
  setDebugStats(rows: { label: string; value: string }[]): void;
  /** Expedition modal: set initial data when opening; clear when closing. */
  setExpeditionData(data: {
    costFormatted: string;
    isNewSystem: boolean;
    newSystemText: string;
    newSystemTitle: string;
    required: number;
    composition: Record<string, number>;
    selectedTier: string;
  } | null): void;
  clearExpedition(): void;
  /** Planet detail modal: set view data when opening. Vue clears store when closing. */
  setPlanetDetailData(data: {
    planetId: string;
    planetName: string;
    planetType: string;
    visualSeed: number;
    displayName: string;
    systemName: string;
    typeLabel: string;
    prodStr: string;
    effectiveUsed: number;
    maxUpgrades: number;
    housingLine: string;
    crewLine: string;
    moonCount: number;
    extraLabel: string;
    upgradeItems: { name: string; count: number }[];
  } | null): void;
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
function noopStrStr(_: string, __: string, _gain?: string): void {}
function noopStrArr(_: string[]): void {}
function noopResearchProgress(_id: string, _data: unknown, _cb?: () => void): void {}
function noopUpgradeProgress(_key: string, _data: unknown, _cb?: () => void): void {}

const defaultPort: PresentationPort = {
  showAchievementToast: noopStr,
  showMiniMilestoneToast: noopStr,
  showMilestoneToast: noopNum,
  showPrestigeMilestoneToast: noopNumNum,
  showQuestStreakToast: noopNumNum,
  showEventToast: noopEvent,
  showFloatingReward: noopNumEl,
  getQuestClaimAnchor: () => null,
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
  setPrestigeConfirmContent: noopStrStr,
  setPrestigeRewardsContent: noopStrArr,
  setLastSavedText: noopStr,
  setResearchProgress: noopResearchProgress,
  cancelResearchProgress: noopStr,
  setUpgradeProgress: noopUpgradeProgress,
  cancelUpgradeProgress: noopStr,
  setDebugOpen: (_b: boolean) => {},
  getDebugOpen: () => false,
  setDebugStats: (_rows: { label: string; value: string }[]) => {},
  setExpeditionData: (_data: unknown) => {},
  clearExpedition: () => {},
  setPlanetDetailData: (_data: unknown) => {},
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
