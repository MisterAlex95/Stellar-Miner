# Research

## Skill tree

- **Source**: [data/research.json](../../src/data/research.json). Schema: [data/research-schema.md](../data/research-schema.md).
- Nodes have **id**, **name**, **cost**, **successChance**, **prerequisites** (array of node ids), **row**, **col** (layout), optional **researchDataCost**, **secret**, and **modifiers** (production %, click %, slot-free/crew-free, expedition/housing bonuses).
- All **prerequisites** must be unlocked before a node can be attempted. Tree is rendered in the Research tab. **Secret** nodes are optional side branches (styled differently).

## Success chance

- **Effective chance** = node.successChance × scientistMultiplier + **partial progress** (from previous failures on this node, capped). Config: researchPartialProgressPerFailure, researchPartialProgressMaxChanceBonus in balance.json.
- **Scientist multiplier** = 1 + min(cap, scientistCount × perScientist). Cap +18%.
- **Pity**: After N failures on the same node (researchPityFailures in balance.json, default 4), the next attempt is **guaranteed success**.
- On **failure**, coins are lost and failure count increments; next attempt has higher chance and **lower cost** (researchCostReductionPerFailure, researchCostMinMultiplier). On success, the node is unlocked and failure count is cleared.

## Modifiers

- **Production / Click**: 1 + sum(productionPercent)/100 and 1 + sum(clickPercent)/100 (stacked). **Branch bonuses**: completing a full branch (e.g. automation → ai-assist → neural-boost) grants extra % (researchBranchBonusProductionPercent, researchBranchBonusClickPercent).
- **Slot-free / crew-free**: Certain upgrades no longer use a slot or require crew.
- **Crew reduction**: Per-upgrade crew requirement reduction.
- **Unlocks crew role**: Unlocks miner, scientist, medic, pilot, or engineer for hire.
- **Expedition**: expeditionDurationPercent (negative = faster expeditions), expeditionDeathChancePercent (negative = safer). Applied in expedition duration and death chance.
- **Housing**: housingCapacityBonus adds flat +N to max crew capacity.

## Progress duration

- After spending coins (and research data if required) to attempt, a **progress bar** runs. **Duration** = base + per-row ms, reduced by scientists (researchDurationBaseMs, researchDurationPerRowMs, researchScientistDurationReductionPerScientist, researchScientistDurationCap in balance.json). Cancel refunds coins.

## Research data and Prestige research points

- **Research data**: Earned from successful expeditions (researchDataPerExpeditionSuccess). Some late nodes require research data in addition to coins (researchDataCost on the node). Resets on Prestige.
- **Prestige research points**: Gained each Prestige (prestigeResearchPointsPerPrestige). Persist across runs. Can be spent for **one guaranteed success** on any attempt (checkbox in UI).

## Reset on prestige

- Unlocked nodes and **research progress** (failure counts, research data) are **reset on Prestige**. **Prestige research points** are **not** reset; they are added to each Prestige.

## Path highlights and milestones

- **Recommended** nodes (up to 3 cheapest expected-cost attemptable nodes) are highlighted. **Milestones**: achievements for 5, 10, 15, 20, and all research nodes unlocked.

## Formulas and full node table

- [reference/research-formulas.md](../reference/research-formulas.md) — formulas and full node catalog table.
