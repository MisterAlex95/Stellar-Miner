# upgrades.json schema

**Purpose**: Defines the upgrade catalog (equipment that can be purchased and placed on planets). Used by `UPGRADE_CATALOG` in `src/application/catalogs.ts` and by UpgradeService, UI, and cost formulas.

**Source**: `src/data/upgrades.json` — array of upgrade definitions.

## Schema: single upgrade

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique id (e.g. `mining-robot`, `drill-mk1`) |
| name | string | Yes | Display name |
| description | string | Yes | Flavor text |
| cost | number | Yes | Base cost (first purchase) |
| coinsPerSecond | number | Yes | Production added per installed copy |
| tier | number | Yes | Tier 1–10 (affects install duration, UI grouping) |
| requiredAstronauts | number | Yes | Crew required to buy (0 = none) |
| usesSlot | boolean | No | If false, does not consume a planet slot (default true; tier 1 often false) |

## Cost formula (runtime)

Next copy cost: `baseCost × costMultiplierPerOwned^ownedCount`. `costMultiplierPerOwned` is in `gameConfig.upgrades` (e.g. 1.19).

## Notes

- Upgrade ids are referenced in research.json (slotFreeUpgrades, crewFreeUpgrades, crewReduction) and in planetAffinity.json (affinity per upgrade).
- Production from upgrades is summed per planet and multiplied by planet type affinity; see [planet-affinity-schema.md](planet-affinity-schema.md).
