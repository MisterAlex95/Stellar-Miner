# Quests

## Unlock

- **250,000** coins (progression threshold). Quest block and Claim appear in Empire (and Dashboard).

## Types

Quest type is chosen at random with weights. Types and targets come from `gameConfig.questGeneration`:

- **coins** — Reach X coins (target from list; reward scales).
- **production** — Reach X/s production.
- **upgrade** — Own N copies of a specific upgrade (from first few tiers).
- **astronauts** — Have X astronauts.
- **prestige_today** — Prestige N times today (unlocked only if player has prestiged at least once).
- **combo_tier** — Reach a combo multiplier tier (e.g. 1.15, 1.25, 1.35).
- **events_triggered** — Trigger N events this run.
- **tier1_set** — Own at least one of every tier-1 upgrade.

Targets are gated so they are "next step" (achievable) based on current coins, production, crew, and run stats. See `src/application/quests.ts`.

## Streak

- **Claim within 5 minutes** of completing the quest to build a streak. Config: quest.streakWindowMs (300000), streakBonusPerLevel (0.12), streakMax (3).
- **+12%** reward per streak level (stacking). If the player does not claim in time, streak resets to 0.

## Rewards

- On **Claim**, the player receives bonus coins (and streak is incremented if within window). Reward formula per type is in gameConfig.questGeneration (rewardBase, rewardMult, rewardPerTarget, etc.).
