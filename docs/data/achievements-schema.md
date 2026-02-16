# achievements.json schema

**Purpose**: Defines achievements that unlock when the player meets criteria. Used by `src/application/achievements.ts` and displayed in the Achievements modal (trophy in header).

**Source**: `src/data/achievements.json` — array of achievement definitions.

## Schema: single achievement

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique id (e.g. `first-click`, `prestige-10`) |
| name | string | Yes | Display name |
| type | string | Yes | Unlock condition type (see below) |
| value | number | Yes | Threshold or value for the type |
| secret | boolean | No | If true, name/description hidden until unlocked (show "???") |

## Achievement types (type field)

| type | Description | value meaning |
|------|-------------|----------------|
| totalClicks | Lifetime click count | Minimum clicks |
| upgradesCount | Total upgrades owned (all copies) | Minimum count |
| astronautsCount | Total astronauts hired | Minimum count |
| prestigeLevel | Prestige level | Minimum level |
| planetsCount | Planets owned | Minimum count |
| totalCoinsEver | Lifetime coins earned | Minimum coins |
| questStreak | Quest streak level | Minimum streak (e.g. 3) |
| questClaimed | Quests claimed (lifetime) | Minimum count |
| comboMaster | Reached combo tier | 1 = achieved |
| totalSlotsGreaterThan | Total upgrade slots (all planets) > value | e.g. 6 = more than base slots |
| researchNodesUnlocked | Research nodes unlocked (current run) | Minimum count |
| shootingStarClicked | Clicked a shooting star in mine zone | 1 = achieved |

## Notes

- Unlocked achievement ids are persisted in localStorage (key from gameConfig.storageKeys.achievementsKey).
- Secret achievements use optional `secret: true`; UI shows "???" until unlocked.
