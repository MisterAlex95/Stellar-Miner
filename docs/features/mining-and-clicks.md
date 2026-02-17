# Mining and clicks

## Mine click

- **Base**: 1 coin per click before Prestige 1. After Prestige 1, click bonuses apply (Lucky, Super Lucky, Critical, Combo, Research +% click).
- **Space key**: Press Space to mine (same as clicking the mine zone).
- **Key repeat**: Optional "Allow Space key repeat" in settings — when on, holding Space sends repeated mine actions.

## Lucky / Super Lucky / Critical

Random multipliers on a single click. Unlocked **after first Prestige**. Chances and ranges come from `gameConfig.lucky`:

- **Lucky**: chance 3.5%, multiplier between 4 and 20.
- **Super Lucky**: chance 0.5%, multiplier between 35 and 75.
- **Critical**: chance 0.12%, very high multiplier.

When one triggers, the click reward is multiplied; toasts show the result.

## Combo

- Click within **2.4 s** (config: `gameConfig.combo.windowMs`) of the previous click to extend the combo.
- **Minimum 6 clicks** to get any multiplier; each extra level adds **+9%** (`multPerLevel`) up to **×1.55** (`maxMult`).
- **Tier names** (by multiplier): Combo, Hot, On fire, Unstoppable, Legendary, Mega.
- Combo applies to the click reward only (not passive production).

## Shooting star

- Rare visual in the mine zone (2D canvas or 3D): a shooting star crosses the screen.
- **Clicking it** unlocks the achievement **"Wish upon a star"** (handler calls `unlockAchievement('shooting-star')`).
- Implemented in MineZoneCanvas and MineZone3D; one star at a time, short duration.
