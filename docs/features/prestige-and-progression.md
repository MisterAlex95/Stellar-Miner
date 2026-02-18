# Prestige and progression

## Prestige

- **Threshold**: 5,000,000 coins (current wallet). Config: balance.prestigeCoinThreshold.
- **Effect**: Reset run — coins, planets, upgrades, crew, research. **Kept**: Prestige level (incremented by 1), total coins ever.
- **Bonus (production)**: **+7%** per Prestige level (base). At each prestige, two extra bonuses are **banked** permanently: **+1%** per planet discovered this run (planets owned − 1), **+0.5%** per research node completed this run. Total production bonus = level×7% + banked planets×1% + banked research×0.5%. Config: balance.prestigeBonusPerLevel (0.07), prestigePlanetBonusPerPlanet (0.01), prestigeResearchBonusPerNode (0.005).
- **Bonus (click)**: From **Prestige 2** onward, +4% click per level (stacking). Config: prestigeClickBonusPercentPerLevel.
- **UI**: Prestige button and confirm modal in Empire (shows **gain estimate** before reset: breakdown level + planets + research = total %). Strong visual feedback (highlighted gain line, prominent confirm button, toast after prestige). Optional rewards modal lists bonus per level.

## Progression unlocks

- Features unlock when **current coins** (wallet) reach a threshold. Source: [progression.json](../../src/data/progression.json). Schema: [data/progression-schema.md](../data/progression-schema.md).
- Thresholds: Welcome 0, Upgrades 30, Crew 1,500, Research 12,000, Planets & Events 120,000, Quests 250,000, Prestige 5,000,000. Each entry has id, coinsThreshold, title, body, optional sectionId for UI (e.g. scroll target).

## Milestones

- **Toast** when **total coins ever** crosses a threshold. Thresholds from `gameConfig.milestones` (e.g. 500, 5K, 25K … up to 1e15). Display uses compact format (1K, 1M, 1B, etc.). See [reference/progression-curve.md](../reference/progression-curve.md).

## Achievements

- **Source**: [data/achievements.json](../../src/data/achievements.json). Schema: [data/achievements-schema.md](../data/achievements-schema.md).
- Unlock by: totalClicks, upgradesCount, astronautsCount, prestigeLevel, planetsCount, totalCoinsEver, questStreak, questClaimed, comboMaster, totalSlotsGreaterThan, researchNodesUnlocked, shootingStarClicked.
- **Secret** achievements (secret: true) show "???" until unlocked. Shown in the **Achievements** modal (trophy button in header).

## Daily bonus

- **800** coins once per calendar day (gameConfig.dailyBonusCoins). Stored by date (lastDailyBonusKey) so it does not repeat the same day.

## Offline progress

- **Minimum absence**: 1 minute before offline coins apply. Config in SaveLoadService (MIN_OFFLINE_MS).
- **Cap**: Full production rate for up to 12 hours. After 12 h: 80% rate for 12–14 h, then linear decay to 50% at 24 h; beyond 24 h, 50% rate. Applied on load; see [data/save-format.md](../data/save-format.md) and SaveLoadService.

