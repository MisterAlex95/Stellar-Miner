# balance.json and gameConfig.json

Reference for economy constants (balance) and timing/storage/combo/quest config (gameConfig). Types and meaning of each group.

**Sources**: `src/data/balance.json`, `src/data/gameConfig.json`. Values are read by `src/domain/constants.ts` (balance) and application code (gameConfig).

---

## balance.json

Economy and game balance constants.

| Key | Type | Description |
|-----|------|-------------|
| newPlanetBaseCost | number | Base cost for first planet (e.g. 120000) |
| newPlanetCostGrowth | number | Exponent growth per planet (e.g. 1.28) |
| expeditionMinAstronauts | number | Min crew for expedition (e.g. 2) |
| expeditionMaxAstronauts | number | Max crew for expedition (e.g. 6) |
| expeditionDeathChance | number | Per-astronaut death chance (e.g. 0.28) |
| expeditionMinDeathChance | number | Minimum death chance (e.g. 0.06) |
| expeditionDurationBaseMs | number | Base duration (ms) |
| expeditionDurationPerPlanetMs | number | Extra ms per planet owned |
| expeditionMedicDeathChanceReductionPerMedic | number | Death chance reduction per medic in composition |
| planetProductionBonus | number | +% production per extra planet (e.g. 0.04 = +4%) |
| prestigeBonusPerLevel | number | +% production per prestige level (e.g. 0.04) |
| prestigeClickBonusPercentPerLevel | number | +% click per prestige level from prestige 2 (e.g. 4) |
| prestigeCoinThreshold | number | Coins required to prestige (e.g. 5000000) |
| defaultBaseSlots | number | Base upgrade slots per planet (e.g. 6) |
| addSlotBaseMultiplier | number | Cost base for add-slot (e.g. 25000) |
| addSlotExponent | number | Cost exponent (e.g. 1.38) |
| addSlotFirstExpansionDiscount | number | Multiplier for first expansion 6→7 (e.g. 0.82) |
| planetNames | string[] | First N planet names (e.g. Titan, Nova Prime, …) |
| astronautProductionBonus | number | +% production per astronaut (e.g. 0.015 = +1.5%) |
| minerProductionBonus | number | Bonus for miner role |
| otherCrewProductionBonus | number | Bonus for non-miner roles |
| veteranProductionBonus | number | Bonus per veteran |
| moraleBonusWhenComfortable | number | Bonus when not overcrowded |
| moraleMalusWhenOvercrowded | number | Malus when over capacity |
| scientistResearchSuccessPerScientist | number | +success per scientist (e.g. 0.015) |
| scientistResearchSuccessCap | number | Cap for scientist bonus (e.g. 0.18) |
| housingAstronautCapacity | number | +crew capacity per housing (e.g. 2) |
| maxAstronautsBase | number | Base max astronauts per planet (e.g. 2) |
| housingBaseCost | number | First housing cost (e.g. 12000) |
| housingCostGrowth | number | Growth per housing on same planet (e.g. 1.26) |
| astronautBaseCost | number | First astronaut cost (e.g. 2500) |
| astronautCostGrowth | number | Growth per astronaut (e.g. 1.2) |

---

## gameConfig.json

### timing

| Key | Type | Description |
|-----|------|-------------|
| saveIntervalMs | number | Auto-save interval (e.g. 3000) |
| eventIntervalMs | number | Target time between events (e.g. 120000) |
| minEventDelayMs | number | Min delay between events |
| firstEventDelayMs | number | Delay before first event after unlock |
| statsHistoryIntervalMs | number | Stats history sample interval |
| statsHistoryMaxPoints | number | Max points (recent) |
| statsLongTermIntervalMs | number | Long-term stats interval |
| statsLongTermMaxPoints | number | Max long-term points |

### storageKeys

Keys for localStorage: totalClicksKey, lastDailyBonusKey, achievementsKey, questStorageKey, milestonesStorageKey, questStreakKey, questLastClaimKey, comboMasterKey, prestigesTodayKey, statsStorageKey, statsHistoryStorageKey.

### combo

| Key | Type | Description |
|-----|------|-------------|
| windowMs | number | Combo window (ms) (e.g. 2400) |
| minClicks | number | Min clicks to get multiplier (e.g. 6) |
| multPerLevel | number | +multiplier per level (e.g. 0.09) |
| maxMult | number | Cap multiplier (e.g. 1.55) |
| names | array | { minMult, name } for tier names (Mega, Legendary, …) |

### lucky

| Key | Type | Description |
|-----|------|-------------|
| luckyClickChance | number | Chance for lucky click |
| luckyMin, luckyMax | number | Lucky multiplier range |
| superLuckyChance | number | Chance for super lucky |
| superLuckyMin, superLuckyMax | number | Super lucky range |
| criticalClickChance | number | Chance for critical |

### quest

| Key | Type | Description |
|-----|------|-------------|
| streakWindowMs | number | Claim window for streak (e.g. 300000 = 5 min) |
| streakBonusPerLevel | number | +reward % per streak level (e.g. 0.12) |
| streakMax | number | Max streak level (e.g. 3) |

### milestones

Array of numbers: total coins ever thresholds that trigger a toast (e.g. 500, 5000, 25e3, … up to 1e15).

### dailyBonusCoins

Number: coins granted once per calendar day (e.g. 800).

### upgrades

| Key | Type | Description |
|-----|------|-------------|
| costMultiplierPerOwned | number | Cost growth per owned (e.g. 1.19) |
| displayCount | number | UI display limit |
| installDurationBaseMs | number | Base install duration |
| installDurationCostFactor | number | Cost factor in duration formula |
| installDurationTierExponent | number | Tier exponent |
| installDurationLog10Cap | number | log10(cost) cap in formula |

### events

| Key | Type | Description |
|-----|------|-------------|
| negativeUnlockAfterTriggers | number | After N events in run, negative events can appear (e.g. 4) |

### upgradeGroups

Array of { label, minTier, maxTier } for UI grouping (e.g. Early 1–3, Mid 4–6, Late 7–10).

### questGeneration

typeWeights (cumulative 0–1), and per-type config: coins (targets, rewardMult, rewardBase), production (targets, rewardMult, rewardBase), upgrade (maxUpgradeIndex, countMin, countMax, rewardCostMult, rewardBase), astronauts (targets, rewardBase, rewardPerTarget), prestige_today, combo_tier, events_triggered, tier1_set. Used by `src/application/quests.ts` to generate quests.
