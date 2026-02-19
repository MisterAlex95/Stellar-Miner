/**
 * Translated catalog content (upgrades, research, events, achievements).
 * Used with getSettings().language. Keys match catalog ids.
 */
import { getSettings } from './gameState.js';
import { UPGRADE_CATALOG, EVENT_CATALOG } from './catalogs.js';
import { RESEARCH_CATALOG } from './research.js';
import { ACHIEVEMENTS } from './achievements.js';

type Lang = 'en' | 'fr';

const upgradeNamesEn: Record<string, string> = {
  'mining-robot': 'Mining Robot',
  'drill-mk1': 'Drill Mk.I',
  'solar-collector': 'Solar Collector',
  'drill-mk2': 'Drill Mk.II',
  'cryo-extractor': 'Cryo Extractor',
  'asteroid-rig': 'Asteroid Rig',
  'magma-pump': 'Magma Pump',
  'orbital-station': 'Orbital Station',
  'gas-siphon': 'Gas Siphon',
  'deep-core-drill': 'Deep Core Drill',
  'geo-drill': 'Geo Drill',
  'stellar-harvester': 'Stellar Harvester',
  'quantum-extractor': 'Quantum Extractor',
  'void-crusher': 'Void Crusher',
  'nexus-collector': 'Nexus Collector',
};

const upgradeDescsEn: Record<string, string> = {
  'mining-robot': 'Basic autonomous miner. Your first step into the belt. Best on rocky terrain.',
  'drill-mk1': 'Cuts through rock and hard crust. Best on rocky and volcanic worlds.',
  'solar-collector': 'Converts sunlight into mining power. Most effective on sun-baked desert worlds.',
  'drill-mk2': 'Heavy-duty drill for extreme terrain. Thrives on volcanic worlds. Requires trained crew.',
  'cryo-extractor': 'Harvests ices and frozen volatiles. Thrives on ice planets.',
  'asteroid-rig': 'Full mining platform for asteroid rock. Best on rocky bodies. Needs a team.',
  'magma-pump': 'Taps molten ore from lava flows. Built for volcanic worlds.',
  'orbital-station': 'Refinery and logistics hub. Most efficient orbiting gas giants. Crew-intensive.',
  'gas-siphon': 'Extracts valuable gases from atmospheres. Best on gas giants.',
  'deep-core-drill': 'Penetrates dense ore layers. Best on rocky planets. Requires specialist crew.',
  'geo-drill': 'Taps geothermal and magma veins. Best on volcanic worlds.',
  'stellar-harvester': 'Harvests rare minerals at scale. Strong on desert and gas giants.',
  'quantum-extractor': 'Ultra-low-temperature extraction. Best on ice worlds. Needs expert crew.',
  'void-crusher': 'Pulverizes the toughest cores. Best on rocky and volcanic. Built for the endgame.',
  'nexus-collector': 'Harvests from multiple dimensions. Works everywhere. The ultimate module. Full crew required.',
};

const upgradeNamesFr: Record<string, string> = {
  'mining-robot': 'Robot minier',
  'drill-mk1': 'Foreuse Mk.I',
  'solar-collector': 'Collecteur solaire',
  'drill-mk2': 'Foreuse Mk.II',
  'cryo-extractor': 'Extracteur cryo',
  'asteroid-rig': 'Plateforme astéroïde',
  'magma-pump': 'Pompe à magma',
  'orbital-station': 'Station orbitale',
  'gas-siphon': 'Siphon à gaz',
  'deep-core-drill': 'Foreuse noyau profond',
  'geo-drill': 'Foreuse géo',
  'stellar-harvester': 'Moissonneur stellaire',
  'quantum-extractor': 'Extracteur quantique',
  'void-crusher': 'Broyeur du vide',
  'nexus-collector': 'Collecteur Nexus',
};

