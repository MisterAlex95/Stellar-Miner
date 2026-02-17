# planetAffinity.json schema

**Purpose**: Defines planet types and per-upgrade, per-type production multipliers. Planet type is derived deterministically from planet name (hash); production for each upgrade on a planet is multiplied by the affinity for that upgrade id and planet type. Used by `src/application/planetAffinity.ts` and production calculations.

**Source**: `src/data/planetAffinity.json`.

## Root structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| planetTypes | string[] | Yes | List of type ids (e.g. rocky, desert, ice, volcanic, gas) |
| affinity | object | Yes | Map: upgradeId → { planetType: multiplier } |

## affinity

- **Key**: module id (must match an id in modules.json).
- **Value**: object whose keys are planet type strings (from planetTypes) and values are numbers (production multiplier, e.g. 1.2 = +20%, 0.8 = -20%).
- Missing upgrade or missing type defaults to multiplier 1.

## Notes

- Planet type for a planet is computed from its **name** in `getPlanetType(planetName)` (hash % planetTypes.length).
- Used when computing base production from planets (e.g. after load) and in tooltips (getPlanetAffinityDescription).
