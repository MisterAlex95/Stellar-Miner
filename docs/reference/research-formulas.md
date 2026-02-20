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
- **Expedition**: duration % and death chance % (negative = faster/safer). **Housing**: +N crew capacity. **Crew**: unlocks roles (miner, scientist, pilot, medic, engineer), retrain.

---

## 2. Research node catalog

Data from `src/data/research.json`. Prerequisites and tree layout (row/col) define the skill tree. Each node has a **branch** (`core`, `crew`, `modules`, `expeditions`). Completing all nodes in a branch grants a small production (and optionally click) bonus.

The tree has 100+ nodes. **Crew**: professions, housing, retrain, plus morale-boost, cross-training, habitat-expansion, leadership, ergonomics, veteran-support, specialist-logistics, crew-sync, fatigue-resistance, elite-recruitment. **Expeditions**: survey-systems through expedition-mastery (signal-boost, life-support, nav-computer, hazard-suits, deep-range-scans, rescue-protocols, mining-protocols, scout-network, emergency-beacon, interstellar-comms, field-surgery). **Modules**: heavy-equipment/automation/solar-optics paths, cryo/magma/gas/geo slot-free or crew reduction, plus many production steps (core-drilling, flux-compression, hyper-drill, quantum-coherence, stellar-tap, void-conduit, omega-matrix, etc.). Full catalog: `src/data/research.json`.

| Row | Col | Id                  | Name               | Cost (⬡)   | Success | Modifiers (short) |
|-----|-----|---------------------|--------------------|-------------|--------|-------------------|
| 0   | 0   | mining-theory       | Mining Theory      | 1,800       | 84%    | +5% prod, Miner   |
| 1   | 0   | basic-refining      | Basic Refining     | 4,500       | 78%    | +4% prod, Medic, exp death −3% |
| 1   | 1   | crew-quarters       | Crew Quarters      | 4,000       | 80%    | +1 housing        |
| 1   | 2   | heavy-equipment     | Heavy Equipment    | 5,000       | 78%    | +8% prod          |
| 1   | 3   | automation          | Automation         | 4,000       | 80%    | +4% prod, +10% click, slot-free Drill Mk.I |
| 1   | 4   | survey-systems      | Survey Systems     | 4,800       | 78%    | +4% prod, +5% click, Scientist, exp duration −5% |
| 2   | 0   | orbital-engineering | Orbital Engineering| 14,000      | 74%    | +8% prod, Pilot   |
| 2   | 1   | efficiency          | Efficiency         | 12,000      | 75%    | +6% prod, Engineer, slot-free Drill Mk.II |
| 2   | 2   | deep-extraction     | Deep Extraction   | 16,000      | 74%    | +7% prod, +8% click, slot-free Asteroid Rig |
| 2   | 3   | ai-assist           | AI Assist          | 15,000      | 74%    | +2% prod, +15% click, crew-free Drill Mk.I |
| 2   | 4   | catalytic-cracking  | Catalytic Cracking | 18,000    | 73%    | +9% prod          |
| 2   | 5   | faster-probes       | Faster Probes      | 8,000       | 77%    | Expedition duration −8% |
| 2   | 6   | survival-training   | Survival Training  | 9,000       | 76%    | Expedition death −5% |
| 3   | 0   | precision-drilling  | Precision Drilling | 22,000      | 72%    | +5% prod, +1 housing, −1 crew Orbital Station |
| 3   | 1   | crew-retraining     | Crew Retraining    | 35,000      | 70%    | Unlocks crew retrain |
| 3   | 2   | quantum-mining      | Quantum Mining     | 72,000      | 66%    | +12% prod, slot-free Deep Core Drill |
| 3   | 3   | neural-boost        | Neural Boost       | 68,000      | 67%    | +5% prod, +18% click, crew-free Drill Mk.II |
| 3   | 4   | refinery-core       | Refinery Core      | 78,000      | 66%    | +14% prod, slot+crew-free Orbital Station |
| 3   | 5   | plasma-smelting     | Plasma Smelting    | 88,000      | 65%    | +16% prod         |
| 3   | 6   | long-range-comms    | Long-Range Comms   | 28,000      | 72%    | Expedition duration −10% |
| 3   | 7   | field-medics        | Field Medics       | 32,000      | 71%    | Expedition death −8% |
| 4   | 0   | veteran-protocols   | Veteran Protocols  | 95,000      | 65%    | +4% prod, +1 housing |
| 4   | 2   | stellar-harvester   | Stellar Harvester  | 70,000      | 66%    | +10% prod, crew-free Deep Core Drill |
| 4   | 3   | void-tech           | Void Tech          | 74,000      | 65%    | +8% prod, +12% click |
| 4   | 4   | sensor-arrays       | Sensor Arrays      | 72,000      | 66%    | +8% prod, +8% click, −1 crew Orbital Station |
| 4   | 5   | exo-forging         | Exo Forging        | 340,000     | 50%    | +18% prod         |
| 4   | 6   | expedition-ai       | Expedition AI      | 85,000      | 64%    | Exp duration −6%, death −4% |
| 5   | 2   | dimensional-mining  | Dimensional Mining | 400,000     | 48%    | +22% prod         |
| 5   | 3   | nexus-research      | Nexus Research     | 380,000     | 48%    | +12% prod, +20% click |
| 5   | 4   | plasma-catalysis    | Plasma Catalysis   | 440,000     | 47%    | +20% prod, +8% click |
| 5   | 5   | quantum-sensors     | Quantum Sensors    | 400,000     | 47%    | +12% prod, +14% click |
| 6   | 2   | singularity-drill   | Singularity Drill  | 1,200,000   | 43%    | +28% prod (3 data) |
| 6   | 3   | void-forge          | Void Forge         | 1,100,000   | 44%    | +26% prod, +10% click |
| 6   | 4   | chrono-extraction   | Chrono Extraction  | 1,280,000   | 42%    | +24% prod, +12% click |
| 6   | 5   | exo-core            | Exo Core           | 1,150,000   | 43%    | +22% prod, +10% click |
| 7   | 2   | reality-anchor      | Reality Anchor     | 3,400,000   | 39%    | +32% prod         |
| 7   | 3   | multiverse-tap      | Multiverse Tap     | 3,800,000   | 38%    | +35% prod, +10% click |
| 7   | 4   | neural-network      | Neural Network     | 3,200,000   | 40%    | +20% prod, +30% click |
| 7   | 5   | omega-refinery      | Omega Refinery     | 3,600,000   | 39%    | +34% prod         |
| 8   | 2   | stellar-engine      | Stellar Engine     | 10,500,000  | 35%    | +42% prod         |
| 8   | 3   | infinity-loop       | Infinity Loop      | 11,500,000  | 34%    | +45% prod, +12% click |
| 8   | 4   | cosmic-mind         | Cosmic Mind        | 9,800,000   | 36%    | +24% prod, +38% click |
| 8   | 5   | singularity-core    | Singularity Core   | 10,800,000  | 35%    | +40% prod, +18% click |
| 9   | 2   | architect           | The Architect      | 38,000,000  | 29%    | +52% prod (5 data) |
| 9   | 3   | transcendence       | Transcendence      | 44,000,000  | 27%    | +34% prod, +48% click |
| 9   | 4   | omega-theory        | Omega Theory       | 40,000,000  | 28%    | +48% prod, +36% click (secret) |

Prerequisites (tree): each node lists `prerequisites` in the JSON; all must be unlocked before the node can be attempted.