const upgradeDescsFr: Record<string, string> = {
  'mining-robot': 'Mineur autonome de base. Votre premier pas dans la ceinture. Efficace sur terrain rocheux.',
  'drill-mk1': 'Traverse roche et croûte dure. Meilleur sur mondes rocheux et volcaniques.',
  'solar-collector': 'Convertit la lumière en énergie minière. Plus efficace sur les mondes désertiques.',
  'drill-mk2': 'Foreuse pour terrains extrêmes. Idéale sur mondes volcaniques. Nécessite un équipage formé.',
  'cryo-extractor': 'Récolte glaces et volatils. Idéal sur les planètes de glace.',
  'asteroid-rig': "Plateforme pour roche d'astéroïdes. Meilleure sur corps rocheux. Nécessite une équipe.",
  'magma-pump': 'Pompe le minerai en fusion. Conçu pour les mondes volcaniques.',
  'orbital-station': 'Raffinerie et logistique. Plus efficace en orbite des géantes gazeuses.',
  'gas-siphon': 'Extrait les gaz précieux des atmosphères. Meilleur sur les géantes gazeuses.',
  'deep-core-drill': 'Pénètre les couches denses. Meilleur sur planètes rocheuses. Équipage spécialisé.',
  'geo-drill': 'Exploite géothermie et veines de magma. Meilleur sur mondes volcaniques.',
  'stellar-harvester': 'Récolte de minéraux rares à grande échelle. Fort sur désert et géantes gazeuses.',
  'quantum-extractor': 'Extraction ultra-basse température. Meilleur sur mondes de glace. Équipage expert.',
  'void-crusher': 'Pulvérise les noyaux les plus durs. Meilleur sur rocheux et volcaniques. Fin de partie.',
  'nexus-collector': 'Récolte multidimensionnelle. Efficace partout. Module ultime.',
};

const researchNamesEn: Record<string, string> = {
  'mining-theory': 'Mining Theory',
  'heavy-equipment': 'Heavy Equipment',
  'automation': 'Automation',
  'survey-systems': 'Survey Systems',
  'basic-refining': 'Basic Refining',
  'orbital-engineering': 'Orbital Engineering',
  'deep-extraction': 'Deep Extraction',
  'ai-assist': 'AI Assist',
  'efficiency': 'Efficiency',
  'precision-drilling': 'Precision Drilling',
  'catalytic-cracking': 'Catalytic Cracking',
  'quantum-mining': 'Quantum Mining',
  'void-tech': 'Void Tech',
  'stellar-harvester': 'Stellar Harvester',
  'neural-boost': 'Neural Boost',
  'refinery-core': 'Refinery Core',
  'sensor-arrays': 'Sensor Arrays',
  'plasma-smelting': 'Plasma Smelting',
  'exo-forging': 'Exo Forging',
  'dimensional-mining': 'Dimensional Mining',
  'plasma-catalysis': 'Plasma Catalysis',
  'nexus-research': 'Nexus Research',
  'quantum-sensors': 'Quantum Sensors',
  'singularity-drill': 'Singularity Drill',
  'void-forge': 'Void Forge',
  'chrono-extraction': 'Chrono Extraction',
  'exo-core': 'Exo Core',
  'reality-anchor': 'Reality Anchor',
  'multiverse-tap': 'Multiverse Tap',
  'neural-network': 'Neural Network',
  'omega-refinery': 'Omega Refinery',
  'stellar-engine': 'Stellar Engine',
  'infinity-loop': 'Infinity Loop',
  'cosmic-mind': 'Cosmic Mind',
  'singularity-core': 'Singularity Core',
  'architect': 'The Architect',
  'transcendence': 'Transcendence',
  'omega-theory': 'Omega Theory',
};

