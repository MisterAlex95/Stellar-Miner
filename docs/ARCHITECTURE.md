# Stellar Miner — Domain-Driven Design (DDD)

Simplified Domain-Driven Design for the idle game "Stellar Miner": domain and subdomains, entities, value objects, aggregates, domain services, and events. This model keeps the code organized and easy to extend.

---

## 1. Domains and Subdomains

**Core domain: Stellar Miner**

| Subdomain        | Role                                      |
|------------------|-------------------------------------------|
| **Mining (Core)** | Resources, upgrades, and production       |
| **Economy (Supporting)** | Transactions, costs, and revenue   |
| **Progression (Generic)** | Save/load and prestige             |

---

## 2. Entities

Entities have identity and a lifecycle.

| Entity     | Description                                      | Main attributes (examples)        |
|------------|--------------------------------------------------|----------------------------------|
| **Player** | Player and their progression                     | id, coins, prestigeLevel, totalCoinsEver |
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
| **Player**  | Player      | Holds upgrades, artifacts, and coins            |
| **GameSession** | GameSession | Holds the player, active events, and global state |

---

## 5. Domain Services

Domain logic that does not belong to a single entity or value object.

| Service           | Responsibility                                  |
|-------------------|-------------------------------------------------|
| **UpgradeService**| Purchase and apply upgrades                     |
| **EventService**  | Trigger and handle random events                |
| **PrestigeService** | Compute prestige bonuses and reset the run   |
| **SaveLoadService** (infra) | Save and load game state (e.g. localStorage) |

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

- **domain/** — Entities, value objects, aggregates, events, domain services
- **application/** — Application entry and orchestration
- **presentation/** — UI entry
- **infrastructure/** — SaveLoadService, persistence

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

- **Player**: `src/domain/entities/Player.ts` — `Player.create(id)`, `addCoins`, `spendCoins`, `addUpgrade`, `setProductionRate`.
- **UpgradeService**: `src/domain/services/UpgradeService.ts` — `purchaseUpgrade(player, upgrade)`.
- **GameSession**: `src/domain/aggregates/GameSession.ts` — aggregate root for current session.
- **Value objects**: `src/domain/value-objects/` — Coins, ProductionRate, UpgradeEffect, EventEffect.

---

## 10. Next Steps

- Implement application layer use cases (click handlers, purchase flows).
- Wire presentation (UI) to domain and application.
- Extend persistence (localStorage or backend) via `ISaveLoadService`.
