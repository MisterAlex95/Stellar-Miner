# Vue.js migration plan — Stellar Miner

Incremental plan to migrate the presentation layer from vanilla TypeScript/DOM to Vue 3, without rewriting domain or application layers. The app remains a single Vite + TypeScript codebase; Vue is introduced gradually so the game stays playable at each step.

**Current state:** **Migration complete.** Vue 3 root; Pinia for state. Shell, tabs, panels, modals, toasts are Vue. All modal and panel content is driven by store (appUI, gameState) and Vue templates; handlers call the presentation port (setPrestigeConfirmContent, setLastSavedText, setChartHelpContent, setExpeditionData, setPlanetDetailData, setDebugStats, setResearchProgress, setUpgradeProgress, etc.) and the port writes to Pinia; no getElementById/innerHTML for user-visible content in handlers. Optional cleanup (see end of doc): quest-claim anchor, chart tooltip, Escape-by-overlay.

---

## Principles

- **Domain and application stay as-is**: no changes to `domain/`, `application/` (except optional small adapters). Handlers, gameState, eventBus, uiBridge, refreshSignal, lazyPanels, panelConfig remain the single source of truth.
- **Presentation port unchanged**: `PresentationPort` and `createPresentationPort()` stay. Vue components call the same handlers and use the same port for toasts/overlays; the port implementation may later delegate to Vue (e.g. toast component) instead of vanilla DOM.
- **Incremental migration**: one shell or tab at a time. Vanilla and Vue can coexist: Vue mounts inside `#app` or inside specific panel containers.
- **Game loop unchanged**: `game.ts` keeps the same loop (production tick, panel updates, canvas, refresh subscribers). Vue components either read from gameState/refs in the loop or subscribe to `subscribeRefresh()` and update local state; no duplication of game logic in Vue.

---

## Phase 0: Preparation (no Vue yet)

1. **Vite**: ensure Vue plugin is not added yet; we add it in Phase 1.
2. **Types**: ensure `gameState`, handlers, and port types are easy to import from Vue components (they live in `application/` and are already TS).
3. **Document** which presentation files map to which panels/features (see inventory below) so we know the migration order.

**Presentation inventory (migration status):**

| Area | Status | Notes |
|------|--------|-------|
| Entry / shell | **Vue** | `App.vue`, `StatsBlock.vue`, `PanelsShell.vue`; mount only wires bindings, no HTML inject in Vue shell |
| Mine tab | **Vue shell** | `PanelsShell` provides structure; canvas + quest still updated by mount/questView by ID |
| Empire tab | **Vue** | `EmpirePanel.vue`, `useEmpireData`, `useEmpireActions`; planet detail/expedition modals Vue |
| Research / Upgrades / Stats / Dashboard | **Vue** | Vue panels mount into PanelsShell containers |
| Modals | **Vue** | Settings, Info, Achievements, reset/prestige, events hint, chart help, section rules, upgrade choose planet, planet detail, expedition, intro |
| Shared UI | **Vue + legacy** | Toasts Vue (ToastContainer); overlay.ts, progressionView, bindSettingsForm still used by handlers |
| Components | **Legacy** | `components/` (changelog, progressBar, upgradeCard, etc.) used by Vue or mount |

---

## Phase 1: Vue in the loop, minimal shell

**Goal:** Run Vite with Vue, mount a minimal Vue app inside `#app`, and keep the rest of the UI working (e.g. mount current DOM inside a Vue root, or keep current `mount()` and add a tiny Vue widget).

**Steps:**

1. Add Vue 3 and Vite Vue plugin:
   - `vue` (dependency), `@vitejs/plugin-vue` (devDependency).
   - In `vite.config.ts`: import and use `vue()`.
   - Optional: add `vite-plugin-vue-type-imports` or similar if we want `defineModel` etc.