const researchDescsEn: Record<string, string> = {
  'mining-theory': 'Basic extraction principles. Foundation of all research.',
  'heavy-equipment': 'Heavy-duty drills and rigs. More raw output.',
  'automation': 'Automated systems. Better click yield.',
  'survey-systems': 'Prospecting and mapping. Better discovery rates.',
  'basic-refining': 'On-site ore processing. Steady production gain.',
  'orbital-engineering': 'Station and platform tech. Big production boost.',
  'deep-extraction': 'Core drilling. Balanced production and click.',
  'ai-assist': 'AI-augmented clicks. Strong click bonus.',
  'efficiency': 'Energy and process optimization. Production focus.',
  'precision-drilling': 'Targeted extraction. Less waste, more yield.',
  'catalytic-cracking': 'Advanced chemistry. Higher throughput.',
  'quantum-mining': 'Advanced harvesting. Major production.',
  'void-tech': 'Near-instant processing. Production and click.',
  'stellar-harvester': 'Sector-scale operations. Huge production.',
  'neural-boost': 'Crew neural interfaces. Click and production.',
  'refinery-core': 'Ultra-efficient refineries. Production only.',
  'sensor-arrays': 'Multi-spectrum detection. Better targeting.',
  'plasma-smelting': 'Extreme heat processing. Massive output.',
  'exo-forging': 'Exotic material synthesis. Huge production leap.',
  'dimensional-mining': 'Harvest across dimensions. Ultimate production.',
  'plasma-catalysis': 'Reaction acceleration. Extreme throughput.',
  'nexus-research': 'Unified theory. Massive all-around bonus.',
  'quantum-sensors': 'Entanglement-based detection. Peak efficiency.',
  'singularity-drill': 'Micro black-hole extraction. Legendary production.',
  'void-forge': 'Matter from nothing. Reality-bending output.',
  'chrono-extraction': 'Temporal mining. Harvest across time.',
  'exo-core': 'Stable exotic matter. Foundation for endgame.',
  'reality-anchor': 'Stabilize unstable yields. Massive gains.',
  'multiverse-tap': 'Draw from parallel realities. Ultimate scale.',
  'neural-network': 'Crew-wide cognition. Click and production surge.',
  'omega-refinery': 'Final-stage processing. Nothing wasted.',
  'stellar-engine': 'Harness star power. God-tier production.',
  'infinity-loop': 'Self-sustaining cascade. Exponential growth.',
  'cosmic-mind': 'Transcendent awareness. All bonuses maximized.',
  'singularity-core': 'Unified field tech. Peak everything.',
  'architect': 'Design reality itself. Ultimate research.',
  'transcendence': 'Beyond matter. Pure potential.',
  'omega-theory': 'The final equation. All bonuses combined.',
};

const researchDescsFr: Record<string, string> = {
  'mining-theory': 'Principes d’extraction de base. Fondement de toute recherche.',
  'heavy-equipment': 'Foreuses et plateformes lourdes. Plus de rendement brut.',
  'automation': 'Systèmes automatisés. Meilleur rendement au clic.',
  'survey-systems': 'Prospection et cartographie. Meilleurs taux de découverte.',
  'basic-refining': 'Traitement du minerai sur site. Gain de production régulier.',
  'orbital-engineering': 'Technologie des stations. Gros bonus de production.',
  'deep-extraction': 'Forage en profondeur. Production et clic équilibrés.',
  'ai-assist': 'Clics assistés par IA. Fort bonus au clic.',
  'efficiency': 'Optimisation énergie et procédés. Focus production.',
  'precision-drilling': 'Extraction ciblée. Moins de gaspillage.',
  'catalytic-cracking': 'Chimie avancée. Débit accru.',
  'quantum-mining': 'Récolte avancée. Production majeure.',
  'void-tech': 'Traitement quasi instantané. Production et clic.',
  'stellar-harvester': 'Opérations à l’échelle du secteur. Énorme production.',
  'neural-boost': 'Interfaces neurales équipage. Clic et production.',
  'refinery-core': 'Raffineries ultra-efficaces. Production uniquement.',
  'sensor-arrays': 'Détection multi-spectre. Meilleure ciblage.',
  'plasma-smelting': 'Traitement à chaleur extrême. Production massive.',
  'exo-forging': 'Synthèse de matériaux exotiques. Bond de production.',
  'dimensional-mining': 'Récolte multidimensionnelle. Production ultime.',
  'plasma-catalysis': 'Accélération des réactions. Débit extrême.',
  'nexus-research': 'Théorie unifiée. Énorme bonus global.',
  'quantum-sensors': 'Détection par intrication. Efficacité maximale.',
  'singularity-drill': 'Extraction micro trou noir. Production légendaire.',
  'void-forge': 'Matière à partir de rien. Production déformante.',
  'chrono-extraction': 'Mining temporel. Récolte à travers le temps.',
  'exo-core': 'Matière exotique stable. Base de fin de partie.',
  'reality-anchor': 'Stabilise les rendements instables. Gains massifs.',
  'multiverse-tap': 'Puiser dans les réalités parallèles. Échelle ultime.',
  'neural-network': 'Cognition à l’échelle de l’équipage. Clic et production.',
  'omega-refinery': 'Traitement final. Rien de gaspillé.',
  'stellar-engine': 'Exploitation de la puissance stellaire. Production maximale.',
  'infinity-loop': 'Cascade auto-entretenue. Croissance exponentielle.',
  'cosmic-mind': 'Conscience transcendante. Tous les bonus maximisés.',
  'singularity-core': 'Technologie de champ unifié. Tout au maximum.',
  'architect': 'Concevoir la réalité. Recherche ultime.',
  'transcendence': 'Au-delà de la matière. Potentiel pur.',
  'omega-theory': 'L’équation finale. Tous les bonus combinés.',
};

