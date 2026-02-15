# Stellar Miner — Domain-Driven Design (DDD)

Simplified Domain-Driven Design for the idle game "Stellar Miner": domain and subdomains, entities, value objects, aggregates, domain services, and events. This model keeps the code organized and easy to extend.

---

## 1. Domains and Subdomains

**Core domain: Stellar Miner**

| Subdomain        | Role                                      |
|------------------|-------------------------------------------|
| **Mining (Core)** | Resources, upgrades, and production       |
| **Economy (Supporting)** | Transactions, costs, and revenue   |
| **Progression (Supporting)** | Save/load, prestige, quests, milestones, achievements |
| **Progression (Generic)** | Settings, stats history, offline progress |

---

## 2. Entities

Entities have identity and a lifecycle.

| Entity     | Description                                      | Main attributes (examples)        |
|------------|--------------------------------------------------|----------------------------------|
| **Player** | Player and their progression (planets, crew, coins) | id, coins, planets, prestigeLevel, totalCoinsEver, astronautCount |
| **Planet** | Mining outpost with upgrade slots and production bonus | id, name, maxUpgrades, upgrades |
| **Upgrade**| Purchasable improvement (e.g. mining robot)      | id, name, cost, effect (UpgradeEffect)   |
| **GameEvent** | Random event (e.g. meteor storm)             | id, name, effect, duration       |
| **Artifact** | Special item with permanent or temporary bonus | id, name, effect, isActive       |

---

## 3. Value Objects

Immutable, defined by their attributes.

| Value Object      | Description                              | Attributes (examples)   |
|-------------------|------------------------------------------|-------------------------|
| **Coins**         | In-game currency                         | value (number)          |
| **ProductionRate**| Coins per second production              | value (number)          |
| **UpgradeEffect** | Effect of an upgrade (e.g. +1 coin/s)    | coinsPerSecond          |
| **EventEffect**   | Effect of an event (e.g. x2 production)  | multiplier, duration    |

---

## 4. Aggregates

An aggregate is a cluster of objects treated as a single unit.

| Aggregate   | Root        | Description                                      |
|-------------|-------------|--------------------------------------------------|
| **Player**  | Player      | Holds planets (each with upgrades), artifacts, coins, crew (astronauts) |
| **GameSession** | GameSession | Holds the player, active events (with end times), and global state |

---

## 5. Domain Services

Domain logic that does not belong to a single entity or value object.

| Service           | Responsibility                                  |
|-------------------|-------------------------------------------------|
| **UpgradeService**| Purchase and apply upgrades (with astronaut requirements) |
| **PlanetService** | Buy new planets, add upgrade slots              |
| **EventService**  | Trigger and handle random events                |
| **PrestigeService** | Compute prestige bonuses and reset the run   |
| **SaveLoadService** (infra) | Save/load game state, export/import, offline progress (localStorage) |

---

## 6. Domain Events

Events that occur in the domain and can trigger side effects.

| Event               | Description                                      |
|---------------------|--------------------------------------------------|
| **CoinsMined**      | When the player clicks or gains coins passively  |
| **UpgradePurchased**| When the player buys an upgrade                  |
| **EventTriggered**  | When a random event occurs                       |
| **PrestigeActivated** | When the player triggers prestige              |

---

## 7. Layered Architecture

```
┌───────────────────────┐
│   Presentation        │  UI/UX: coins, buttons, etc.
├───────────────────────┤
│   Application         │  Orchestrates services and commands
├───────────────────────┤
│   Domain              │  Entities, value objects, domain services
├───────────────────────┤
│   Infrastructure      │  Persistence, data access, external APIs
└───────────────────────┘
```

**Modules (src):**

