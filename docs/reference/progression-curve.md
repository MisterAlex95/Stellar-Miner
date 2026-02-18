# Stellar Miner — Progression curve and time estimates

Reference for the game's economy: upgrade costs, unlock thresholds, other costs, and rough time-to-reach estimates.

---

## 1. Assumptions for time estimates

- **Click**: 1 coin per click (before prestige and research bonuses).
- **Idle**: time = coins needed ÷ current production (coins/s). No offline cap in the formula.
- **First run**: no prestige bonus, no research, no events. Planet bonus and crew bonus apply when unlocked.
- **"Typical prod"**: approximate production when that milestone is in reach (from upgrades + crew + planets).
- Estimates are **order-of-magnitude** (minutes vs hours vs days), not exact.

### Slot limit (robots / upgrades per planet)

Each planet has a **limited number of upgrade slots**. The first planet starts with **6 slots**. Each upgrade (Mining Robot, Drill, etc.) or each housing module uses one slot. So at the beginning you can place at most **6 upgrades** on your first planet until you add slots to that planet (cost scales with current slot count) or discover new planets (each new planet also has 6 base slots). This cap is why expanding slots and unlocking planets are core progression goals.

---

## 2. Upgrades (cost and production)

Cost for the next copy of an upgrade: **baseCost × 1.19^ownedCount**. Production per upgrade is fixed per type. First tier (Mining Robot) does not use a slot by default.

| Tier | Name             | Base cost (⬡) | Prod (/s) | Crew | Typical time to afford first (idle at prev. prod) |
|------|------------------|---------------|-----------|------|----------------------------------------------------|
| 1    | Mining Robot     | 60            | 0.8       | 0    | ~60 clicks (~1 min active)                         |
| 2    | Drill Mk.I       | 1,800         | 8         | 0    | ~38 min at 0.8/s                                  |
| 3    | Drill Mk.II      | 22,000        | 50        | 1    | ~46 min at 8/s                                    |
| 4    | Asteroid Rig     | 220,000       | 270       | 1    | ~1.2 h at 50/s                                    |
| 5    | Orbital Station  | 2,500,000     | 1,600     | 2    | ~2.5 h at 270/s                                   |
| 6    | Deep Core Drill  | 28,000,000    | 9,500     | 2    | ~4.9 h at 1,600/s                                 |
| 7    | Stellar Harvester| 320,000,000   | 50,000    | 3    | ~9.4 h at 9,500/s                                  |
| 8    | Quantum Extractor| 3,500,000,000 | 312,500   | 3    | ~19 h at 50,000/s                                 |
| 9    | Void Crusher     | 42,000,000,000| 1,875,000 | 4    | ~1.5 d at 312,500/s                                |
| 10   | Nexus Collector  | 550,000,000,000 | 10,937,500| 4    | ~3–4 d at 1,875,000/s                             |

### 2.1 Upgrade install duration

After buying an upgrade it "installs" for a duration before it adds production. Formula (config: `gameConfig.upgrades`):

**Duration (ms) = base × tier^exponent × (1 + costFactor × min(log10Cap, log10(cost)))**

Default: `installDurationBaseMs: 6000`, `installDurationCostFactor: 0.18`, `installDurationTierExponent: 1.4`, `installDurationLog10Cap: 8`.

| Tier | Upgrade            | Base cost (⬡) | log10(cost) | costMult | tier^1.4 | Duration (ms) | Duration  |
|------|--------------------|---------------|-------------|----------|----------|---------------|-----------|
| 1    | Mining Robot       | 60            | 1.78        | 1.31     | 1.00     | 7,800         | ~8 s      |
| 2    | Drill Mk.I         | 1,800         | 3.26        | 1.59     | 2.64     | 25,200        | ~25 s     |
| 3    | Drill Mk.II        | 22,000        | 4.34        | 1.78     | 4.55     | 48,700        | ~49 s     |
| 4    | Asteroid Rig       | 220,000       | 5.34        | 1.96     | 6.96     | 81,900        | ~1m 22s   |
| 5    | Orbital Station    | 2.5 M         | 6.40        | 2.15     | 9.52     | 122,800       | ~2m 03s   |
| 6    | Deep Core Drill    | 28 M          | 7.45        | 2.34     | 12.58    | 176,900       | ~2m 57s   |
| 7    | Stellar Harvester  | 320 M         | 8.51→8      | 2.44     | 16.25    | 237,800       | ~3m 58s   |
| 8    | Quantum Extractor  | 3.5 B         | 9.54→8      | 2.44     | 20.54    | 300,100       | ~5m 00s   |
| 9    | Void Crusher       | 42 B          | 10.62→8     | 2.44     | 21.67    | 317,300       | ~5m 17s   |
| 10   | Nexus Collector    | 550 B         | 11.74→8     | 2.44     | 25.12    | 367,800       | ~6m 08s   |

---

## 3. Progression unlocks (coin threshold)

