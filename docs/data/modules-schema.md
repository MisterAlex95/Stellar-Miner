# modules.json schema

**Purpose**: Defines the module catalog (equipment that can be purchased and placed on planets). Used by `UPGRADE_CATALOG` in `src/application/catalogs.ts` and by UpgradeService, UI, and cost formulas. User-facing name is "Modules".

**Source**: `src/data/modules.json` — array of module definitions.

## Schema: single module

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique id (e.g. `mining-robot`, `drill-mk1`, `solar-collector`) |
| name | string | Yes | Display name |
| description | string | Yes | Flavor text (can mention best planet type) |
| cost | number | Yes | Base cost (first purchase) |
| coinsPerSecond | number | Yes | Production added per installed copy |
| tier | number | Yes | Tier 1–10 (affects install duration, UI grouping) |
| requiredAstronauts | number | Yes | Crew required to buy (0 = none) |
| usesSlot | boolean | No | If false, does not consume a planet slot (default true; tier 1 often false) |

## Cost formula (runtime)

Next copy cost: `baseCost × costMultiplierPerOwned^ownedCount`. `costMultiplierPerOwned` is in `gameConfig.upgrades` (e.g. 1.19).

## Notes

- Module ids are referenced in research.json (slotFreeUpgrades, crewFreeUpgrades, crewReduction) and in planetAffinity.json (affinity per module).
- Production from modules is summed per planet and multiplied by planet type affinity; see [planet-affinity-schema.md](planet-affinity-schema.md).
