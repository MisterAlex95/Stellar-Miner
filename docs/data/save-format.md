# Save format (session payload)

The game persists the current session to localStorage and supports export/import. The payload shape is defined in `src/infrastructure/SaveLoadService.ts` and deserialized in `src/application/sessionSerialization.ts`.

## Version and validation

- **SAVE_VERSION**: `1` (constant in SaveLoadService).
- **version** (optional on payload): if present and greater than SAVE_VERSION, load throws "Unsupported save version". Legacy saves with no version still load (treated as version 0).
- **Validation**: `isSavedSession(data: unknown): data is SavedSession` — type guard used before deserialize; checks required top-level and player fields.

## Schema (TypeScript types)

### SavedSession

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| version | number | No | Save format version (default 0 if missing) |
| id | string | Yes | Session id |
| player | object | Yes | See SavedPlayer below |
| activeEvents | array | Yes | Active event instances (id, name, effect) |
| runStats | SavedRunStats | No | Run-scoped stats (reset on prestige) |
| discoveredEventIds | string[] | No | Event ids seen this run |
| expedition | SavedExpedition | No | Current expedition (endsAt, composition, durationMs) |
| unlockedResearch | string[] | No | Research node ids (restored on import) |

### Player (inside SavedSession.player)

| Field | Type | Required | Description |
|-------|------|----------|--------------|
| id | string | Yes | Player id |
| coins | number \| string | Yes | Current coins (string for big numbers) |
| productionRate | number \| string | Yes | Base production rate from upgrades |
| planets | SavedPlanet[] | No | Planets with upgrades, housing, installing/uninstalling |
| upgrades | SavedUpgrade[] | No | Legacy: flat list of owned upgrades (when no planets) |
| artifacts | array | Yes | { id, name, effect, isActive }[] |
| prestigeLevel | number | Yes | Prestige level (persistent) |
| prestigePlanetBonus | number | No | Banked +1% per planet discovered at each prestige (persistent) |
| prestigeResearchBonus | number | No | Banked +0.5% per research node at each prestige (persistent) |
| totalCoinsEver | number \| string | Yes | Lifetime coins (persistent) |
| astronautCount | number | No | Total crew count (legacy; use crewByRole when present) |
| crewByRole | SavedCrewByRole | No | Count per role (astronaut, miner, scientist, pilot, medic, engineer) |
| crewAssignedToEquipment | number | No | Crew spent on upgrades that require crew |
| veteranCount | number | No | Expedition survivors (production bonus) |

### SavedPlanet

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Planet id |
| name | string | Yes | Display name |
| maxUpgrades | number | Yes | Max slots (upgrades + housing) |
| upgrades | SavedUpgrade[] | Yes | Installed upgrades on this planet |
| housing | number | No | Housing count (+2 crew capacity each) |
| assignedCrew | number | No | Crew assigned to this planet (future use) |
| visualSeed | number | No | Seed for procedural visual |
| installingUpgrades | SavedInstallingUpgrade[] | No | Upgrades currently installing |
| uninstallingUpgrades | SavedUninstallingUpgrade[] | No | Upgrades currently uninstalling |

### SavedUpgrade

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Module id (from modules.json) |
| name | string | Yes | Display name |
| cost | number \| string | Yes | Last cost (for display) |
| effect | object | Yes | { coinsPerSecond: number \| string } |

### SavedInstallingUpgrade

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| upgrade | SavedUpgrade | Yes | Upgrade being installed |
| startAt | number | No | Start timestamp (ms) |
| endsAt | number | Yes | End timestamp (ms) — when install completes |
| rateToAdd | number \| string | Yes | Production to add when complete |

### SavedUninstallingUpgrade

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| upgradeId | string | Yes | Id of upgrade being uninstalled |
| startAt | number | No | Start timestamp (ms) |
| endsAt | number | Yes | End timestamp (ms) |

### SavedCrewByRole

All optional number fields: `astronaut`, `miner`, `scientist`, `pilot`, `medic`, `engineer`. Sum = total crew.

### SavedRunStats

| Field | Type | Description |
|-------|------|-------------|
| runStartTime | number | Run start timestamp (ms) |
| runCoinsEarned | number | Coins earned this run |
| runQuestsClaimed | number | Quests claimed this run |
| runEventsTriggered | number | Events triggered this run |
| runMaxComboMult | number | Max combo multiplier this run |

### SavedExpedition

| Field | Type | Description |
|-------|------|-------------|
| endsAt | number | When expedition resolves (ms) |
| composition | Record<string, number> | Crew role counts sent |
| durationMs | number | Expedition duration (ms) |

## Deserialization

- **sessionSerialization.deserializeSession(data)** builds a `GameSession` (Player, Planets, active events, etc.) from a valid `SavedSession`. Called by SaveLoadService on load/import after `isSavedSession()` check.
- Coins and production can be stored as string for break_infinity.js (large numbers); deserializer uses `toDecimal()`.