- **domain/** — Entities, value objects, aggregates, events, domain services; **bigNumber** for large-number math (break_infinity).
- **application/** — gameState; **handlers** split by domain (handlers.ts re-exports from handlersSave, handlersMine, handlersUpgrade, handlersPlanet, handlersQuest, handlersPrestige, handlersResearch, handlersSettings, handlersDebug); catalogs, quests, progression, stats, format, eventBus, strings, research, achievements, milestones, questState, playTimeStats, productionHelpers, crewHelpers, planetAffinity, i18nCatalogs; **version**, **changelog** (What's new modal).
- **presentation/** — mount; tabs: **Mine**, **Empire** (production breakdown, crew, planets, quests, prestige; housing is built from each planet card), **Research**, **Upgrades**, **Stats**; views: statsView, upgradeListView, planetListView, questView, comboView, progressionView, prestigeView, crewView, statisticsView, researchView, housingView (used when building housing on a planet). Toasts, tooltip, StarfieldCanvas, MineZoneCanvas. Reusable UI in **presentation/components/** (toasts, modals, gameplay blocks, buttonTooltip, upgradeCard, progressBar, chartUtils, statisticsCard, changelog, debugPanel, etc.).
- **infrastructure/** — SaveLoadService (save/load/export/import, version, validation)
- **data/** — JSON config: upgrades, events, research, achievements, progression, planetAffinity, balance, gameConfig, changelog
- **e2e/** — Playwright E2E tests

---

## 8. Example Flow: Purchasing an Upgrade

1. User clicks "Buy Mining Robot".
2. **Application** calls `UpgradeService.purchaseUpgrade(playerId, upgradeId)`.
3. **Domain**:
   - Check player has enough Coins.
   - Emit **UpgradePurchased**.
   - Update player **ProductionRate**.
4. **Infrastructure** (optional): persist player state.

---

## 9. Code References (TypeScript)

- **Player**: `src/domain/entities/Player.ts` — `Player.create(id)`, `addCoins`, `spendCoins`, `setProductionRate`, `planets`, `effectiveProductionRate`, `hireAstronaut`, `spendAstronauts`, `Player.createAfterPrestige`.
- **Planet**: `src/domain/entities/Planet.ts` — `Planet.create`, `addUpgrade`, `hasFreeSlot`, `usedSlots`, `maxUpgrades`.
- **UpgradeService**: `src/domain/services/UpgradeService.ts` — `purchaseUpgrade`, `canAfford`, `getRequiredAstronauts`.
- **PlanetService**: `src/domain/services/PlanetService.ts` — `buyNewPlanet`, `addSlot`.
- **GameSession**: `src/domain/aggregates/GameSession.ts` — aggregate root; holds `player`, `activeEvents`.
- **Value objects**: `src/domain/value-objects/` — Coins, ProductionRate, UpgradeEffect, EventEffect.
- **Application state**: `src/application/gameState.ts` — session, active event instances, next event time, settings, quest state; `getOrCreateSession`, `saveLoad`, `getEventMultiplier`.
- **Catalogs & config**: `src/application/catalogs.ts` — UPGRADE_CATALOG, EVENT_CATALOG, combo/lucky/quest constants, storage keys.
- **Handlers**: `src/application/handlers.ts` re-exports; domain-specific modules: handlersSave, handlersMine, handlersUpgrade, handlersPlanet, handlersQuest, handlersPrestige, handlersResearch, handlersSettings, handlersDebug — mine click, buy upgrade/planet/slot/housing, hire astronaut, prestige, quest claim, export/import save, settings, debug.
- **Presentation**: `src/presentation/` — mount; tabs Mine, Empire, Research, Upgrades, Stats; statsView (Empire panel), upgradeListView, planetListView (housing on each planet card), questView, comboView, progressionView, prestigeView, crewView, statisticsView, researchView, housingView (build housing), toasts, tooltip, StarfieldCanvas, MineZoneCanvas.
- **Research**: `src/application/research.ts` — tech tree / research unlocks; `researchView` for UI.
- **Planet affinity**: `src/application/planetAffinity.ts` — planet type (rocky/desert/ice/volcanic/gas) and affinity stats derived from planet name; data in `src/data/planetAffinity.json`.
- **Achievements & milestones**: `src/application/achievements.ts`, `src/application/milestones.ts` — progression unlocks and one-off rewards.
- **Version & changelog**: `src/application/version.ts`, `src/application/changelog.ts` — app version (from package.json at build), "What's new" modal; `src/data/changelog.json` (newest first).
- **Persistence**: `src/infrastructure/SaveLoadService.ts` — save/load/export/import, offline progress (capped), `SAVE_VERSION`, `isSavedSession()`, `validateSavePayload()`; `src/settings.ts` — user settings (starfield, layout, pause when background, theme, soundEnabled, reducedMotion).
- **Event bus**: `src/application/eventBus.ts` — `subscribe(kind, fn)`, `emit(kind, payload)` for upgrade_purchased, prestige, quest_claimed, planet_bought, astronaut_hired, session_loaded, save_success, save_failed.
- **Strings**: `src/application/strings.ts` — `strings` map and `t(key)` for UI copy (invalid save, offline banner, etc.).

---

## 10. Current Flows (Summary)

- **Mine click**: Handlers → mine click (lucky/critical), combo tracking, coins, toasts; game loop applies passive production and event multiplier.
- **Buy upgrade**: Handlers → PlanetService/UpgradeService (planet choice if multiple slots); persistence on interval.
- **Planets & crew**: Buy new planet (PlanetService), add slot (cost scaling), **build housing** on each planet (planet card); hire astronauts (Player); production = upgrades × planet bonus × prestige × crew bonus. **Empire** tab shows production breakdown, crew, planets (with housing), quests, prestige.
- **Quests**: Quest state in gameState; generate/claim in handlers; streak bonus; render in questView.
- **Prestige**: PrestigeService + handlers; reset to one planet, prestige level +1, bonus to production.
- **Events**: Game loop checks `nextEventAt`; handlers trigger random event from catalog; active events multiply production until they expire.
- **Save/load**: SaveLoadService every 3s; payload has `version: 1`; load/import validate with `isSavedSession()`; on load, offline progress applied (capped 12h); export/import in settings UI; retry once on save failure.
- **Settings**: Persisted in localStorage (starfield speed, orbit lines, click particles, compact numbers, space repeat, layout, pause when background, **theme**, **sound**, **reduce motion**); theme and reduced motion applied via `data-theme` / `data-reduced-motion` on `<html>`.
- **Offline**: Banner shown when `navigator.onLine` is false; copy from `strings.offlineIndicator`.

---

## 11. Implemented Improvements

1. **Accessibility** — ARIA on tablist/tabs/panels and modals; keyboard: 1–4 switch tabs, Tab trapped in open modal, Escape closes modal; focus moved to first focusable when opening settings/reset/prestige; **Reduce motion** setting with `data-reduced-motion` and matching CSS.
2. **Error handling** — Save retries once on failure; **`isSavedSession()`** type guard before deserialize; **offline banner** when `navigator.onLine` is false (see `strings.offlineIndicator`).
3. **Performance** — Stats history **only writes to storage when a new point is recorded**; **requestIdleCallback** for statistics section updates in the game loop.
4. **Testing** — **Playwright** E2E in `e2e/` (smoke, mine zone, tabs); unit tests for **eventBus** and **gameState**.
5. **i18n** — **`src/application/strings.ts`** with `t(key)`; used for invalid save and offline banner; catalog data remains in catalogs.
6. **Settings** — **Theme** (light/dark), **Sound effects**, **Reduce motion** in `settings.ts` and settings UI; all persisted.
7. **Save format** — **`version: 1`** in serialized payload; **`isSavedSession()`** validation; legacy (no version) still loads; **`SAVE_VERSION`** and **`validateSavePayload()`** in SaveLoadService.
8. **DevEx** — **ESLint** (`.eslintrc.cjs`) and **Prettier** (`.prettierrc`) at repo root; **Playwright** (`playwright.config.ts`, `e2e/`); scripts **`npm run lint`**, **`npm run format`**, **`npm run test:e2e`**.
9. **Documentation** — This file and README kept in sync; PROGRESSION_CURVE.md for economy reference; IDEAS.md for future gameplay.
10. **Observability** — **`src/application/eventBus.ts`**: subscribe/emit for upgrade_purchased, prestige, quest_claimed, planet_bought, astronaut_hired, session_loaded, save_success, save_failed; **performance.mark** in game loop and in SaveLoadService save.
11. **Handlers** — Split by domain into **handlersSave**, **handlersMine**, **handlersUpgrade**, **handlersPlanet**, **handlersQuest**, **handlersPrestige**, **handlersResearch**, **handlersSettings**, **handlersDebug**; **handlers.ts** re-exports for a single entry point.
12. **Planet affinity** — Planet type (rocky/desert/ice/volcanic/gas), visuals (colors, texture, rings/belt, size) and affinity stats derived deterministically from planet name; **planetAffinity.ts** + **data/planetAffinity.json**.
