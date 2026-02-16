# Upgrades

## Catalog

- **Source**: [data/upgrades.json](../../src/data/upgrades.json). See [data/upgrades-schema.md](../data/upgrades-schema.md).
- **Tiers 1–10**: Mining Robot (tier 1) through Nexus Collector (tier 10). Each has base cost, coins/s, required astronauts, and optional `usesSlot` (tier 1 is slot-free by default).
- **Cost for next copy**: `baseCost × costMultiplierPerOwned^ownedCount` (e.g. 1.19^owned). Config in `gameConfig.upgrades`.

## Slots

- Each planet has a **max upgrade slots** (default 6). Each installed upgrade (and each housing module) uses one slot.
- **Add slot**: Cost `floor(baseMultiplier × maxSlots^exponent)`; first expansion (6→7) multiplied by a discount. See [reference/planets-formulas.md](../reference/planets-formulas.md).
- When the player has multiple planets with free slots and buys an upgrade, a **planet choice modal** lets them pick which planet to install on.

## Install duration

- After purchase, an upgrade **installs** for a duration before it contributes production. Formula uses tier and cost (and caps); see [reference/progression-curve.md](../reference/progression-curve.md) and `gameConfig.upgrades` (installDurationBaseMs, installDurationCostFactor, installDurationTierExponent, installDurationLog10Cap).
- **Uninstall**: Player can uninstall an upgrade in progress; it is removed after a delay and the slot is freed. Install and uninstall can be **cancelled** (handlers: cancelUpgradeInstall, cancelUpgradeUninstall).
- UI shows progress (progress bar / time remaining) for installing and uninstalling.

## Research effects

- Some research nodes make specific upgrades **slot-free** (no planet slot) or **crew-free** (no astronauts required). See [research.md](research.md) and [data/research-schema.md](../data/research-schema.md).
