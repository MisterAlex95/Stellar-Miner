# Random events

## Trigger

- **Interval**: Random event every ~2 min (gameConfig.timing.eventIntervalMs, minEventDelayMs). First event after unlock is sooner (firstEventDelayMs).
- Unlock: same threshold as Planets (120,000 coins, progression).

## Pool rules

- **Positive only** until **N** events have been triggered in the run; then **negative** events can appear. N = `gameConfig.events.negativeUnlockAfterTriggers` (e.g. 4).
- Events are chosen from the catalog; each has a **multiplier** and **durationMs**. Active events multiply **production** until they expire (multiple events stack).

## Catalog

- **Source**: [data/events.json](../../src/data/events.json). Schema: [data/events-schema.md](../data/events-schema.md).
- Examples: Meteor Storm (×2, 35 s), Rich Vein (×2.5, 25 s), Dust Storm (×0.58, 32 s), Solar Eclipse (×0.48, 40 s). Positive events have multiplier ≥ 1; negative &lt; 1.
- Active event instances are stored in session with id, name, effect; UI shows badges with name and multiplier (and optionally remaining time).
