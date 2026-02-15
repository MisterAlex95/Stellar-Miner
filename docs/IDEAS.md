Backlog of gameplay ideas for future features. The first section is in French (original ideas); "Proposed gameplay improvements" at the end lists concrete next steps in English.

---

Mécaniques de Gameplay Innovantes

Système de "Corruption"
Plus tu mines, plus l’univers se corrompt (effets visuels + malus), avec des choix pour la nettoyer ou l’exploiter.

Mini-Jeux Aléatoires
Tous les 5 min, un mini-jeu (QTE, puzzle, dialogue) apparaît pour gagner des bonus.

Astéroïdes "Vivants"
Certains astéroïdes ont des comportements uniques (voraces, reproducteurs, légendaires).

Mode "Bâtisseur"
Construis ta station spatiale en plaçant des modules (réacteurs, labos) pour des bonus passifs.

Astéroïdes Mutants
Après X clics, un astéroïde se transforme en monstre à combattre (mini-QTE).

Événements "Inversion"
Pendant 1 min, cliquer fait perdre des coins, et ne pas cliquer en rapporte.

Astéroïdes "Portails"
Cliquer sur un portail change les règles du jeu (ex. : production x2 mais corruption x3).

Système de "Fusion" d’Upgrades
Combine 2 upgrades pour en créer un plus puissant (risque d’échec).

Mode "Survie"
La production diminue avec le temps, avec des vagues d’ennemis à repousser en cliquant.

💰 Économie et Progression

Marché Noir
Achat d’upgrades piratés (moins chers mais risqués) ou vente de ressources volées.

Système de Prêt Bancaire
Emprunte des coins avec intérêts, ou parie sur des événements aléatoires.

Bourse des Ressources
Les prix des upgrades fluctuent en fonction de l’offre/demande (ex. : robots mineurs plus chers si tout le monde en achète).

Système de "Dettes Karmiques"
Exploiter trop donne une "dette karma" → événement catastrophique si elle dépasse 100%.

Quêtes Aléatoires
"Mine 500 coins en 2 min" ou "Trouve 3 astéroïdes rares" pour des récompenses uniques.

Astéroïdes à Collectionner
Chaque astéroïde a une rareté. Collectionner une série débloque des bonus permanents.

Système de "Dons"
Donne des coins à une "cause spatiale" pour gagner des bonus karmiques (ex. : +1% de production permanente).

Système de Réputation
Tes actions influencent ta réputation (ex. : "destructeur" = malus avec certains PNJ).

👥 Social et Multijoueur

Système de Clans
Rejoins ou crée un clan pour partager des bonus (+10% de production par membre actif).

Événements Communautaires
Tous les joueurs contribuent à un objectif global (ex. : "Miner 1M de coins cette semaine").

Classement en Temps Réel
Affiche les meilleurs scores des joueurs (via Firebase ou localStorage).

Système de Parrainage
Parraine un ami pour gagner 10% de sa production pendant 1h (lui gagne un bonus de départ).

Marché aux Artefacts
Vends/achète des artefacts rares aux autres joueurs via un système d’enchères.

Mode Coopératif
2 joueurs fusionnent leurs productions pendant 5 min pour un bonus commun (+200% de coins).

Prêt entre Joueurs
Prête des coins à d’autres joueurs (avec intérêts) ou emprunte pour accélérer ta progression.

🎨 Narratif et Immersion

Fins Alternatives
Différentes fins selon tes choix (ex. : "Magnat de l’Espace" vs. "Esclave des Aliens").

Arbre de Compétences Morales
Choisis entre des upgrades "éthiques" (+1% de production) ou "immoraux" (+5% mais risque de révolte).

Événements "Boss"
Un astéroïde géant apparaît toutes les heures. Tous les joueurs doivent cliquer dessus pour le détruire.

Saisons Dynamiques
Le jeu change selon des périodes (ex. : "Saison des Météorites" = +50% de coins mais plus d’événements aléatoires).

