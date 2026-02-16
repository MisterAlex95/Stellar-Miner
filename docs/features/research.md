# Research

## Skill tree

- **Source**: [data/research.json](../../src/data/research.json). Schema: [data/research-schema.md](../data/research-schema.md).
- Nodes have **id**, **name**, **cost**, **successChance**, **prerequisites** (array of node ids), **row**, **col** (layout), and **modifiers** (production %, click %, slot-free/crew-free upgrades, crew reduction, unlocksCrewRole).
- All **prerequisites** must be unlocked before a node can be attempted. Tree is rendered in the Research tab.

## Success chance

- **Effective chance** = node.successChance × scientistMultiplier.
- **Scientist multiplier** = 1 + min(cap, scientistCount × perScientist). Config in balance.json (scientistResearchSuccessPerScientist, scientistResearchSuccessCap); cap +18%.
- On **failure**, coins are lost and the player can retry. On success, the node is unlocked and modifiers apply.

## Modifiers

- **Production**: 1 + sum(productionPercent)/100 (stacked across unlocked nodes).
- **Click**: 1 + sum(clickPercent)/100.
- **Slot-free / crew-free**: Certain upgrades no longer use a slot or require crew (see research.json modifiers).
- **Crew reduction**: Some nodes reduce required crew for specific upgrades (e.g. orbital-station: 1).
- **Unlocks crew role**: Unlocks miner, scientist, medic, pilot, or engineer for hire.

## Progress duration

- After spending coins to attempt, a **progress bar** runs for a fixed duration (2,500 ms) before the attempt is resolved (success or failure). See `RESEARCH_PROGRESS_DURATION_MS` in handlersResearch.ts.

## Reset on prestige

- All research state (unlocked nodes) is **reset on Prestige**. Unlocked node ids are stored in the save for the current run only.

## Formulas and full node table

- [reference/research-formulas.md](../reference/research-formulas.md) — formulas and full node catalog table.