2. Create a Vue entry that the game bootstraps:
   - Option A: `game.ts` stays the entry; after `mount()` it does `createApp(App).mount('#app')` and the current `mount()` is refactored to inject the existing DOM into a slot provided by Vue (e.g. `<div id="app"><div id="stellar-mount-root"></div></div>` and current mount targets that root).
   - Option B: Entry becomes a small `main.ts` that creates Vue app and mounts it; the Vue root component triggers game init (e.g. `onMounted` → `initGame()`) which runs `getOrCreateSession()`, `mount()`, etc. So Vue “owns” the root and the game attaches the current UI inside a Vue-provided container.

   Recommended: **Option A** for Phase 1 — minimal change. `index.html` still has `<div id="app">`. Current `mount()` renders into `#app` as today. We then replace the *content* of `#app` with a Vue root that has a single component rendering a wrapper and a `<div ref="legacyMountPoint">`; in `onMounted`, call the existing `mount()` but pass a custom root (or temporarily keep mounting into `#app` and in a follow-up move the legacy DOM under Vue). Easiest is: Vue root component template is just `<div class="app-wrapper"><div id="legacy-root"></div></div>`, and we change `getAppHtml()` / mount to render into `#legacy-root` instead of `#app`. Then `game.ts` does `createApp(App).mount('#app')` and the legacy mount runs with `#legacy-root` as target. So we have Vue wrapping the whole app with no visual change.

3. Ensure game init order stays correct: session, port, starfield, mount, refresh wiring, game loop. The loop and `createRefreshViews()` keep calling the same vanilla `updateStats`, `renderUpgradeList`, etc.

4. Run `yarn typecheck`, `yarn test`, `yarn test:e2e` and fix any regressions.

**Deliverable:** App runs with Vue as the root renderer, legacy UI unchanged and still driven by the same game loop and handlers.

---

## Phase 2: Reactive state bridge (optional but useful)

**Goal:** Expose a minimal reactive “view state” to Vue so components can depend on game state without the game loop having to know about Vue.

**Steps:**

1. Introduce a small bridge in `application/` or `presentation/` (e.g. `presentation/gameStateBridge.ts`):
   - Use Vue’s `reactive()` or `ref()` to hold a snapshot of “what Vue needs” (e.g. coins, production rate, current tab, list of planets for display). This is read-only view state.
   - On each refresh (or in the game loop), update this snapshot from `getSession()`, `getSettings()`, etc. So we have one place that does `bridge.coins = session.player.coins.value` (or formatted string), `bridge.planets = session.player.planets.map(...)`, etc.

2. Provide this bridge via Vue’s `provide/inject` or a composable (e.g. `useGameState()`) so any Vue component can use it without importing application layer directly (optional: we can allow importing `getSession` in Vue for read-only use if the team prefers).

3. Keep the game loop and `PANEL_REFRESH_ACTIONS` as-is for now; the bridge is updated from the same refresh path so Vue and vanilla stay in sync.

**Deliverable:** Vue components can read reactive game state from a single bridge; no new game logic in Vue.

---

## Phase 3: Migrate one tab (e.g. Stats)

**Goal:** Replace the Stats panel content with a Vue component. The rest of the app stays vanilla.

**Steps:**

1. Identify the DOM that the Stats panel renders: `panel-stats`, content from `renderStatisticsSection` / `statisticsView.ts`.
2. Create a Vue component (e.g. `StatisticsPanel.vue`) that:
   - Uses the reactive bridge (or `getSession()` / getters) to read stats and history.
   - Renders the same structure and labels (reuse existing CSS classes).
   - Does not call handlers directly for this panel (stats are read-only); if there’s a “copy” or “export” button, the component emits or calls a handler provided via inject/props.
3. In the Vue root (from Phase 1), add a conditional or router-less tab content: when the active panel is `stats`, render `<StatisticsPanel />` inside `#panel-stats` (or the Vue root owns the tab content and renders `<StatisticsPanel v-if="activePanel === 'stats'" />`). So we need the “current tab” to be readable by Vue (from bridge or from existing DOM state).
4. Stop calling `renderStatisticsSection` / the stats part of `PANEL_REFRESH_ACTIONS.stats` when the Stats panel is visible (or always use Vue for that panel once migrated). Update `createRefreshViews()` and any direct `updateStatisticsSection()` calls so that when the panel is Stats, we only update the bridge (so Vue reacts); we can leave the vanilla stats update for other panels or remove it for `stats`.
5. Lazy hydration: keep using `markPanelHydrated('stats')` when the user first opens the Stats tab; the Vue component can be mounted only when the tab is selected (v-if on the panel content).

**Deliverable:** Stats tab is fully Vue-driven; other tabs and the shell remain vanilla.

---

## Phase 4: Migrate remaining tabs and shared UI

Repeat the same pattern for each area:

