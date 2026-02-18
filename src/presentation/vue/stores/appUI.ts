import { defineStore } from 'pinia';

const MINE_HINT_DISMISSED_KEY = 'stellar-miner-mine-hint-dismissed';

export const useAppUIStore = defineStore('appUI', {
  state: () => ({
    mineZoneActive: false,
    mineZoneHintDismissed: typeof localStorage !== 'undefined' && localStorage.getItem(MINE_HINT_DISMISSED_KEY) === '1',
    debugOpen: false,
    infoVersion: '',
    infoHasUpdate: false,
    flashUpgradeId: '' as string,
    /** Intro/welcome modal: block id when open, null when closed. */
    introBlockId: null as string | null,
    introCanClose: false,
    introProgress: 0,
    /** Upgrade choose planet modal: when set, modal is open; list is rendered by Vue. */
    upgradeChoosePlanet: null as {
      upgradeId: string;
      action: 'buy' | 'max' | 'uninstall';
      planets: {
        id: string;
        name: string;
        displayName: string;
        usedSlots: number;
        maxUpgrades: number;
        installedCount: number;
        productionStr: string;
        planetType: string;
        visualSeed: number;
        isRecommended: boolean;
      }[];
      maxCount?: number;
    } | null,
  }),
  actions: {
    setInfoContent(version: string, hasUpdate: boolean): void {
      this.infoVersion = version;
      this.infoHasUpdate = hasUpdate;
    },
    setMineZoneActive(active: boolean): void {
      this.mineZoneActive = active;
    },
    dismissMineHint(): void {
      this.mineZoneHintDismissed = true;
      try {
        localStorage.setItem(MINE_HINT_DISMISSED_KEY, '1');
      } catch {
        // ignore
      }
    },
    toggleDebug(): void {
      this.debugOpen = !this.debugOpen;
    },
    setFlashUpgradeId(id: string): void {
      this.flashUpgradeId = id;
    },
    setIntroModal(blockId: string, canClose: boolean, progress: number): void {
      this.introBlockId = blockId;
      this.introCanClose = canClose;
      this.introProgress = progress;
    },
    setIntroProgress(progress: number): void {
      this.introProgress = progress;
    },
    setIntroCanClose(canClose: boolean): void {
      this.introCanClose = canClose;
    },
    clearIntroModal(): void {
      this.introBlockId = null;
      this.introCanClose = false;
      this.introProgress = 0;
    },
    setUpgradeChoosePlanet(data: typeof this.upgradeChoosePlanet): void {
      this.upgradeChoosePlanet = data;
    },
  },
});
