import { defineStore } from 'pinia';

const MINE_HINT_DISMISSED_KEY = 'stellar-miner-mine-hint-dismissed';

export const useAppUIStore = defineStore('appUI', {
  state: () => ({
    mineZoneActive: false,
    mineZoneHintDismissed: typeof localStorage !== 'undefined' && localStorage.getItem(MINE_HINT_DISMISSED_KEY) === '1',
    debugOpen: false,
    infoVersion: '',
    infoHasUpdate: false,
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
  },
});