Customisation Visuelle
Débloque des skins pour ton vaisseau ou tes robots (styles "or", "cyberpunk", "alien").

⚠️ Mécaniques à Risque/Récompense

Astéroïdes Piégés
Certains explosent si tu cliques trop vite → perte de coins ou corruption.

Upgrades "Corrompus"
Moins chers mais avec des effets secondaires aléatoires (ex. : "Robot mineur fantôme" = +10 coins/s mais disparaît après 1 min).

Assurance Bancaire
Paye 10% de plus sur un prêt pour couvrir les risques (ex. : corruption, événements aléatoires).

Parier sur des Événements
Mise des coins sur un événement futur (ex. : "Un astéroïde rare va passer dans 10 min").

Révoltes de Robots
Si tu achètes trop de robots, ils peuvent se rebeller et voler une partie de ta production.

---

## Proposed gameplay improvements (next steps)

Concrete ideas that build on current systems (quests, events, upgrades, prestige). Scope is kept small so they can be implemented incrementally.

**1. Quest types: "Clicks" and "Spend"**

- **Clicks**: "Make 50 clicks in 2 minutes" — rewards active play; reuses combo/click tracking.
- **Spend**: "Spend 1,000 coins in one run" — track `totalSpentThisRun` (reset on prestige), reward big purchases.

**2. Event choice (skip or double)**

- When a random event is about to trigger, show a short choice: "Accept" (normal) or "Skip" (no bonus, no risk). Later: "Double or nothing" (2× effect or cancel).
- Adds a tiny decision without changing balance much.

**3. Prestige milestones with small perks**

- At prestige 5, 10, 25, 50: unlock a small permanent perk (e.g. +1% offline cap, or "first quest of the day gives +10%"). Stored in progression; one perk per milestone keeps it simple.

**4. "Double production" short buff**

- Once per session (or per N hours): button "Overdrive — 2× production for 60 s". Cooldown shown in UI. Gives a burst moment and a reason to stay for one minute.

**5. Upgrade "mastery" or set bonuses**

- When you own at least one of every upgrade in a tier (e.g. all tier 1–3): small bonus (e.g. +2% production). Encourages variety and revisiting early tiers.

**6. Daily / weekly challenges**

- One daily quest (harder than normal, better reward) and one weekly (e.g. "Reach 100k total coins ever" or "Prestige 2 times"). Resets at midnight / week; uses existing quest UI with a "Daily" badge.

**7. Sound and juice on key actions**

- Optional sound on: mine click (soft), upgrade buy, quest claim, prestige, event start. Toggle in settings (sound already exists). One or two subtle effects improve feel.

**8. Event duration visible on first occurrence**

- First time an event type is seen, show a short tooltip: "Meteor Storm: 2× production for 30 s." So players learn what each event does without reading a doc.

**9. "Next upgrade" hint**

- In the upgrade list or in stats: "Next recommended: Drill Mk.I" (cheapest upgrade that increases production the most, or first not owned). Uses existing catalogs and progression.

**10. Soft cap on offline progress**

- Instead of a hard 12 h cap, decay slowly after 12 h (e.g. 80% after 14 h, 50% after 24 h). Rewards coming back without making offline better than active play.

**11. Combo decay indicator**

- Show a small bar or countdown next to the combo that represents the 2.5 s window. So players see when the combo is about to drop and can click to maintain it.

**12. Planet names / themes**

- Unlock a "theme" or rename for a planet at a cost (cosmetic only). Or random adjective + planet name (e.g. "Dust Haven — Prosperous"). Stored in save; no balance change.

Pick 2–3 of these for a first batch; quest types (1), prestige perks (3), and overdrive (4) or mastery (5) are the highest impact for the least scope.

---

## Proposed story / narrative improvements