const eventNamesEn: Record<string, string> = {
  'meteor-storm': 'Meteor Storm',
  'solar-flare': 'Solar Flare',
  'rich-vein': 'Rich Vein',
  'void-bonus': 'Void Bonus',
  'lucky-strike': 'Lucky Strike',
  'asteroid-rush': 'Asteroid Rush',
  'solar-wind': 'Solar Wind',
  'comet-tail': 'Comet Tail',
  'nebula-bloom': 'Nebula Bloom',
  'dust-storm': 'Dust Storm',
  'solar-eclipse': 'Solar Eclipse',
  'equipment-malfunction': 'Equipment Malfunction',
  'power-drain': 'Power Drain',
  'communications-blackout': 'Communications Blackout',
  'debris-field': 'Debris Field',
  'mining-bonanza': 'Mining Bonanza',
  'ion-storm': 'Ion Storm',
};

const eventNamesFr: Record<string, string> = {
  'meteor-storm': 'Tempête de météores',
  'solar-flare': 'Éruption solaire',
  'rich-vein': 'Veine riche',
  'void-bonus': 'Bonus du vide',
  'lucky-strike': 'Coup de chance',
  'asteroid-rush': 'Ruée d’astéroïdes',
  'solar-wind': 'Vent solaire',
  'comet-tail': 'Queue de comète',
  'nebula-bloom': 'Floraison nébuleuse',
  'dust-storm': 'Tempête de poussière',
  'solar-eclipse': 'Éclipse solaire',
  'equipment-malfunction': 'Panne d’équipement',
  'power-drain': 'Drainage d’énergie',
  'communications-blackout': 'Black-out des communications',
  'debris-field': 'Champ de débris',
  'mining-bonanza': 'Bonne mine',
  'ion-storm': 'Tempête ionique',
};

const eventFlavorEn: Record<string, string> = {
  'meteor-storm': 'The belt rains ore—strike while the sky burns.',
  'solar-flare': 'Radiation spike from the star. Ride it while it lasts.',
  'rich-vein': 'Sensors light up. A mother lode; the crew whoops over the comms.',
  'void-bonus': 'A rare calm patch in the void. Steady, quiet yield.',
  'lucky-strike': 'Sometimes the belt just gives. Today the dice roll your way.',
  'asteroid-rush': 'A wave of rock sweeps through. The harvest is good for as long as it lasts.',
  'solar-wind': 'Steady push from the star. Nothing fancy—just a bit more throughput.',
  'comet-tail': 'Ices and dust in the wake. Processors and extractors love the extra feedstock.',
  'nebula-bloom': 'Strange particles drift through. The gear hums a little happier.',
  'mining-bonanza': 'Everything aligns: ore, gear, and crew. The kind of run the old hands tell stories about.',
  'dust-storm': 'Grit in the gears and static on the screens. Output drops until it blows past.',
  'solar-eclipse': 'The star slips behind something big. Power and morale dip in the dim.',
  'equipment-malfunction': 'Something blew—overload or bad luck. Reduced output until the bots patch it.',
  'power-drain': 'Systems are sucking juice; running on fumes for a bit.',
  'communications-blackout': 'No telemetry, no sync with Mission Control. We go blind until the link comes back.',
  'debris-field': 'Navigating junk and old wreckage. Slower going, fewer clean passes.',
  'ion-storm': 'Electromagnetic hell. Systems stutter; we ride it out and hope nothing fries.',
};

