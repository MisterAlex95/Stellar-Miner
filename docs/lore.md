# Lore and narrative

This document defines the **shared universe** (the Stellar Belt) and how **Stellar Miner** uses it. The setting is written so other games can reuse the same world, tone, and phenomena later (e.g. trading, exploration, combat) without being tied to mining mechanics.

Lore copy is data-driven (JSON + strings) and surfaced via toasts, tooltips, modals, Stats/Empire tabs.

---

## Universe: The Stellar Belt (shared IP)

The **Stellar Belt** is a vast, loosely governed frontier: asteroids, debris fields, small planets, and the odd nebula or comet. **Independents** and **corp franchises** operate here—mining, hauling, scouting, running contracts. There’s no single government; for now no major conflict or antagonist—life is precarious but free. A larger war or villain can be added later if a game needs it. **Credits** are the common currency. Hazards (meteor storms, solar flares, ion storms, dust, eclipses) are part of the environment and can affect any operation—mining, travel, comms, or trade—depending on the game.

- **Tone**: Pragmatic, a bit gritty, hopeful enough to keep pushing. Light space-opera, no heavy exposition or melodrama.
- **Scope**: Regional. The belt is “the frontier”; inner systems, core worlds, or other factions can be hinted at (e.g. Mission Control, “the board”, brokers) without being the focus.
- **Reusability**: Another game set in the same universe might cast the player as a trader, a scout, a patrol captain, or something else—same hazards, same vibe, different loop. Shared elements: places, phenomena, credits, tone, and optional terms (crew, outpost, Mission Control) that any title can use or redefine.

---

## Glossary (universe-level, for consistent copy across games)

| Term | Definition (reusable) |
|------|------------------------|
| **Belt** | The Stellar Belt; the frontier region. |
| **Credits** | Universal currency in the belt. |
| **Crew** | People working your operation (miners, pilots, engineers, etc.). |
| **Outpost** | A fixed site you operate from (planet, station, or rock). |
| **Mission Control** | Abstract authority: corp, broker, or “the board”. Contracts and milestones can come from here. |
| **Void** | Empty space; “the void” = the belt between rocks and stations. |
| **Comms** | Communications; blackouts and static are common hazards. |

Terms below are **Stellar Miner–specific**; another game would have its own (e.g. “ship”, “route”, “squad”).

| Term | In Stellar Miner only |
|------|------------------------|
| **Rig** | Your mining setup: drills, modules, processors. |
| **Run** | One play-through between prestiges. |
| **Prestige** | Cashing out and starting a new run with a reputation bonus. |

---

## Phenomena (belt events, reusable in any game)

These are **environmental events** in the Stellar Belt. They can mean different things in different games (e.g. in a trading game: route delay, price spike, or bonus run). In Stellar Miner they temporarily affect production (multiplier + duration).

| Event id | What happens in the belt (flavor — use as-is or adapt) |
|----------|--------------------------------------------------------|
| meteor-storm | The belt rains ore; everything shakes and the counters spike. Strike while the sky burns. |
| solar-flare | Radiation spike from the star. Systems run hot—ride it while it lasts. |
| rich-vein | Sensors light up. A mother lode; the crew whoops over the comms. |
| void-bonus | A rare calm patch in the void. No storms, no interference—steady, quiet yield. |
| lucky-strike | Sometimes the belt just gives. Today the dice roll your way. |
| asteroid-rush | A wave of rock sweeps through. The harvest is good for as long as it lasts. |
| solar-wind | Steady push from the star. Nothing fancy—just a bit more throughput. |
| comet-tail | Ices and dust in the wake. Processors and extractors love the extra feedstock. |
| nebula-bloom | Strange particles drift through. The gear hums a little happier. |
| mining-bonanza | Everything aligns: ore, gear, and crew. The kind of run the old hands tell stories about. |
| dust-storm | Grit in the gears and static on the screens. Output drops until it blows past. |
| solar-eclipse | The star slips behind something big. Power and morale dip in the dim. |
| equipment-malfunction | Something blew—overload or bad luck. Reduced output until the bots patch it. |
| power-drain | Systems are sucking juice; running on fumes for a bit. |
| communications-blackout | No telemetry, no sync with Mission Control. We go blind until the link comes back. |
| debris-field | Navigating junk and old wreckage. Slower going, fewer clean passes. |
| ion-storm | Electromagnetic hell. Systems stutter; we ride it out and hope nothing fries. |

