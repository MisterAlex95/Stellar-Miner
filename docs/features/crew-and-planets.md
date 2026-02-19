# Crew and planets

## Astronauts (crew)

- **Hire cost**: `floor(astronautBaseCost × astronautCostGrowth^count)` (e.g. 2,500 × 1.2^count). See [data/balance-and-config.md](../data/balance-and-config.md).
- **Production bonus**: +1.5% per astronaut (stacking). Roles (miner, scientist, pilot, medic, engineer) have additional bonuses from balance.json; **veterans** (expedition survivors) add a small bonus.
- **Capacity**: Max astronauts = `maxAstronautsBase × planetCount + totalHousingAcrossAllPlanets × 2`. Base 2 per planet; each housing on any planet adds +2. **Overcrowding** applies a morale malus (balance: moraleMalusWhenOvercrowded).
- **Spending crew**: Upgrades that require astronauts consume them from the free pool when purchased (`crewAssignedToEquipment`). Expedition launch also spends crew (see below).

## Planets and expeditions

- **New planet cost**: `floor(newPlanetBaseCost × (planetCount + 1) × newPlanetCostGrowth^planetCount)` (e.g. 120,000 × (n+1) × 1.28^n). See [reference/planets-formulas.md](../reference/planets-formulas.md).
- **Planet bonus**: +4% production per extra planet (first planet is base).
- **Expedition**: Requires 2–6 astronauts (scales with planet count). Duration increases with planet count (base + per-planet ms). Each astronaut has a death chance; if **all** die, the planet is not discovered. **Pilot** in composition guarantees one survivor; **medic** reduces death chance. Expedition state is stored (endsAt, composition, durationMs) and resolved when time is up.

## Planet names and solar systems

- First 10 names from `balance.planetNames`; beyond that, procedural from planet id (`generatePlanetName`).
- **Solar systems**: 4 planets per system; procedural system name (e.g. "Alpha Centauri"). Display: "PlanetName (System Name)". See `src/application/solarSystems.ts`.

## Planet affinity

- **Planet type** (rocky, desert, ice, volcanic, gas) is derived from planet **name** (hash). Each module has an optional affinity (multiplier per type) in [modules.json](../../src/data/modules.json). Production from a module on a planet is multiplied by the affinity for that module id and planet type. See [data/modules-schema.md](../data/modules-schema.md).

## Housing

- Built **per planet**. Cost `floor(housingBaseCost × housingCostGrowth^count)` for the next housing on that planet. Each housing adds **+2** crew capacity (global). Uses **one upgrade slot** on that planet.

## Add slot

- Same cost formula as in [reference/planets-formulas.md](../reference/planets-formulas.md). Per-planet; increases max slots for that planet only.