Ways to add lore and narrative without new domain entities. All data-driven (JSON + application layer + presentation). Fit existing flows: eventBus, handlers, toasts, Stats/Empire tabs.

**1. Event flavor text**

- Add optional `flavor` (or `storySnippet`) to each event in `events.json`. When an event triggers, show that line in the existing toast or a small popup.
- Example: Meteor Storm → "The crew braces as ancient debris rattles the hull—readings show rare minerals in the shower."
- Optional setting to show/hide story toasts.

**2. Codex / Archive**

- Unlockable lore entries (short texts) keyed to achievements, event types seen, planet types discovered, prestige level.
- Data: `data/codex.json` — id, title, body, unlockCondition (e.g. achievement:first-prestige, eventSeen:meteor-storm, prestigeLevel:5).
- Application: codexUnlocks in state/save; on achievement/event/planet/prestige emit, call unlockCodexEntry(id).
- Presentation: "Codex" or "Archive" in Stats or Empire — list unlocked entries, grey out locked ones.

**3. Quest story hooks**

- Keep quest generation as-is; add a pool of one-line intros per quest type.
- Data: e.g. `data/questFlavor.json` — by type (coins, production, upgrade, …) an array of intros.
- In generateQuest(), pick a random intro and prepend to description or pass as storyHook to UI.
- Example: "A stranded freighter needs supplies. Reach 5,000 coins."

**4. Planet discovery log**

- When the player buys a new planet, show a one-line "first contact" flavor.
- Data: in planetAffinity or `discoveryFlavor.json` — discoveryLog (or a few variants) per planet type.
- On planet buy: pick a line by type/name, store on planet or in a discovery log in state/save.
- Presentation: planet card expand or tooltip, or "Discovery log" section: "First landing on [Name]: [flavor]."

**5. Prestige "chapters"**

- Give each prestige level (or every N) a short title or quote.
- Data: `data/prestigeLore.json` — prestigeLevel → title, optional quote.
- Show on prestige confirmation or "You prestiged!" screen, e.g. "Prestige 5 — Veteran of the Belt".

**6. Narrator / ship log toasts**

- One-off lines from "the ship" or "mission control" on milestones (first 1M coins, first prestige, achievement:Legend).
- Data: `data/narrator.json` — list of { trigger, message } (e.g. totalCoinsEver:1000000, prestige:1).
- Application: on eventBus/handlers, check if trigger already shown (narratorShown in state/save); if not, toast and mark shown.

**7. Chronicle (journey log)**

- Append-only log of key first-time moments (first upgrade, first planet, first prestige).
- Application: chronicle array in save — { date, eventId, sentence } per type; one narrative sentence per event.
- Presentation: "Chronicle" or "History" in Stats — scrollable list. E.g. "First Mining Robot deployed.", "First planet discovered: [name]."
- Sentences can be generated from a small template map in code; no new JSON required.

**8. Achievement flavor**

- Add optional `flavor` (or `story`) to each entry in `achievements.json`. When unlocking, show that line in the unlock toast alongside the name.
- Example: Legend → "Your name is spoken in every port on the belt."

**Suggested order to implement**

- Quick win: (1) Event flavor + (8) Achievement flavor — data only + a few lines in existing toasts.
- High impact: (2) Codex — one new data file, one unlock flow, one new view; feed it from achievements, events, planets, prestige.
- Nice touch: (5) Prestige chapters + (6) Narrator toasts — data-driven, small hooks in existing handlers/eventBus.

---

## QOL (Quality of Life) improvements

Small UX wins that make the game nicer to play without new mechanics. Implementation stays in existing layers (presentation + optional application hooks).

**1. Combo decay indicator**

- Show a small progress bar or countdown next to the combo (e.g. "×2.5 · 1.2s") so players see when the 2.5s window is about to expire. Reuse `COMBO_WINDOW_MS` and the existing `combo-indicator--fading` logic; add a thin bar that shrinks over time or a "time left" label.

