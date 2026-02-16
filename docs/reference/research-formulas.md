# Stellar Miner — Research (formulas and reference)

Reference for Scientific Research: success chance, progress duration, and full node catalog.

---

## 1. Formulas

### 1.1 Progress duration (UI)

After spending coins to attempt a research, a progress bar runs for a **fixed duration** before the attempt is resolved.

- **Duration**: `2,500 ms` (constant, see `RESEARCH_PROGRESS_DURATION_MS` in `handlersResearch.ts`).

### 1.2 Success chance

Each node has a base **successChance** (0–1). On failure, coins are lost and the player can retry.

- **Effective chance** = `node.successChance × scientistMultiplier`
- **Scientist multiplier** = `1 + min(cap, scientistCount × perScientist)`
- Config (`balance.json`): `scientistResearchSuccessPerScientist: 0.015`, `scientistResearchSuccessCap: 0.18`
- So at most +18% success chance from scientists (e.g. 12 scientists → +18%).

### 1.3 Modifiers (unlocked nodes)

- **Production**: `1 + sum(productionPercent) / 100` (e.g. +5% and +8% → 1.13×)
- **Click**: `1 + sum(clickPercent) / 100`
- **Slot-free upgrades**: certain upgrades no longer use a planet slot (from `slotFreeUpgrades` or `slotReduction`)
- **Crew-free upgrades**: certain upgrades no longer require crew (from `crewFreeUpgrades` or `crewReduction`)

---

## 2. Research node catalog

Data from `src/data/research.json`. Prerequisites and tree layout (row/col) define the skill tree.

| Row | Col | Id                  | Name             | Cost (⬡) | Success | Modifiers (short)                    |
|-----|-----|---------------------|------------------|-----------|--------|--------------------------------------|
| 0   | 0   | mining-theory       | Mining Theory    | 1,800     | 84%    | +5% prod                             |
| 1   | 0   | heavy-equipment     | Heavy Equipment  | 4,500     | 78%    | +8% prod                             |
| 1   | 1   | automation          | Automation       | 4,000     | 80%    | +4% prod, +10% click, slot-free Drill Mk.I |
| 1   | 2   | survey-systems      | Survey Systems   | 4,800     | 78%    | +6% prod, +5% click                  |
| 1   | 3   | basic-refining      | Basic Refining   | 5,500     | 76%    | +7% prod                             |
| 2   | 0   | orbital-engineering | Orbital Engineering | 18,000 | 72%  | +12% prod                            |
| 2   | 1   | deep-extraction     | Deep Extraction  | 17,000    | 73%    | +7% prod, +8% click, slot-free Asteroid Rig |
| 2   | 2   | ai-assist           | AI Assist        | 15,000    | 74%    | +2% prod, +15% click, crew-free Drill Mk.I |
| 2   | 3   | efficiency          | Efficiency       | 15,500    | 73%    | +10% prod, slot-free Drill Mk.II     |
| 2   | 4   | precision-drilling  | Precision Drilling | 16,500  | 72%  | +9% prod, +6% click, crew-free Asteroid Rig, -1 crew Orbital Station |
| 2   | 5   | catalytic-cracking  | Catalytic Cracking | 20,000  | 71%  | +11% prod                            |
| 3   | 0   | quantum-mining      | Quantum Mining   | 82,000    | 65%    | +15% prod, slot-free Deep Core Drill |
| 3   | 1   | void-tech           | Void Tech        | 76,000    | 64%    | +9% prod, +12% click                 |
| 3   | 2   | stellar-harvester   | Stellar Harvester | 72,000  | 66%  | +14% prod, crew-free Deep Core Drill |
| 3   | 3   | neural-boost        | Neural Boost     | 68,000    | 67%    | +5% prod, +18% click, crew-free Drill Mk.II |
| 3   | 4   | refinery-core       | Refinery Core    | 80,000    | 65%    | +16% prod, slot+crew-free Orbital Station |
| 3   | 5   | sensor-arrays       | Sensor Arrays    | 75,000    | 66%    | +10% prod, +10% click, -1 crew Orbital Station |
| 3   | 6   | plasma-smelting     | Plasma Smelting  | 90,000    | 63%    | +18% prod                            |
| 4   | 0   | exo-forging        | Exo Forging      | 360,000   | 48%    | +20% prod                            |
| 4   | 1   | dimensional-mining | Dimensional Mining | 430,000 | 46%  | +25% prod                            |
| 4   | 2   | plasma-catalysis    | Plasma Catalysis | 470,000   | 45%    | +22% prod, +8% click                 |
| 4   | 3   | nexus-research      | Nexus Research   | 400,000   | 46%    | +14% prod, +20% click                |
| 4   | 4   | quantum-sensors    | Quantum Sensors  | 420,000   | 47%    | +14% prod, +14% click                |
| 5   | 0   | singularity-drill   | Singularity Drill | 1,250,000 | 42% | +30% prod                            |
| 5   | 1   | void-forge          | Void Forge       | 1,150,000 | 43%    | +28% prod, +10% click                |
| 5   | 2   | chrono-extraction   | Chrono Extraction | 1,350,000 | 41% | +26% prod, +12% click                |
| 5   | 3   | exo-core            | Exo Core         | 1,200,000 | 42%    | +24% prod, +10% click                |
| 6   | 0   | reality-anchor      | Reality Anchor   | 3,600,000 | 38%    | +35% prod                            |
| 6   | 1   | multiverse-tap      | Multiverse Tap   | 4,000,000 | 37%    | +38% prod, +10% click                |
| 6   | 2   | neural-network      | Neural Network   | 3,400,000 | 39%    | +22% prod, +30% click                |
| 6   | 3   | omega-refinery     | Omega Refinery   | 3,800,000 | 38%    | +36% prod                            |
| 7   | 0   | stellar-engine      | Stellar Engine   | 11,000,000 | 34%  | +45% prod                            |
| 7   | 1   | infinity-loop       | Infinity Loop    | 12,000,000 | 33%  | +48% prod, +15% click                |
| 7   | 2   | cosmic-mind         | Cosmic Mind      | 10,000,000 | 35%  | +26% prod, +40% click                |
| 7   | 3   | singularity-core   | Singularity Core | 11,200,000 | 34% | +42% prod, +18% click                |
| 8   | 0   | architect           | The Architect    | 40,000,000 | 28%   | +55% prod                            |
| 8   | 1   | transcendence       | Transcendence    | 47,000,000 | 26%   | +36% prod, +50% click                |
| 8   | 2   | omega-theory       | Omega Theory     | 43,000,000 | 27%   | +50% prod, +38% click                |

Prerequisites (tree): each node lists `prerequisites` in the JSON; all must be unlocked before the node can be attempted.
