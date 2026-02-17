# Modules

## Catalog

- **Source**: [data/modules.json](../../src/data/modules.json). See [data/modules-schema.md](../data/modules-schema.md).
- **Tiers 1–10**: Mining Robot (tier 1) through Nexus Collector (tier 10), plus additional modules per tier (e.g. Solar Collector, Cryo Extractor). Each has base cost, coins/s, required astronauts, and optional `usesSlot` (tier 1 is slot-free by default).
- **Cost for next copy**: `baseCost × costMultiplierPerOwned^ownedCount` (e.g. 1.19^owned). Config in `gameConfig.upgrades`.
- **Planet affinity**: Many modules perform better on specific planet types (Rocky, Desert, Ice, Volcanic, Gas). The UI shows "Best on: …" and an (i) icon with production by planet type. Install modules on matching planets for a bonus.

## Slots

- Each planet has a **max module slots** (default 6). Each installed module (and each housing module) uses one slot.
- **Add slot**: Cost `floor(baseMultiplier × maxSlots^exponent)`; first expansion (6→7) multiplied by a discount. See [reference/planets-formulas.md](../reference/planets-formulas.md).
- When the player has multiple planets with free slots and buys a module, a **planet choice modal** lets them pick which planet to install on.

## Install duration

- After purchase, a module **installs** for a duration before it contributes production. Formula uses tier and cost (and caps); see [reference/progression-curve.md](../reference/progression-curve.md) and `gameConfig.upgrades` (installDurationBaseMs, installDurationCostFactor, installDurationTierExponent, installDurationLog10Cap).
- **Uninstall**: Player can uninstall a module in progress; it is removed after a delay and the slot is freed. Install and uninstall can be **cancelled** (handlers: cancelUpgradeInstall, cancelUpgradeUninstall).
- UI shows progress (progress bar / time remaining) for installing and uninstalling.

## Research effects

- Some research nodes make specific modules **slot-free** (no planet slot) or **crew-free** (no astronauts required). See [research.md](research.md) and [data/research-schema.md](../data/research-schema.md).
