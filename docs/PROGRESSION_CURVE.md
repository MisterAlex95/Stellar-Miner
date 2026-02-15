# Stellar Miner — Progression curve and time estimates

Reference for the game’s economy: upgrade costs, unlock thresholds, other costs, and rough time-to-reach estimates.

---

## 1. Assumptions for time estimates

- **Click**: 1 coin per click (before prestige and research bonuses).
- **Idle**: time = coins needed ÷ current production (coins/s). No offline cap in the formula.
- **First run**: no prestige bonus, no research, no events. Planet bonus and crew bonus apply when unlocked.
- **“Typical prod”**: approximate production when that milestone is in reach (from upgrades + crew + planets).
- Estimates are **order-of-magnitude** (minutes vs hours vs days), not exact.

---

## 2. Upgrades (cost and production)

Each tier multiplies cost by ×10 from tier 2 onward. Production scales by ×5 per tier (efficiency decreases at higher tiers).

| Tier | Name             | Cost (⬡)   | Prod (/s) | Cost per 1/s | Crew | Typical time to afford (idle at prev. prod) |
|------|------------------|------------|-----------|--------------|------|----------------------------------------------|
| 1    | Mining Robot     | 25         | 1         | 25           | 0    | ~25 clicks (~30 s active)                    |
| 2    | Drill Mk.I       | 1,000      | 10        | 100          | 1    | ~17 min at 1/s                               |
| 3    | Drill Mk.II      | 10,000     | 50        | 200          | 2    | ~17 min at 10/s                              |
| 4    | Asteroid Rig     | 100,000    | 250       | 400          | 2    | ~33 min at 50/s                              |
| 5    | Orbital Station  | 1,000,000  | 1,250     | 800          | 3    | ~1.1 h at 250/s                              |
| 6    | Deep Core Drill  | 10,000,000 | 6,250     | 1,600        | 3    | ~2.2 h at 1,250/s                            |
| 7    | Stellar Harvester| 100,000,000| 31,250    | 3,200        | 4    | ~4.4 h at 6,250/s                            |
| 8    | Quantum Extractor| 1,000,000,000 | 156,250 | 6,400     | 4    | ~9 h at 31,250/s                             |
| 9    | Void Crusher     | 10,000,000,000 | 781,250 | 12,800   | 5    | ~18 h at 156,250/s                           |
| 10   | Nexus Collector  | 100,000,000,000 | 3,906,250 | 25,600  | 5    | ~1.5 d at 781,250/s                          |

---

## 3. Progression unlocks (coin threshold)

Unlocks are gated by **current coins** (wallet), not total coins ever.

| Threshold (⬡) | Feature    | Rough time to reach (first run, mostly idle) |
|----------------|------------|-----------------------------------------------|
| 0              | Welcome    | Start                                         |
| 15             | Upgrades UI| ~15 clicks                                    |
| 800            | Crew       | ~13 min at 1/s                                |
| 5,000          | Research   | ~1 h at 1–10/s                                |
| 50,000         | Planets    | ~1–2 h at 50–100/s                            |
| 50,000         | Events     | Same as planets                               |
| 100,000        | Quests     | ~2–3 h at 50–100/s                            |
| 1,000,000      | Prestige   | ~3–8 h depending on upgrades/crew/planets     |

---

## 4. Other costs (formulas and first values)

### 4.1 Astronauts

- **Formula**: `floor(1000 × 1.15^count)`. First: 1,000; second: 1,150; third: 1,323; fifth: 1,751.
- **Effect**: +2% production per astronaut (stacking).

| # hired | Next cost (⬡) | Idle at 10/s | Idle at 100/s |
|--------|----------------|--------------|---------------|
| 0 → 1  | 1,000          | ~1.7 min     | ~10 s         |
| 1 → 2  | 1,150          | ~2 min       | ~12 s         |
| 2 → 3  | 1,323          | ~2.2 min     | ~13 s         |
| 4 → 5  | 1,751          | ~3 min       | ~18 s         |

### 4.2 New planet (expedition)

- **Formula**: `floor(50,000 × (count + 1) × 1.2^count)`. First planet (count 0): 50,000; second: 120,000; third: 216,000.
- **Effect**: +5% production per extra planet (first planet is base).

| Planets owned | Cost for next (⬡) | Idle at 500/s | Idle at 2,000/s |
|---------------|--------------------|---------------|-----------------|
| 1             | 50,000             | ~1.7 min      | ~25 s           |
| 2             | 120,000            | ~4 min        | ~1 min          |
| 3             | 216,000            | ~7 min        | ~2 min          |

### 4.3 Add slot (per planet)

- **Formula**: `floor(10,000 × maxSlots^1.3)`, first expansion ×0.85. Base slots = 6.
- Example: 6 → 7 slots ≈ 72,900; 7 → 8 ≈ 97,900.

### 4.4 Housing (per planet)

- **Formula**: `floor(5,000 × 1.2^count)`. First: 5,000; second: 6,000; third: 7,200.
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

- **Threshold**: 1,000,000 coins (current wallet).
- **Effect**: Reset coins and planets; keep total coins ever. +5% production per prestige level (permanent).
- **First prestige**: typically 4–10 h first run (idle + some clicks). Later runs faster due to prestige bonus and knowledge of the curve.

---

## 7. Typical first run (summary)

| Phase              | Coins (order) | Time (rough) | Main action                    |
|--------------------|---------------|--------------|---------------------------------|
| First upgrade      | 25            | &lt;1 min    | Click to 25                     |
| First automation   | 25 → 1K       | 15–20 min    | Idle 1/s, then buy Drill        |
| Crew + research    | 1K → 10K      | 1–2 h        | Hire 1–2, research, more drills |
| Planets            | 10K → 100K    | 1–2 h        | First expedition, more upgrades |
| Quest + grind      | 100K → 1M     | 2–5 h        | Quests, events, full slots     |
| First prestige     | 1M            | —            | Prestige, restart with +5%      |

*All times are indicative and depend on activity (idle vs active), RNG (events, research), and choices (quests, order of purchases).*