1. **Dashboard** (`dashboardView`, panel `dashboard`): Vue component reads bridge/handlers, renders dashboard blocks; game loop stops calling `updateDashboard` for that panel once migrated (or only updates bridge).
2. **Empire** (panel `empire`): Larger surface — planet list, crew, prestige, quests, housing. Can be one big component or subcomponents (PlanetList, CrewSection, PrestigeSection, QuestSection). Port methods (e.g. `addQuestClaimedAnimation`) can be called from Vue (inject the port or a wrapper).
3. **Research** (panel `research`): One Vue component (or ResearchTree + ResearchNode). `renderResearchSection` and port’s `renderResearchSection` can be replaced by Vue; port implementation may call a Vue-exposed function or an event to “re-render research” until that’s fully Vue.
4. **Upgrades** (panel `upgrades`): Upgrade list + modals (choose planet, expedition). Migrate list first, then modals.
5. **Mine tab** (panel `mine`): Canvas stays as-is (Three.js / canvas in a ref). Stats strip (coins, production, combo) can become a small Vue component that reads from the bridge.

For each:
- Add a Vue component that matches current HTML/CSS and uses bridge or handlers.
- Switch the mount point (or the root’s template) to render the Vue component for that panel.
- Remove or gate the corresponding vanilla `render*` / `update*` in the game loop and in `createRefreshViews()`.
- Keep tooltips, toasts, overlays: either leave them vanilla and call from port, or replace with Vue components and make `presentationPortImpl` trigger Vue toasts/overlays (e.g. via a global event bus or inject/provide).

**Deliverable:** All tabs and main UI are Vue components; canvas and optional legacy widgets (e.g. debug panel) can stay vanilla.

---

## Phase 5: Modals, toasts, overlays in Vue

**Goal:** Replace vanilla modals (settings, reset, prestige, achievements, changelog, planet detail, upgrade choose planet, expedition) and toasts with Vue components.

**Steps:**

1. **Toasts:** Implement a `<ToastContainer />` in Vue, with a reactive list of toasts. `presentationPortImpl` no longer calls `toasts.show*` directly; it calls a store or event that the Vue app listens to and pushes toasts into the container. Port interface stays the same; implementation delegates to Vue.
2. **Overlays:** Same idea — port’s `openOverlay(overlayId, openClass)` and `closeOverlay` drive a Vue state (e.g. `overlayState.id` and `overlayState.openClass`); a Vue component renders the overlay content.
3. **Modals:** Replace `createModalOverlay` and the big HTML strings in `appShell.ts` with Vue components (SettingsModal, ResetConfirmModal, PrestigeModal, AchievementsModal, ChangelogModal, PlanetDetail, UpgradeChoosePlanetModal, ExpeditionModal). Each receives props or injects the port/handlers to close and perform actions. The Vue root (or a layout component) renders them conditionally based on state that the port or handlers set.

**Deliverable:** All modals and toasts are Vue-driven; presentation port implementation is a thin adapter to Vue state.

---

## Phase 6: Shell and layout in Vue

**Goal:** Header, tab list, layout (tabs vs one-page), and “app wrapper” are Vue components.

**Steps:**