Unlocks are gated by **current coins** (wallet), not total coins ever. Values from **progression.json**.

| Threshold (⬡) | Feature    | Rough time to reach (first run, mostly idle) |
|----------------|------------|-----------------------------------------------|
| 0              | Welcome    | Start                                         |
| 30             | Upgrades UI| ~30 clicks                                    |
| 1,500          | Crew       | ~30 min at 0.8/s                              |
| 12,000         | Research   | ~4 h at 0.8–8/s                               |
| 120,000        | Planets    | ~4–8 h at 8–42/s                              |
| 120,000        | Events     | Same as planets                               |
| 250,000        | Quests     | ~2–4 h at 42–200/s                            |
| 5,000,000      | Prestige   | ~6–15 h depending on upgrades/crew/planets     |

---

## 4. Other costs (formulas and first values)

### 4.1 Astronauts

- **Formula**: `floor(2,500 × 1.2^count)`. First: 2,500; second: 3,000; third: 3,600; fifth: 5,184.
- **Effect**: +1.5% production per astronaut (stacking).

| # hired | Next cost (⬡) | Idle at 8/s | Idle at 100/s |
|--------|----------------|-------------|---------------|
| 0 → 1  | 2,500          | ~5 min      | ~25 s         |
| 1 → 2  | 3,000          | ~6 min      | ~30 s         |
| 2 → 3  | 3,600          | ~7.5 min    | ~36 s         |
| 4 → 5  | 5,184          | ~11 min     | ~52 s         |

### 4.2 New planet (expedition)

- **Formula**: `floor(120,000 × (count + 1) × 1.28^count)`. First planet (count 0): 120,000; second: 307,200; third: 589,824.
- **Effect**: +4% production per extra planet (first planet is base).

| Planets owned | Cost for next (⬡) | Idle at 500/s | Idle at 2,000/s |
|---------------|--------------------|---------------|-----------------|
| 1             | 120,000            | ~4 min        | ~1 min          |
| 2             | 307,200            | ~10 min       | ~2.5 min        |
| 3             | 589,824            | ~20 min       | ~5 min          |

### 4.3 Add slot (per planet)

- **Formula**: `floor(25,000 × maxSlots^1.38)`, first expansion ×0.82. Base slots = 6.
- Example: 6 → 7 slots ≈ 209,000; 7 → 8 ≈ 293,000.

### 4.4 Housing (per planet)

- **Formula**: `floor(12,000 × 1.26^count)`. First: 12,000; second: 15,120; third: 19,051.
- **Effect**: +2 crew capacity per housing.

---

## 5. Milestones (total coins ever)

Toast milestones use **total coins ever** (lifetime), not current wallet.

| Milestone (⬡) | Display  | Rough time (first run, idle-oriented) |
|----------------|----------|----------------------------------------|
| 100            | 100      | ~2 min at 1/s                          |
| 1,000          | 1K       | ~17 min at 1/s                         |
| 10,000         | 10K      | ~1–2 h at 10–20/s                      |
| 100,000        | 100K     | ~2–3 h at 50–100/s                     |
| 1,000,000      | 1M       | ~4–10 h (first prestige run)           |
| 10,000,000     | 10M      | Post-prestige, ~1–3 h with bonus       |
| 100,000,000    | 100M     | ~5–15 h with prestige + upgrades       |
| 1,000,000,000  | 1B       | ~1–3 d                                 |
| 10^12          | 1T       | Days to weeks                          |
| 10^15          | 1Qa      | Long-term / endgame                    |

---

## 6. Prestige

- **Threshold**: 5,000,000 coins (current wallet).
- **Effect**: Reset run (coins, planets, upgrades, crew, research); keep total coins ever and Prestige level. **Production bonus**: +7% per level (base) + banked +1% per planet discovered at each prestige + banked +0.5% per research node completed at each prestige (permanent, stacking). From Prestige 2 onward, +4% click per level.
- **First prestige**: typically 6–15 h first run (idle + some clicks). Later runs faster due to prestige bonus and knowledge of the curve.

---

## 7. Typical first run (summary)

| Phase              | Coins (order) | Time (rough) | Main action                    |
|--------------------|---------------|--------------|---------------------------------|
| First upgrade      | 60            | <1 min       | Click to 60 (Mining Robot)      |
| First automation   | 60 → 1.8K     | 30–45 min    | Idle 0.8/s, then buy Drill Mk.I |
| Crew + research   | 1.8K → 22K    | 2–4 h        | Hire 1–2, research, more drills |
| Planets            | 22K → 250K    | 2–4 h        | First expedition, more upgrades |
| Quest + grind      | 250K → 5M     | 4–10 h       | Quests, events, full slots      |
| First prestige     | 5M            | —            | Prestige, restart with +7% (level) + planets + research |

*All times are indicative and depend on activity (idle vs active), RNG (events, research), and choices (quests, order of purchases).*