const eventFlavorFr: Record<string, string> = {
  'meteor-storm': "La ceinture pleut du minerai—frappez tant que le ciel brûle.",
  'solar-flare': "Pic de radiation de l'étoile. Profitez-en tant que ça dure.",
  'rich-vein': "Les capteurs s'allument. Un filon mère; l'équipage exulte sur les comms.",
  'void-bonus': 'Une rare accalmie dans le vide. Rendement stable et silencieux.',
  'lucky-strike': "Parfois la ceinture donne. Aujourd'hui les dés roulent pour vous.",
  'asteroid-rush': 'Une vague de roche déferle. La moisson est bonne tant que ça dure.',
  'solar-wind': "Poussée régulière de l'étoile. Rien de fou—un peu plus de débit.",
  'comet-tail': 'Glaces et poussière dans le sillage. Les processeurs adorent la matière en plus.',
  'nebula-bloom': "Des particules étranges dérivent. L'équipement ronronne un peu plus.",
  'mining-bonanza': "Tout s'aligne: minerai, équipement, équipage. Le genre de run dont on parle.",
  'dust-storm': "Grains dans les engrenages et neige sur les écrans. Baisse de rendement jusqu'à ce que ça passe.",
  'solar-eclipse': "L'étoile passe derrière quelque chose de gros. Énergie et moral en baisse.",
  'equipment-malfunction': "Quelque chose a lâché—surcharge ou malchance. Rendement réduit jusqu'au dépannage.",
  'power-drain': 'Les systèmes pompent le jus; on tourne sur les réserves un moment.',
  'communications-blackout': "Plus de télémétrie, plus de sync avec le centre. On est aveugles jusqu'au retour du lien.",
  'debris-field': "Navigation dans les débris et l'épave. Moins vite, moins de passes propres.",
  'ion-storm': 'Enfer électromagnétique. Les systèmes hoquettent; on tient bon et on espère que rien ne grille.',
};

const achievementNamesEn: Record<string, string> = {
  'first-click': 'First steps',
  'clicks-100': 'Clicker',
  'clicks-1k': 'Dedicated miner',
  'clicks-10k': 'Persistent',
  'clicks-50k': 'Relentless',
  'clicks-100k': 'Unstoppable clicks',
  'first-upgrade': 'Automation',
  'upgrades-10': 'Expansion',
  'upgrades-25': 'Factory',
  'upgrades-50': 'Megacorp',
  'upgrades-100': 'Industrial',
  'first-astronaut': 'Crew recruit',
  'astronauts-5': 'Squad',
  'astronauts-20': 'Fleet',
  'first-prestige': 'Rebirth',
  'prestige-5': 'Veteran',
  'prestige-10': 'Legend',
  'prestige-15': 'Ascendant',
  'prestige-25': 'Void walker',
  'planets-3': 'Multi-world',
  'planets-10': 'Empire',
  'coins-50k': 'Getting there',
  'coins-500k': 'Wealthy',
  'coins-10m': 'Millionaire',
  'coins-1b': 'Tycoon',
  'quest-streak-3': 'Quest master',
  'first-quest': 'First quest',
  'combo-master': 'Combo master',
  'first-slot': 'Expander',
  'speed-run': 'Speed run',
  'research-5': 'Researcher',
  'research-10': 'Scientist',
  'research-15': 'Lead scientist',
  'research-20': 'Lab director',
  'research-full': 'Lab complete',
  'shooting-star': 'Wish upon a star',
};

