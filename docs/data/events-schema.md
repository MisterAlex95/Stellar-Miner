# events.json schema

**Purpose**: Defines random events that temporarily multiply production. Used by `EVENT_CATALOG` in `src/application/catalogs.ts` and by the event trigger logic (game loop, handlers).

**Source**: `src/data/events.json` — array of event definitions.

## Schema: single event

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique id (e.g. `meteor-storm`, `dust-storm`) |
| name | string | Yes | Display name |
| effect | object | Yes | See below |

### effect

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| multiplier | number | Yes | Production multiplier (e.g. 2 = ×2, 0.58 = ×0.58) |
| durationMs | number | Yes | How long the event lasts (ms) |

## Notes

- Positive events (multiplier ≥ 1) and negative events (multiplier < 1) exist. Pool rules: only positive until N events triggered in the run, then negative can appear (`gameConfig.events.negativeUnlockAfterTriggers`).
- Active events are stored in session with `endsAt`; production is multiplied by all active event multipliers until they expire.
