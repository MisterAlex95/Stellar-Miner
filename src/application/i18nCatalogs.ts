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
  'drill-mk2': 'Drill Mk.II',
  'asteroid-rig': 'Asteroid Rig',
  'orbital-station': 'Orbital Station',
  'deep-core-drill': 'Deep Core Drill',
  'stellar-harvester': 'Stellar Harvester',
  'quantum-extractor': 'Quantum Extractor',
  'void-crusher': 'Void Crusher',
  'nexus-collector': 'Nexus Collector',
};

const upgradeDescsEn: Record<string, string> = {
  'mining-robot': 'Basic autonomous miner. Your first step into the belt.',
  'drill-mk1': 'Improved extraction head. Needs an operator. Cuts through surface rock in seconds.',
  'drill-mk2': 'Heavy-duty surface drill. Built for long shifts in the void. Requires trained crew.',
  'asteroid-rig': 'Full mining platform. Drills, crushes, and sorts in one unit. Needs a team.',
  'orbital-station': 'Refinery and logistics hub. The heart of your operation. Crew-intensive.',
  'deep-core-drill': "Penetrates dense ore layers. Reaches what others can't. Requires specialist crew.",
  'stellar-harvester': 'Harvests rare minerals at scale. Feeds the entire sector.',
  'quantum-extractor': 'Maximum efficiency extraction. Near-instant ore processing. Needs expert crew.',
  'void-crusher': 'Pulverizes asteroid cores. Built for the endgame.',
  'nexus-collector': 'Harvests from multiple dimensions. The ultimate upgrade. Full crew required.',
};

const upgradeNamesFr: Record<string, string> = {
  'mining-robot': 'Robot minier',
  'drill-mk1': 'Foreuse Mk.I',
  'drill-mk2': 'Foreuse Mk.II',
  'asteroid-rig': 'Plateforme astéroïde',
  'orbital-station': 'Station orbitale',
  'deep-core-drill': 'Foreuse noyau profond',
  'stellar-harvester': 'Moissonneur stellaire',
  'quantum-extractor': 'Extracteur quantique',
  'void-crusher': 'Broyeur du vide',
  'nexus-collector': 'Collecteur Nexus',
};

const upgradeDescsFr: Record<string, string> = {
  'mining-robot': 'Mineur autonome de base. Votre premier pas dans la ceinture.',
  'drill-mk1': 'Tête d’extraction améliorée. Nécessite un opérateur.',
  'drill-mk2': 'Foreuse de surface renforcée. Pour les longues missions. Nécessite un équipage formé.',
  'asteroid-rig': 'Plateforme minière complète. Fore, broie et trie. Nécessite une équipe.',
  'orbital-station': 'Raffinerie et logistique. Cœur de l’opération. Nécessite beaucoup d’équipage.',
  'deep-core-drill': 'Pénètre les couches denses. Nécessite un équipage spécialisé.',
  'stellar-harvester': 'Récolte de minéraux rares à grande échelle.',
  'quantum-extractor': 'Extraction à efficacité maximale. Nécessite un équipage expert.',
  'void-crusher': 'Pulvérise les noyaux d’astéroïdes. Pour la fin de partie.',
  'nexus-collector': 'Récolte multidimensionnelle. Amélioration ultime.',
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
  'automation': 'Automated systems. Slightly less production, better click yield.',
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
  'automation': 'Systèmes automatisés. Moins de production, meilleur rendement au clic.',
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
};

const achievementNamesEn: Record<string, string> = {
  'first-click': 'First steps',
  'clicks-100': 'Clicker',
  'clicks-1k': 'Dedicated miner',
  'first-upgrade': 'Automation',
  'upgrades-10': 'Expansion',
  'first-astronaut': 'Crew recruit',
  'astronauts-5': 'Squad',
  'first-prestige': 'Rebirth',
  'prestige-5': 'Veteran',
  'planets-3': 'Multi-world',
  'coins-10k': 'Wealthy',
  'quest-streak-3': 'Quest master',
  'first-quest': 'First quest',
  'prestige-10': 'Legend',
  'coins-1m': 'Millionaire',
  'planets-10': 'Empire',
  'clicks-50k': 'Relentless',
  'upgrades-25': 'Factory',
  'combo-master': 'Combo master',
  'first-slot': 'Expander',
};

const achievementNamesFr: Record<string, string> = {
  'first-click': 'Premiers pas',
  'clicks-100': 'Cliqueur',
  'clicks-1k': 'Mineur dévoué',
  'first-upgrade': 'Automatisation',
  'upgrades-10': 'Expansion',
  'first-astronaut': 'Recrue',
  'astronauts-5': 'Équipe',
  'first-prestige': 'Renaissance',
  'prestige-5': 'Vétéran',
  'planets-3': 'Multi-mondes',
  'coins-10k': 'Riche',
  'quest-streak-3': 'Maître des quêtes',
  'first-quest': 'Première quête',
  'prestige-10': 'Légende',
  'coins-1m': 'Millionnaire',
  'planets-10': 'Empire',
  'clicks-50k': 'Acharné',
  'upgrades-25': 'Usine',
  'combo-master': 'Maître du combo',
  'first-slot': 'Expansion',
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

export function getCatalogAchievementName(id: string): string {
  const names = lang() === 'fr' ? achievementNamesFr : achievementNamesEn;
  return names[id] ?? ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id;
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
