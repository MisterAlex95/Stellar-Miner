# Data and config reference

This folder documents all game data files and the save format: schemas (field names, types, required/optional), purpose, and where they are used in code.

| File | Path | Doc | Description |
|------|------|-----|--------------|
| Save format | `src/infrastructure/SaveLoadService.ts` | [save-format.md](save-format.md) | Serialized session payload (SavedSession and related types) |
| Modules | `src/data/modules.json` | [modules-schema.md](modules-schema.md) | Module catalog (tiers 1–10, cost, production, crew, planet affinity) |
| Events | `src/data/events.json` | [events-schema.md](events-schema.md) | Random events (multiplier, duration) |
| Research | `src/data/research.json` | [research-schema.md](research-schema.md) | Research skill tree nodes |
| Achievements | `src/data/achievements.json` | [achievements-schema.md](achievements-schema.md) | Achievement definitions and unlock types |
| Progression | `src/data/progression.json` | [progression-schema.md](progression-schema.md) | Unlock thresholds and intro copy |
| Balance & config | `src/data/balance.json`, `src/data/gameConfig.json` | [balance-and-config.md](balance-and-config.md) | Economy constants, timing, combo, quest config |
| Planet affinity | `src/data/planetAffinity.json` | [planet-affinity-schema.md](planet-affinity-schema.md) | Planet types and per-upgrade multipliers |

**Changelog** (`src/data/changelog.json`) is not schema-documented here; it is consumed by `src/application/changelog.ts` for the "What's new" modal (version, date, changes array).