const achievementNamesFr: Record<string, string> = {
  'first-click': 'Premiers pas',
  'clicks-100': 'Cliqueur',
  'clicks-1k': 'Mineur dévoué',
  'clicks-10k': 'Persistant',
  'clicks-50k': 'Acharné',
  'clicks-100k': 'Clics imparable',
  'first-upgrade': 'Automatisation',
  'upgrades-10': 'Expansion',
  'upgrades-25': 'Usine',
  'upgrades-50': 'Megacorp',
  'upgrades-100': 'Industriel',
  'first-astronaut': 'Recrue',
  'astronauts-5': 'Équipe',
  'astronauts-20': 'Flotte',
  'first-prestige': 'Renaissance',
  'prestige-5': 'Vétéran',
  'prestige-10': 'Légende',
  'prestige-15': 'Ascendant',
  'prestige-25': 'Marcheur du vide',
  'planets-3': 'Multi-mondes',
  'planets-10': 'Empire',
  'coins-50k': 'En chemin',
  'coins-500k': 'Riche',
  'coins-10m': 'Millionnaire',
  'coins-1b': 'Magnat',
  'quest-streak-3': 'Maître des quêtes',
  'first-quest': 'Première quête',
  'combo-master': 'Maître du combo',
  'first-slot': 'Expansion',
  'speed-run': 'Course rapide',
  'research-5': 'Chercheur',
  'research-10': 'Scientifique',
  'research-15': 'Chef de labo',
  'research-20': 'Directeur de labo',
  'research-full': 'Labo complet',
  'shooting-star': 'Un vœu sur une étoile',
};

const achievementDescsEn: Record<string, string> = {
  'first-click': 'Perform your first mine click.',
  'clicks-100': 'Reach 100 total clicks.',
  'clicks-1k': 'Reach 1,000 total clicks.',
  'clicks-10k': 'Reach 10,000 total clicks.',
  'clicks-50k': 'Reach 50,000 total clicks.',
  'clicks-100k': 'Reach 100,000 total clicks.',
  'first-upgrade': 'Buy your first upgrade.',
  'upgrades-10': 'Own 10 upgrades.',
  'upgrades-25': 'Own 25 upgrades.',
  'upgrades-50': 'Own 50 upgrades.',
  'upgrades-100': 'Own 100 upgrades.',
  'first-astronaut': 'Hire your first astronaut.',
  'astronauts-5': 'Have 5 astronauts.',
  'astronauts-20': 'Have 20 astronauts.',
  'first-prestige': 'Prestige once.',
  'prestige-5': 'Reach prestige level 5.',
  'prestige-10': 'Reach prestige level 10.',
  'prestige-15': 'Reach prestige level 15.',
  'prestige-25': 'Reach prestige level 25 (secret).',
  'planets-3': 'Discover 3 planets.',
  'planets-10': 'Discover 10 planets.',
  'coins-50k': 'Earn 50K total coins ever.',
  'coins-500k': 'Earn 500K total coins ever.',
  'coins-10m': 'Earn 10M total coins ever.',
  'coins-1b': 'Earn 1B total coins ever.',
  'quest-streak-3': 'Reach a quest streak of 3.',
  'first-quest': 'Claim your first quest.',
  'combo-master': 'Reach max combo multiplier (secret).',
  'first-slot': 'Have more than 6 total upgrade slots.',
  'speed-run': 'Earn 2M total coins ever (secret).',
  'research-5': 'Unlock 5 research nodes.',
  'research-10': 'Unlock 10 research nodes.',
  'research-15': 'Unlock 15 research nodes.',
  'research-20': 'Unlock 20 research nodes.',
  'research-full': 'Unlock all research nodes (secret).',
  'shooting-star': 'Click a shooting star in the mine zone.',
};

