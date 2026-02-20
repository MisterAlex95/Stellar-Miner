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
    /** Section rules modal: when set, modal is open; Vue renders title + body. */
    sectionRules: null as { titleKey: string; rulesKey: string } | null,
    /** Quest claim animation: PanelsShell adds quest-section--claimed when true. */
    questClaimedFlash: false,
    /** Prestige confirm modal: text content set by handlers before opening. */
    prestigeConfirmDesc: '',
    prestigeConfirmAfter: '',
    prestigeConfirmGainEstimate: '' as string,
    /** Prestige chapter (lore): e.g. "Prestige 5 — Veteran of the Belt", optional quote. */
    prestigeConfirmChapterTitle: '' as string,
    prestigeConfirmChapterQuote: '' as string,
    /** Last saved indicator text (settings modal). Set by port when opening settings or on save. */
    lastSavedText: '',
    /** Chart help modal: title and body set before opening. */
    chartHelpTitle: '',
    chartHelpBody: '',
    /** Research progress overlay per researchId. */
    researchProgress: {} as Record<string, { endTimeMs: number; totalDurationMs: number; hasCancel: boolean }>,
    /** Upgrade install/uninstall progress per card key (e.g. upgradeId-planetId or upgradeId). */
    upgradeProgress: {} as Record<string, { current: number; total: number; label: string; showCancel: boolean; isUninstall?: boolean }>,
    /** Debug panel: stats rows (label + value). */
    debugStats: [] as { label: string; value: string }[],
    /** Expedition modal: when set, modal is open; Vue renders types, tiers and crew from this + getSession(). */
    expedition: null as {
      costFormatted: string;
      isNewSystem: boolean;
      newSystemText: string;
      newSystemTitle: string;
      required: number;
      composition: Record<string, number>;
      selectedTier: string;
      selectedType: string;
    } | null,
    /** Overlay stack for Escape key: overlayId pushed on open, popped on close. */
    overlayStack: [] as string[],
    /** Root #app element (set by App.vue for layout/attributes). */
    appRoot: null as HTMLElement | null,
    /** Main content container (set by App.vue for game init check). */
    mainContentRoot: null as HTMLElement | null,
    /** Panels container (set by App.vue). */
    panelsRoot: null as HTMLElement | null,
    /** Mine zone element (set by PanelsShell for shake/float anchor). */
    mineZoneElement: null as HTMLElement | null,
    /** Quest claim button element for floating reward anchor (set by PanelsShell). */
    questClaimAnchor: null as HTMLElement | null,
    /** Event choice modal: when set, modal is open; Vue renders event name + choice buttons. */
    eventChoice: null as {
      eventId: string;
      eventName: string;
      flavor?: string;
      choices: {
        id: string;
        label: string;
        effectSummary: string;
        costAstronauts?: number;
        costCoins?: number;
        costUpgrade?: number;
        successChance?: number;
      }[];
    } | null,
    /** Planet detail modal: when set, modal is open; Vue renders stats and upgrades; 3D scene mounted in Vue. */
    planetDetail: null as {
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
      discoveryFlavor?: string;
      activeSetBonuses: { moduleName: string; count: number; bonusPercent: number; planetTypes?: string[] }[];
      potentialSetBonuses: { moduleName: string; current: number; required: number; bonusPercent: number; planetTypes?: string[] }[];
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
    setSectionRules(data: { titleKey: string; rulesKey: string } | null): void {
      this.sectionRules = data;
    },
    setQuestClaimedFlash(value: boolean): void {
      this.questClaimedFlash = value;
    },
    setPrestigeConfirmContent(
      desc: string,
      after: string,
      gainEstimate?: string,
      chapterTitle?: string,
      chapterQuote?: string
    ): void {
      this.prestigeConfirmDesc = desc;
      this.prestigeConfirmAfter = after;
      this.prestigeConfirmGainEstimate = gainEstimate ?? '';
      this.prestigeConfirmChapterTitle = chapterTitle ?? '';
      this.prestigeConfirmChapterQuote = chapterQuote ?? '';
    },
    setLastSavedText(text: string): void {
      this.lastSavedText = text;
    },
    setChartHelpContent(title: string, body: string): void {
      this.chartHelpTitle = title;
      this.chartHelpBody = body;
    },
    setResearchProgress(researchId: string, data: { endTimeMs: number; totalDurationMs: number; hasCancel: boolean } | null): void {
      if (data === null) {
        const next = { ...this.researchProgress };
        delete next[researchId];
        this.researchProgress = next;
      } else {
        this.researchProgress = { ...this.researchProgress, [researchId]: data };
      }
    },
    setUpgradeProgress(key: string, data: { current: number; total: number; label: string; showCancel: boolean; isUninstall?: boolean } | null): void {
      if (data === null) {
        const next = { ...this.upgradeProgress };
        delete next[key];
        this.upgradeProgress = next;
      } else {
        this.upgradeProgress = { ...this.upgradeProgress, [key]: data };
      }
    },
    setDebugStats(rows: { label: string; value: string }[]): void {
      this.debugStats = rows;
    },
    setDebugOpen(open: boolean): void {
      this.debugOpen = open;
    },
    setExpeditionData(data: typeof this.expedition): void {
      this.expedition = data;
    },
    setExpeditionSelectedTier(tier: string): void {
      if (this.expedition) this.expedition.selectedTier = tier;
    },
    setExpeditionSelectedType(typeId: string): void {
      if (this.expedition) this.expedition.selectedType = typeId;
    },
    setExpeditionCrew(role: string, delta: number): void {
      if (!this.expedition) return;
      const cur = this.expedition.composition[role] ?? 0;
      const next = Math.max(0, cur + delta);
      this.expedition = {
        ...this.expedition,
        composition: { ...this.expedition.composition, [role]: next },
      };
    },
    clearExpedition(): void {
      this.expedition = null;
    },
    setEventChoiceData(data: typeof this.eventChoice): void {
      this.eventChoice = data;
    },
    clearEventChoice(): void {
      this.eventChoice = null;
    },
    setPlanetDetailData(data: typeof this.planetDetail): void {
      this.planetDetail = data;
    },
    clearPlanetDetail(): void {
      this.planetDetail = null;
    },
    pushOverlay(overlayId: string): void {
      this.overlayStack = [...this.overlayStack, overlayId];
    },
    popOverlay(overlayId: string): void {
      const i = this.overlayStack.lastIndexOf(overlayId);
      if (i >= 0) this.overlayStack = this.overlayStack.slice(0, i).concat(this.overlayStack.slice(i + 1));
    },
    peekOverlay(): string | undefined {
      return this.overlayStack[this.overlayStack.length - 1];
    },
    setQuestClaimAnchor(el: HTMLElement | null): void {
      this.questClaimAnchor = el;
    },
    setAppRoot(el: HTMLElement | null): void {
      this.appRoot = el;
    },
    setMainContentRoot(el: HTMLElement | null): void {
      this.mainContentRoot = el;
    },
    setPanelsRoot(el: HTMLElement | null): void {
      this.panelsRoot = el;
    },
    setMineZoneElement(el: HTMLElement | null): void {
      this.mineZoneElement = el;
    },
  },
});