**2. Event countdown on badge**

- When an event is active, show remaining time on the event badge (e.g. "Meteor Storm ×2 — 18s"). Stats already has `nextEventAt` and event instances; pass `endsAt` to the badge or compute in `eventBadge.ts` and display "X s left".

**3. First-time event tooltip**

- First time an event type is seen, show a short tooltip or toast line: "Meteor Storm: ×2 production for 30 s." Store `eventTypesSeen: string[]` in save or localStorage; on trigger, if new type, show one-line explanation (from `events.json` or strings). Helps players learn what each event does.

**4. Quest claim countdown**

- In Empire, next to the quest Claim button, show "Claim within 4:32" (or a small progress ring) so the 5-minute claim window is visible. Reuse `QUEST_CLAIM_WINDOW_MS` and quest state; update every second when quest is done and not yet claimed.

**5. Raw number on hover (coins / production)**

- When "Compact numbers" is on, show exact value in a tooltip on hover over the coins or production display (e.g. "1,234.56" or full decimal). Presentation-only: add `title` or use existing tooltip div on the stat elements.

**6. Remember Stats chart range**

- Persist the selected chart range ("Recent" vs "Long term") in localStorage (e.g. `stellar-miner-stats-range`). On load, restore selection so returning players don’t have to click every time.

**7. Prestige modal: show new bonus**

- In the prestige confirm modal, add a line: "After Prestige: level X → +Y% production forever." Uses current `prestigeLevel` and the +5% formula; no new domain logic.

**8. Offline recap toast**

- When loading a save and offline progress was applied (e.g. `earnedWhileAway` from SaveLoadService), show a one-time toast: "You earned X coins while away (Y hours)." Data may already be available in load flow; add a toast call when applying offline coins.

**9. Keyboard hint in Mine or Settings**

- In the Mine zone subtitle or in Settings, add a short line: "Space to mine · 1–4 switch tabs." Uses existing strings or new keys; improves discoverability of shortcuts.

**10. Sound volume slider (optional)**

- If sound effects are enabled, add a volume slider (0–100%) in Settings, persisted with the rest. Allows quieter effects without turning them off. Requires `AudioContext` or `HTMLAudioElement` volume when you add sounds.

**Suggested first batch**

- (1) Combo decay, (2) Event countdown on badge, (5) Raw number on hover — all presentation + small application reads; no new domain.
- Then (4) Quest countdown and (6) Remember chart range — still small scope, high perceived value.

---

## Astronauts / Crew — future ideas

Already implemented: professions at hire (miner, scientist, medic, pilot), veterans, morale from housing, expedition medic/pilot effects and default composition. Data model for assigned crew per planet exists; UI not yet.

**1. Assign crew to planets (UI)**

- Use existing `Planet.assignedCrew` and cap: add UI to assign/unassign crew from the free pool to each planet (e.g. +/- on planet card). Optionally add production bonus for assigned crew on that planet’s contribution.

**2. Expedition composition (UI)**

- Let the player choose who goes when launching (e.g. "Send 4: 2 miners, 1 medic, 1 pilot"). Backend already supports `launchExpedition(player, composition)`.

**3. Specialists (one per type)**

- "Promote" one crew to **Specialist** (Miner / Scientist / Medic) for a coin cost. Only one specialist of each type. Miner specialist: +5% production. Scientist: +10% research success. Medic: next expedition has -10% death chance (consumed when expedition launches). Unlock via research or milestone.

**4. Crew required by upgrade tier**

- Some high-tier upgrades could require "at least 1 scientist" or "2 miners" in your crew (not consumed, just a condition). Encourages hiring a mix.

**5. Training / reassign role**

- Spend coins to "retrain" a crew from one role to another. Lets you correct your mix without losing crew.

**Suggested order**

- (1) or (2) — UI only, quick wins.
- (3) Specialists — three promotions, small UI.
- (4) and (5) — optional depth.