const achievementDescsFr: Record<string, string> = {
  'first-click': 'Effectuez votre premier clic de mine.',
  'clicks-100': 'Atteignez 100 clics au total.',
  'clicks-1k': 'Atteignez 1 000 clics au total.',
  'clicks-10k': 'Atteignez 10 000 clics au total.',
  'clicks-50k': 'Atteignez 50 000 clics au total.',
  'clicks-100k': 'Atteignez 100 000 clics au total.',
  'first-upgrade': 'Achetez votre premier upgrade.',
  'upgrades-10': 'Possédez 10 upgrades.',
  'upgrades-25': 'Possédez 25 upgrades.',
  'upgrades-50': 'Possédez 50 upgrades.',
  'upgrades-100': 'Possédez 100 upgrades.',
  'first-astronaut': 'Recrutez votre premier astronaute.',
  'astronauts-5': 'Ayez 5 astronautes.',
  'astronauts-20': 'Ayez 20 astronautes.',
  'first-prestige': 'Prestige une fois.',
  'prestige-5': 'Atteignez le niveau de prestige 5.',
  'prestige-10': 'Atteignez le niveau de prestige 10.',
  'prestige-15': 'Atteignez le niveau de prestige 15.',
  'prestige-25': 'Atteignez le niveau de prestige 25 (secret).',
  'planets-3': 'Découvrez 3 planètes.',
  'planets-10': 'Découvrez 10 planètes.',
  'coins-50k': 'Gagnez 50K pièces au total.',
  'coins-500k': 'Gagnez 500K pièces au total.',
  'coins-10m': 'Gagnez 10M pièces au total.',
  'coins-1b': 'Gagnez 1B pièces au total.',
  'quest-streak-3': 'Atteignez une série de 3 quêtes.',
  'first-quest': 'Validez votre première quête.',
  'combo-master': 'Atteignez le multiplicateur de combo max (secret).',
  'first-slot': 'Avoir plus de 6 emplacements d’upgrade au total.',
  'speed-run': 'Gagnez 2M pièces au total (secret).',
  'research-5': 'Débloquez 5 nœuds de recherche.',
  'research-10': 'Débloquez 10 nœuds de recherche.',
  'research-15': 'Débloquez 15 nœuds de recherche.',
  'research-20': 'Débloquez 20 nœuds de recherche.',
  'research-full': 'Débloquez tous les nœuds de recherche (secret).',
  'shooting-star': 'Cliquez sur une étoile filante dans la zone de mine.',
};

const comboNamesEn: Record<string, string> = {
  mega: 'Mega',
  legendary: 'Legendary',
  unstoppable: 'Unstoppable',
  onFire: 'On fire',
  hot: 'Hot',
  combo: 'Combo',
};

const comboNamesFr: Record<string, string> = {
  mega: 'Méga',
  legendary: 'Légendaire',
  unstoppable: 'Imparable',
  onFire: 'En feu',
  hot: 'Chaud',
  combo: 'Combo',
};

const planetNamesEn = ['Titan', 'Nova Prime', 'Dust Haven', 'Iron Vein', 'Crimson Drift', 'Frost Ring', 'Solar Forge', "Void's Edge", 'Stellar Rest', 'Last Light'];
const planetNamesFr = ['Titan', 'Nova Prime', 'Dust Haven', 'Iron Vein', 'Crimson Drift', 'Frost Ring', 'Forge solaire', 'Bord du vide', 'Repos stellaire', 'Dernière lueur'];

const upgradeGroupLabelsEn: Record<string, string> = { Early: 'Early', Mid: 'Mid', Late: 'Late' };
const upgradeGroupLabelsFr: Record<string, string> = { Early: 'Début', Mid: 'Milieu', Late: 'Fin' };

function lang(): Lang {
  return getSettings().language ?? 'en';
}

export function getCatalogUpgradeName(id: string): string {
  const names = lang() === 'fr' ? upgradeNamesFr : upgradeNamesEn;
  return names[id] ?? UPGRADE_CATALOG.find((d) => d.id === id)?.name ?? id;
}

export function getCatalogUpgradeDesc(id: string): string {
  const descs = lang() === 'fr' ? upgradeDescsFr : upgradeDescsEn;
  return descs[id] ?? UPGRADE_CATALOG.find((d) => d.id === id)?.description ?? '';
}