1. Move header (offline banner, title, buttons: info, achievements, settings) into a Vue component; buttons emit or call injected handlers (open settings, open changelog, etc.).
2. Tab list and tab panels container: Vue component that owns `activePanel`, renders tab buttons and the corresponding panel component (Mine, Dashboard, Empire, Research, Upgrades, Stats). This replaces the current tab switching and `switchTab` usage; `switchTab` can become a wrapper that updates Vue state so the rest of the app (e.g. game loop’s `runPanelUpdates`) still knows the active panel if needed.
3. Layout (tabs vs one-page): controlled by settings; Vue reads from bridge and renders either tabbed layout or single scrollable page.
4. ~~Remove the remaining legacy mount (e.g. `getAppHtml()`, `mount.ts`'s full DOM creation) and any dead vanilla view code.~~ Done: appShell removed; mount.ts removed; initPresentation() in initPresentation.ts requires Vue shell.

**Deliverable:** Full UI is Vue; no remaining vanilla presentation except possibly canvas helpers and debug panel.

---

## Phase 7: Cleanup and optimizations

- Remove unused vanilla presentation files (or keep a few for canvas/debug).
- Use Vue’s reactivity for all view state; the “bridge” can be simplified to a single store (e.g. Pinia) or remain a simple reactive object updated from the game loop.
- Consider `v-memo` or similar for heavy lists (e.g. upgrade list, planet list) if needed.
- Ensure E2E tests and unit tests are updated; add Vue component tests if useful (e.g. Vitest + Vue Test Utils).
- Update docs (this file, overview.md) to state that the presentation layer is Vue 3.

---

## Technical notes

- **Vue 3 + Composition API** recommended; `<script setup>` keeps components small and consistent with TS.
- **No Vue Router** required unless we later want URL-driven tabs; tab state can stay in the bridge or a simple ref.
- **Canvas (Three.js):** keep as a non-Vue DOM node or wrap in a component that mounts the canvas in a `ref` and passes it to the existing MineZone/Starfield APIs.
- **i18n:** keep `t(key)` from `application/strings`; Vue components call `t()` in template or use a small wrapper so we don’t duplicate strings.
- **Tests:** Playwright E2E should still cover critical flows; update selectors if IDs/classes change. Unit tests for application/domain remain unchanged; add Vue component tests only where they add value.

---

## Risk and rollback

- Each phase should leave the app runnable and tests passing. If a phase is too large, split it (e.g. Empire into Crew + Prestige + Quests + Planets).
- Rollback: keep the vanilla presentation in a branch until the full migration is validated; or migrate file-by-file and revert individual components if needed.

---

## Optional cleanup (post-migration) — done

All four items completed:

| Item | Change |
|------|--------|
| Chart legend / minmax | `chartUtils.getChartMinMaxText()` returns string; StatisticsCharts.vue binds `chartLegendMinmax[id]` in template. No getElementById in chartUtils. |
| Chart tooltip | Reactive state `tooltipText`, `tooltipVisible`, `tooltipLeft`, `tooltipTop`; template binds content and position. |
| Escape key | `appUI.overlayStack` pushed in `openOverlay`, popped in `closeOverlay`. useGlobalKeyboard uses `peekOverlay()` and `OVERLAY_CLOSERS[id]()`; no getElementById for Escape. |
| Quest claim anchor | PanelsShell sets `appUI.questClaimAnchor` (ref on button); port `getQuestClaimAnchor()` returns it; quests.ts uses port instead of getElementById. |

**AppTabs menu (click-outside):** Replaced `getElementById('app-tabs-menu'|'app-tabs-bottom-menu')` and `querySelector('.app-tabs-bottom-more-wrap')` with refs `appTabsMenuRef`, `appTabsBottomMenuRef`, `appTabsBottomMoreWrapRef`.

Definition of done: no `getElementById`/`innerHTML` in handlers or modals for content; no getElementById for chart legend, tooltip, Escape, quest claim, or tabs menu. Only bootstrap (#app, legacy-root), canvas mount, overlay open/close by ID, and mount/tabs.ts panel container lookup remain.

---

*(Phases A–D completed: prestige, last saved, chart help, research data, research/upgrade overlays, debug stats, expedition and planet detail use store + Vue templates. Dead code renderAchievementsList/renderAchievementsModalContent removed.)*

1. ~~**Prestige modals**~~
   - Add to appUI store (or dedicated prestige modal state): `prestigeConfirmDesc`, `prestigeConfirmAfter`, `prestigeConfirmGainEstimate`, `prestigeRewardsLevels` (array of strings).
   - In `openPrestigeConfirmModal` / `openPrestigeRewardsModal`: compute strings and call `setPrestigeConfirmContent(desc, after, gainEstimate)` / `setPrestigeRewardsContent(levels)` instead of touching DOM.
   - PrestigeConfirmModal.vue: bind desc, after, and gain-estimate paragraph to store state.
   - PrestigeRewardsModal.vue: render `<ul>` with `v-for` over store array.
   - Remove DOM updates from `handlersPrestige.ts`.

2. **Last saved indicator**
   - Add to appUI (or settings) store: `lastSaveTimestamp: number | null` and optionally a computed/formatted label, or a dedicated composable that handlers call to “set last save”.
   - `updateLastSavedIndicator()`: instead of getElementById + textContent, update store (and optionally a formatted string).
   - SettingsModal.vue: display the reactive value next to the existing `#last-saved-indicator` (or replace node with a Vue-bound element).

3. **Chart help modal**
   - Add to appUI: `chartHelpTitle: string`, `chartHelpBody: string`.
   - useChartHelpTrigger: on click, set store and then open overlay (same openOverlay call).
   - ChartHelpModal.vue: read title and body from store in template; remove IDs if not needed for a11y, or keep and bind.

4. **ResearchPanel research-data-display**
   - Replace the `watch` + getElementById with a template node that displays `researchDataLabel` (e.g. `<span id="research-data-display">{{ researchDataLabel }}</span>` or a ref and no ID). One-line change in ResearchPanel.vue.

**Phase B — Overlays as Vue (small new surface)**  
*Goal: Research and upgrade progress overlays become Vue-driven.*

5. **Research progress overlay**
   - Option A: Add a small Vue component (e.g. `ResearchProgressOverlay.vue`) used inside the research card; card gets a “progress” prop or injects progress state (researchId, percent, onCancel). Handlers call a store action like `setResearchProgress(id, percent, cancelHandler)` and the component shows when progress exists for that card.
   - Option B: Global overlay component that shows a single “current research in progress” with card reference for positioning; store holds current researchId, percent, onCancel.
   - Remove `overlay.innerHTML` and DOM creation from `handlersResearch.ts`; only update store and optionally call port for focus.

6. **Upgrade install/uninstall overlay**
   - Same idea: store holds “progress per card” or “current upgrade progress” (card key, current/total, label, onCancel). UpgradeCard (or a wrapper) renders a small overlay component when progress is set.
   - Remove createElement/innerHTML from `handlersUpgrade.ts`; handlers only update store and callbacks.

**Phase C — Debug panel**  
*Goal: Debug panel content is 100% Vue template.*

7. **Debug panel**
   - Add debug state to appUI or a dedicated store: e.g. `debugStats: { coins, production, ... }`, `debugAchievements: Array<{id, name, desc, unlocked}>`. `updateDebugPanel()` and the achievements list builder in handlersDebug become: compute data and call `setDebugStats(...)`, `setDebugAchievements(...)`.
   - DebugPanel.vue: template for stats (rows) and achievements list; read from store. Remove empty `<div id="debug-stats">` and any getElementById in handlersDebug.

**Phase D — Heavy modals (optional / later)**  
*Goal: Expedition and planet detail content fully in Vue.*

8. **Expedition modal**
   - Move tier cards and crew picker into ExpeditionModal.vue template. State: selectedTier, composition, required, cost, isNewSystem, etc. (already computed in expedition.ts). On open, expedition.ts calls a store action with this state; modal renders and handles tier/crew clicks by updating store and re-calling a thin “update expedition UI” that only updates store (no DOM). Canvas thumbnails can stay imperative (ref + startPlanetThumbnail3DLoop).
   - This is the largest refactor: all `innerHTML` and `textContent` in modals/expedition.ts become store-driven Vue template.

9. **Planet detail modal**
   - Same pattern: build a “planet detail” state (name, system, type, production, slots, housing, crew, moons, extra, upgradeCounts). planetDetail.ts on open writes this to store; PlanetDetailModal.vue template renders it. Three.js scene stays: mount in a ref in the modal and call createPlanetScene in onMounted when state is set.

10. **Quest claim anchor (optional)**
    - If we want zero getElementById in quest flow: PanelsShell (or a child) exposes a ref for the claim button and provides it to the port or to a composable that showFloatingReward can use. Otherwise keep the single getElementById for the anchor; low impact.

---

### Order and dependencies

- **Phase A** can be done in any order; no dependency between 1–4. Do 1 (prestige) and 2 (last saved) first for maximum removal of DOM writes in hot paths.
- **Phase B** depends on having a pattern for “overlay state in store”; can re-use appUI or a small `progressOverlay` store.
- **Phase C** is independent; can be done before or after B.
- **Phase D** is optional and can be last; Expedition and Planet detail are the heaviest but already work.

### Definition of done

- No `getElementById` / `querySelector` in application layer for UI content (allowed: overlay open/close by ID if Vue still uses those IDs on elements).
- No `innerHTML` / `textContent` in handlers or modals for user-visible content; all such content is rendered by Vue templates bound to store or props.
- Optional: no getElementById in presentation except for canvas/Three.js mount points and focus management (e.g. overlay focusId).