Copy these into `events.json` or strings when implementing T-11 / T-15. For another game, same ids and descriptions can map to different mechanics (e.g. “comms blackout” = no minimap for 30 s).

---

## Stellar Miner: how this game uses the lore

In **Stellar Miner** the player runs a **mining operation** in the belt.

- **Credits** = in-game coins (earn by production, spend on upgrades, crew, research, outposts).
- **Rig** = drills and **modules** (mining robots, refineries, etc.); **planets** are outposts with slots and **planet affinity** (rocky, desert, ice, volcanic, gas).
- **Crew** = astronauts; hired for credits, give production bonus, sent on **expeditions** to unlock new planets. Losses on expeditions are part of the job.
- **Research** = spending credits and time on **nodes**; uncertain progress, permanent production bonuses when done.
- **Quests** = contracts from Mission Control (coin targets, upgrades, events, prestige, etc.); **streak** for extra rewards.
- **Prestige** = cash out, leave the sector (or hand the rig to a partner), start a **new run** with a permanent **reputation bonus**. Prestige level and total credits ever = standing in the belt.

All **phenomena** above apply as random events that multiply production for a duration (see [data/events-schema.md](data/events-schema.md)).

---

## Where lore appears in Stellar Miner (reference)

| Context | Data source | When shown |
|--------|-------------|------------|
| **Events** | `events.json` optional `flavor` | On event trigger (toast); first occurrence can combine effect + lore (T-11) |
| **Achievements** | `achievements.json` optional `flavor` | On unlock toast (T-22) |
| **Quests** | e.g. `questFlavor.json` (future) | One-line intro per quest type (T-17) |
| **Planet discovery** | e.g. `discoveryFlavor.json` or planetAffinity (future) | First time a planet type is bought (T-18) |
| **Prestige** | e.g. `prestigeLore.json` (future) | On prestige confirmation, title/quote per level (T-19) |
| **Narrator / ship log** | e.g. `narrator.json` (future) | One-off toasts on milestones (T-20) |
| **Chronicle** | Generated from templates in code (future) | Stats "Chronicle" — first upgrade, first planet, first prestige (T-21) |
| **Codex / Archive** | e.g. `codex.json` (future) | Unlockable entries by achievement, event seen, planet, prestige (T-16) |

---

## Guidelines for new copy

- **Universe first**: When adding lore that could be reused (events, codex, narrator), phrase it in **universe terms** (belt, credits, crew, void, comms, phenomena) so another game could use the same text with different mechanics.
- **Game-specific when needed**: Stellar Miner–only strings (e.g. “rig”, “prestige”, “mining bonanza”) are fine in this game’s JSON and copy; keep them in the “Stellar Miner” section or clearly scoped.
- **Tone**: Pragmatic, a bit gritty, light space-opera. Avoid heavy exposition or melodrama.
- **Length**: One line for toasts and first-seen tooltips; codex/archive entries can be 1–3 sentences.
- **i18n**: Event and achievement names (and optional flavor) can live in catalogs or JSON; use application strings (e.g. `t(key)`) for UI and shared lore where applicable.

---

## Data and schemas (Stellar Miner)

- Events: [data/events-schema.md](data/events-schema.md) — add optional `flavor` when implementing event lore (T-15).
- Achievements: [data/achievements-schema.md](data/achievements-schema.md) — add optional `flavor` for unlock toasts (T-22).
- First occurrence tooltip: T-11 — mechanic line + optional lore from events or strings.

Narrative-related tasks are tracked in the project kanban (**project/tasks/**).