const researchNamesFr: Record<string, string> = {
  'mining-theory': 'Théorie minière',
  'heavy-equipment': 'Équipement lourd',
  'automation': 'Automatisation',
  'survey-systems': 'Systèmes de prospection',
  'basic-refining': 'Raffinage de base',
  'orbital-engineering': 'Ingénierie orbitale',
  'deep-extraction': 'Extraction profonde',
  'ai-assist': 'Assistance IA',
  'efficiency': 'Efficacité',
  'precision-drilling': 'Forage de précision',
  'catalytic-cracking': 'Craquage catalytique',
  'quantum-mining': 'Mining quantique',
  'void-tech': 'Technologie du vide',
  'stellar-harvester': 'Moissonneur stellaire',
  'neural-boost': 'Boost neural',
  'refinery-core': 'Cœur de raffinerie',
  'sensor-arrays': 'Réseaux de capteurs',
  'plasma-smelting': 'Fusion plasma',
  'exo-forging': 'Forge exo',
  'dimensional-mining': 'Mining dimensionnel',
  'plasma-catalysis': 'Catalyse plasma',
  'nexus-research': 'Recherche Nexus',
  'quantum-sensors': 'Capteurs quantiques',
  'singularity-drill': 'Foreuse singularité',
  'void-forge': 'Forge du vide',
  'chrono-extraction': 'Extraction chrono',
  'exo-core': 'Cœur exo',
  'reality-anchor': 'Ancre de réalité',
  'multiverse-tap': 'Puisement multivers',
  'neural-network': 'Réseau neuronal',
  'omega-refinery': 'Raffinerie Oméga',
  'stellar-engine': 'Moteur stellaire',
  'infinity-loop': 'Boucle infinie',
  'cosmic-mind': 'Esprit cosmique',
  'singularity-core': 'Cœur de singularité',
  'architect': 'L’Architecte',
  'transcendence': 'Transcendance',
  'omega-theory': 'Théorie Oméga',
};

export function getCatalogResearchName(id: string): string {
  const names = lang() === 'fr' ? researchNamesFr : researchNamesEn;
  return names[id] ?? RESEARCH_CATALOG.find((n) => n.id === id)?.name ?? id;
}

export function getCatalogResearchDesc(id: string): string {
  const descs = lang() === 'fr' ? researchDescsFr : researchDescsEn;
  return descs[id] ?? RESEARCH_CATALOG.find((n) => n.id === id)?.description ?? '';
}

export function getCatalogEventName(id: string): string {
  const names = lang() === 'fr' ? eventNamesFr : eventNamesEn;
  const fallback = EVENT_CATALOG.find((e) => e.id === id)?.name ?? id;
  return names[id] ?? fallback;
}

/** Optional one-line lore for events (first-time toast). Empty string if none. */
export function getEventFlavor(eventId: string): string {
  const flavors = lang() === 'fr' ? eventFlavorFr : eventFlavorEn;
  return flavors[eventId] ?? '';
}

export function getCatalogAchievementName(id: string): string {
  const names = lang() === 'fr' ? achievementNamesFr : achievementNamesEn;
  return names[id] ?? ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id;
}

export function getCatalogAchievementDesc(id: string): string {
  const descs = lang() === 'fr' ? achievementDescsFr : achievementDescsEn;
  return descs[id] ?? '';
}

/** Combo tier key from mult (e.g. 1.6 -> mega). */
export function getCatalogComboName(mult: number): string {
  const keys: { minMult: number; key: string }[] = [
    { minMult: 1.6, key: 'mega' },
    { minMult: 1.5, key: 'legendary' },
    { minMult: 1.4, key: 'unstoppable' },
    { minMult: 1.3, key: 'onFire' },
    { minMult: 1.2, key: 'hot' },
    { minMult: 1.1, key: 'combo' },
  ];
  const names = lang() === 'fr' ? comboNamesFr : comboNamesEn;
  for (const t of keys) {
    if (mult >= t.minMult) return names[t.key] ?? 'Combo';
  }
  return names.combo ?? 'Combo';
}

export function getCatalogPlanetName(index: number): string {
  const names = lang() === 'fr' ? planetNamesFr : planetNamesEn;
  return names[index] ?? (lang() === 'fr' ? `Planète ${index + 1}` : `Planet ${index + 1}`);
}

export function getCatalogPlanetNameById(planetId: string): string {
  const match = planetId.match(/^planet-(\d+)$/);
  const index = match ? parseInt(match[1], 10) - 1 : 0;
  return getCatalogPlanetName(Math.max(0, index));
}

export function getCatalogUpgradeGroupLabel(labelKey: string): string {
  const labels = lang() === 'fr' ? upgradeGroupLabelsFr : upgradeGroupLabelsEn;
  return labels[labelKey] ?? labelKey;
}
