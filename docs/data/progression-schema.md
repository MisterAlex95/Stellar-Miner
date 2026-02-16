# progression.json schema

**Purpose**: Defines progression unlocks: coin thresholds at which features (upgrades UI, crew, research, planets, events, quests, prestige) become available, plus intro title/body for each. Used by `src/application/progression.ts` and UI (progression view, tab visibility).

**Source**: `src/data/progression.json` — array of unlock entries in order of threshold.

## Schema: single entry

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique id (e.g. `welcome`, `upgrades`, `crew`, `research`, `planets`, `events`, `quest`, `prestige`) |
| coinsThreshold | number | Yes | Minimum current coins (wallet) to unlock |
| title | string | Yes | Unlock title shown in UI |
| body | string | Yes | Description / how-to text |
| sectionId | string | No | Optional id to scroll to (e.g. `upgrades-section`, `crew-section`) |

## Notes

- Unlocks are gated by **current coins**, not total coins ever.
- Tab visibility and block visibility use `getUnlockedBlocks(session)` which derives from these thresholds.
- Order of array is significant for display (lowest threshold first).
