# Stellar Miner — Planets and expeditions (formulas and reference)

Reference for planet discovery, expeditions, slots, and housing. Data from `balance.json` and `domain/constants.ts`.

---

## 1. New planet (expedition cost)

**Formula**: `floor(baseCost × (planetCount + 1) × costGrowth^planetCount)`

- **planetCount** = number of planets already owned (0 = cost for first planet).
- Config: `newPlanetBaseCost: 120000`, `newPlanetCostGrowth: 1.28`.

| Planets owned | Cost for next (⬡) |
|---------------|--------------------|
| 0             | 120,000            |
| 1             | 307,200            |
| 2             | 589,824            |
| 3             | 1,179,648         |
| 4             | 2,359,296         |
| 5             | 4,718,592         |
| 6             | 9,437,184         |
| 7             | 18,874,368        |
| 8             | 37,748,736        |
| 9             | 75,497,472        |

**Effect**: +4% production per extra planet (first planet is base). `planetProductionBonus: 0.04`.

---

## 2. Expedition (crew and duration)

### 2.1 Astronauts required

**Formula**: `min(expeditionMinAstronauts + floor(planetCount / 2), expeditionMaxAstronauts)`

- Config: `expeditionMinAstronauts: 2`, `expeditionMaxAstronauts: 6`.

| Planets owned | Astronauts required |
|---------------|---------------------|
| 0             | 2                   |
| 1             | 2                   |
| 2             | 3                   |
| 3             | 3                   |
| 4             | 4                   |
| 5             | 4                   |
| 6+            | 5 (cap 6 at 8+)     |

### 2.2 Expedition duration

**Formula**: `baseMs + planetCount × perPlanetMs`

- Config: `expeditionDurationBaseMs: 35000`, `expeditionDurationPerPlanetMs: 14000`.
- Duration is the time before the expedition result is known (UI / gameplay).

| Planets owned | Duration (ms) | Duration   |
|---------------|---------------|------------|
| 0             | 35,000        | ~35 s      |
| 1             | 49,000        | ~49 s      |
| 2             | 63,000        | ~1m 03s    |
| 3             | 77,000        | ~1m 17s    |
| 4             | 91,000        | ~1m 31s    |
| 5             | 105,000       | ~1m 45s    |
| 6             | 119,000       | ~2m        |

### 2.3 Death chance

- **Per-astronaut death chance**: 28% (`expeditionDeathChance: 0.28`), minimum 6% (`expeditionMinDeathChance: 0.06`).
- Each astronaut rolls independently. If all die, planet is not discovered.
- **Pilot**: at least one pilot guarantees one survivor (if at least one astronaut was sent).

---

## 3. Upgrade slots (per planet)

Each planet has a **max upgrade slots** (upgrades + housing each use one). Base slots = 6.

**Cost to add one slot**: `floor(baseMultiplier × currentMaxSlots^exponent)`, with **first expansion** (6 → 7) multiplied by `addSlotFirstExpansionDiscount`.

- Config: `addSlotBaseMultiplier: 25000`, `addSlotExponent: 1.38`, `addSlotFirstExpansionDiscount: 0.82`, `defaultBaseSlots: 6`.

| Current max slots | Cost for +1 slot (⬡) | Note   |
|-------------------|------------------------|--------|
| 6 → 7             | ~209,000               | First expansion ×0.82 |
| 7 → 8             | ~293,000               |         |
| 8 → 9             | ~387,000               |         |
| 9 → 10            | ~491,000               |         |

---

## 4. Housing (per planet)

Housing is built **per planet**. Each housing adds **+2 crew capacity** for that planet (`housingAstronautCapacity: 2`).

**Cost for next housing on same planet**: `floor(housingBaseCost × housingCostGrowth^count)`

- **count** = number of housing modules already on that planet.
- Config: `housingBaseCost: 12000`, `housingCostGrowth: 1.26`.

| Housing on planet | Cost for next (⬡) |
|-------------------|--------------------|
| 0 → 1             | 12,000             |
| 1 → 2             | 15,120             |
| 2 → 3             | 19,051             |
| 3 → 4             | 24,004             |
| 4 → 5             | 30,245             |

**Max astronauts**: `maxAstronautsBase × planetCount + totalHousingAcrossAllPlanets × 2`. `maxAstronautsBase: 2`. So with 1 planet and 0 housing, max 2 astronauts; with 2 planets and 0 housing, max 4; with 1 planet and 2 housing, 2 + 4 = 6.

---

## 5. Planet names

Themed names from `balance.planetNames` (first 10). Beyond that, names are generated procedurally from planet id (e.g. "Kel Drift", "Nova Prime") via `generatePlanetName(planetId)`.
