# research.json schema

**Purpose**: Defines the research skill tree: nodes, cost, success chance, prerequisites, and modifiers (production %, click %, slot-free/crew-free upgrades). Used by `src/application/research.ts` and RESEARCH_CATALOG in catalogs.

**Source**: `src/data/research.json` — array of node definitions.

## Schema: single node

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique id (e.g. `mining-theory`, `automation`) |
| name | string | Yes | Display name |
| description | string | No | Flavor text |
| cost | number | Yes | Coin cost to attempt |
| successChance | number | Yes | Base success chance 0–1 (failure = coins lost) |
| prerequisites | string[] | Yes | Node ids that must be unlocked first (empty = root) |
| modifiers | object | No | See Modifiers below |
| row | number | Yes | Row in tree (UI layout) |
| col | number | Yes | Column in tree (UI layout) |
| researchDataCost | number | No | Research data required (from expeditions) in addition to coins |
| secret | boolean | No | If true, optional/side branch (UI can style differently) |

### modifiers (all optional)

| Field | Type | Description |
|-------|------|-------------|
| productionPercent | number | +% production (stacked with other nodes) |
| clickPercent | number | +% click reward (stacked) |
| slotFreeUpgrades | string[] | Upgrade ids that no longer use a planet slot |
| crewFreeUpgrades | string[] | Upgrade ids that no longer require crew |
| crewReduction | Record<string, number> | Upgrade id → reduction in required crew (e.g. orbital-station: 1) |
| unlocksCrewRole | string | Role unlocked for hire: miner, scientist, medic, pilot, engineer |
| expeditionDurationPercent | number | Expedition duration modifier (negative = faster) |
| expeditionDeathChancePercent | number | Expedition death chance modifier (negative = safer) |
| housingCapacityBonus | number | Extra max crew capacity (flat +N) |

## Notes

- Effective success chance includes scientist multiplier, partial progress from failures, and pity (guaranteed after N failures). Effective cost decreases with failures (see balance.json).
- Research state: unlocked node ids, research progress (failures, research data), and prestige research points. Unlocked and progress reset on prestige; prestige points persist and are added per prestige.
- See [reference/research-formulas.md](../reference/research-formulas.md) for full node table and formulas.
