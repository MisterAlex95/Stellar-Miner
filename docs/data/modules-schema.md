# modules.json schema

**Purpose**: Defines the module catalog (equipment that can be purchased and placed on planets) and planet affinity. Used by `UPGRADE_CATALOG` in `src/application/catalogs.ts`, `planetAffinity.ts`, UpgradeService, UI, and cost formulas. User-facing name is "Modules".

**Source**: `src/data/modules.json` — object with `planetTypes` and `modules` array.

## Root structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| planetTypes | string[] | Yes | Planet type ids (e.g. rocky, desert, ice, volcanic, gas). Planet type is derived from planet name (hash % length). |
| modules | array | Yes | List of module definitions (see below). |

## Schema: single module

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique id (e.g. `mining-robot`, `drill-mk1`, `solar-collector`) |
| name | string | Yes | Display name |
| description | string | Yes | Flavor text (can mention best planet type) |
| cost | number | Yes | Base cost (first purchase) |
| coinsPerSecond | number | Yes | Production added per installed copy |
| tier | number | Yes | Tier 1–15 (affects install duration, UI grouping) |
| requiredAstronauts | number | Yes | Crew required to buy (0 = none) |
| usesSlot | boolean | No | If false, does not consume a planet slot (default true; tier 1 often false) |
| affinity | object | No | Per-planet-type production multiplier: `{ "rocky": 1.2, "desert": 0.9, ... }`. Missing type or missing field defaults to 1. |

## Cost formula (runtime)

Next copy cost: `baseCost × costMultiplierPerOwned^ownedCount`. `costMultiplierPerOwned` is in `gameConfig.upgrades` (e.g. 1.19).

## Notes

- Module ids are referenced in research.json (slotFreeUpgrades, crewFreeUpgrades, crewReduction).
- Production from a module on a planet is multiplied by the affinity for that module id and the planet’s type (from `getPlanetType(planetName)`). See `src/application/planetAffinity.ts`.
