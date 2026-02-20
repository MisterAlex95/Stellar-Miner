/**
 * One-off script: expand research.json with many new nodes (Crew, Modules, Expeditions).
 * Run: node scripts/expand-research.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const researchPath = path.join(__dirname, '../src/data/research.json');
const data = JSON.parse(fs.readFileSync(researchPath, 'utf8'));
const ids = new Set(data.map((n) => n.id));

function add(node) {
  if (ids.has(node.id)) return;
  ids.add(node.id);
  data.push(node);
}

// ---- CREW: +10 nodes (rows 4-9, cols 0-1) ----
add({ id: 'morale-boost', name: 'Morale Boost', description: 'Better rest cycles. Slight production and housing.', cost: 11000, successChance: 0.76, prerequisites: ['crew-quarters'], modifiers: { productionPercent: 2, housingCapacityBonus: 1 }, row: 4, col: 1, branch: 'crew' });
add({ id: 'cross-training', name: 'Cross-Training', description: 'Multi-skill personnel. Flexibility and efficiency.', cost: 26000, successChance: 0.72, prerequisites: ['efficiency'], modifiers: { productionPercent: 3 }, row: 5, col: 0, branch: 'crew' });
add({ id: 'habitat-expansion', name: 'Habitat Expansion', description: 'More living space per module.', cost: 42000, successChance: 0.7, prerequisites: ['precision-drilling'], modifiers: { housingCapacityBonus: 2 }, row: 5, col: 1, branch: 'crew' });
add({ id: 'leadership', name: 'Leadership', description: 'Crew coordination. Steady gains.', cost: 58000, successChance: 0.68, prerequisites: ['crew-retraining'], modifiers: { productionPercent: 4 }, row: 6, col: 0, branch: 'crew' });
add({ id: 'ergonomics', name: 'Ergonomics', description: 'Workstation design. Less fatigue, more output.', cost: 75000, successChance: 0.66, prerequisites: ['veteran-protocols'], modifiers: { productionPercent: 5 }, row: 6, col: 1, branch: 'crew' });
add({ id: 'veteran-support', name: 'Veteran Support', description: 'Care for expedition survivors. Capacity and morale.', cost: 92000, successChance: 0.65, prerequisites: ['veteran-protocols'], modifiers: { housingCapacityBonus: 1, productionPercent: 2 }, row: 7, col: 0, branch: 'crew' });
add({ id: 'specialist-logistics', name: 'Specialist Logistics', description: 'Optimal crew assignment. Fewer crew needed on Gas Siphon.', cost: 140000, successChance: 0.63, prerequisites: ['ergonomics', 'leadership'], modifiers: { crewReduction: { 'gas-siphon': 1 } }, row: 7, col: 1, branch: 'crew' });
add({ id: 'crew-sync', name: 'Crew Sync', description: 'Synchronized shifts. Production bump.', cost: 180000, successChance: 0.62, prerequisites: ['veteran-support'], modifiers: { productionPercent: 6 }, row: 8, col: 0, branch: 'crew' });
add({ id: 'fatigue-resistance', name: 'Fatigue Resistance', description: 'Extended ops. More housing.', cost: 250000, successChance: 0.6, prerequisites: ['specialist-logistics'], modifiers: { housingCapacityBonus: 2 }, row: 8, col: 1, branch: 'crew' });
add({ id: 'elite-recruitment', name: 'Elite Recruitment', description: 'Top-tier hires. Capacity and output.', cost: 380000, successChance: 0.57, prerequisites: ['crew-sync'], modifiers: { productionPercent: 4, housingCapacityBonus: 1 }, row: 9, col: 0, branch: 'crew' });

// ---- MODULES: +40 nodes (solar path, cryo/magma/gas paths, more production steps) ----
add({ id: 'solar-optics', name: 'Solar Optics', description: 'Concentrated sunlight. Solar Collector no longer uses a slot.', cost: 6200, successChance: 0.79, prerequisites: ['mining-theory'], modifiers: { productionPercent: 3, slotFreeUpgrades: ['solar-collector'] }, row: 1, col: 5, branch: 'modules' });
add({ id: 'core-drilling', name: 'Core Drilling', description: 'Deeper bore. More yield.', cost: 11000, successChance: 0.76, prerequisites: ['heavy-equipment'], modifiers: { productionPercent: 5 }, row: 2, col: 7, branch: 'modules' });
add({ id: 'machine-learning', name: 'Machine Learning', description: 'Predictive clicks. Better manual yield.', cost: 13000, successChance: 0.75, prerequisites: ['automation'], modifiers: { clickPercent: 8 }, row: 2, col: 8, branch: 'modules' });
add({ id: 'cryo-handling', name: 'Cryo Handling', description: 'Safe ice extraction. Cryo Extractor no longer uses a slot.', cost: 24000, successChance: 0.71, prerequisites: ['catalytic-cracking'], modifiers: { productionPercent: 4, slotFreeUpgrades: ['cryo-extractor'] }, row: 3, col: 6, branch: 'modules' });
add({ id: 'magma-containment', name: 'Magma Containment', description: 'Lava harvesting. Magma Pump slot-free.', cost: 38000, successChance: 0.69, prerequisites: ['deep-extraction'], modifiers: { productionPercent: 5, slotFreeUpgrades: ['magma-pump'] }, row: 3, col: 7, branch: 'modules' });
add({ id: 'gas-processing', name: 'Gas Processing', description: 'Atmosphere extraction. Gas Siphon uses one less crew.', cost: 95000, successChance: 0.64, prerequisites: ['refinery-core'], modifiers: { productionPercent: 6, crewReduction: { 'gas-siphon': 1 } }, row: 4, col: 6, branch: 'modules' });
add({ id: 'geo-thermal', name: 'Geo-Thermal', description: 'Geothermal taps. Geo Drill slot-free.', cost: 120000, successChance: 0.63, prerequisites: ['stellar-harvester'], modifiers: { productionPercent: 7, slotFreeUpgrades: ['geo-drill'] }, row: 5, col: 6, branch: 'modules' });
add({ id: 'high-throughput', name: 'High Throughput', description: 'Bulk processing. Steady production.', cost: 52000, successChance: 0.68, prerequisites: ['automation', 'heavy-equipment'], modifiers: { productionPercent: 8 }, row: 3, col: 8, branch: 'modules' });
add({ id: 'precision-tools', name: 'Precision Tools', description: 'Fine control. Click and production.', cost: 44000, successChance: 0.69, prerequisites: ['ai-assist'], modifiers: { productionPercent: 4, clickPercent: 10 }, row: 3, col: 9, branch: 'modules' });
add({ id: 'thermal-regulation', name: 'Thermal Regulation', description: 'Heat management. Refining boost.', cost: 82000, successChance: 0.65, prerequisites: ['plasma-smelting'], modifiers: { productionPercent: 10 }, row: 4, col: 7, branch: 'modules' });
add({ id: 'flux-compression', name: 'Flux Compression', description: 'Denser output. Major production.', cost: 160000, successChance: 0.62, prerequisites: ['dimensional-mining'], modifiers: { productionPercent: 14 }, row: 5, col: 8, branch: 'modules' });
add({ id: 'subspace-tap', name: 'Subspace Tap', description: 'Alternate-dimension harvest. Production and click.', cost: 290000, successChance: 0.55, prerequisites: ['nexus-research'], modifiers: { productionPercent: 10, clickPercent: 12 }, row: 5, col: 9, branch: 'modules' });
add({ id: 'matter-recycler', name: 'Matter Recycler', description: 'Zero waste. Production gain.', cost: 195000, successChance: 0.61, prerequisites: ['exo-forging'], modifiers: { productionPercent: 12 }, row: 5, col: 10, branch: 'modules' });
add({ id: 'hyper-drill', name: 'Hyper Drill', description: 'Ultra-fast penetration. Huge production.', cost: 550000, successChance: 0.52, prerequisites: ['singularity-drill'], modifiers: { productionPercent: 18 }, row: 6, col: 6, branch: 'modules' });
add({ id: 'reality-weave', name: 'Reality Weave', description: 'Stabilize extraction. Big gains.', cost: 620000, successChance: 0.51, prerequisites: ['void-forge'], modifiers: { productionPercent: 16, clickPercent: 6 }, row: 6, col: 7, branch: 'modules' });
add({ id: 'temporal-loop', name: 'Temporal Loop', description: 'Time-split mining. Production and click.', cost: 780000, successChance: 0.5, prerequisites: ['chrono-extraction'], modifiers: { productionPercent: 14, clickPercent: 10 }, row: 6, col: 8, branch: 'modules' });
add({ id: 'exotic-alloys', name: 'Exotic Alloys', description: 'New materials. Steady boost.', cost: 680000, successChance: 0.51, prerequisites: ['exo-core'], modifiers: { productionPercent: 15 }, row: 6, col: 9, branch: 'modules' });
add({ id: 'quantum-coherence', name: 'Quantum Coherence', description: 'Aligned extraction. Massive production.', cost: 2100000, successChance: 0.45, prerequisites: ['reality-anchor'], modifiers: { productionPercent: 22 }, row: 7, col: 6, branch: 'modules' });
add({ id: 'parallel-mining', name: 'Parallel Mining', description: 'Multi-stream harvest. Scale.', cost: 2400000, successChance: 0.44, prerequisites: ['multiverse-tap'], modifiers: { productionPercent: 20, clickPercent: 8 }, row: 7, col: 7, branch: 'modules' });
add({ id: 'cognitive-grid', name: 'Cognitive Grid', description: 'Crew–machine fusion. Click and production.', cost: 2200000, successChance: 0.45, prerequisites: ['neural-network'], modifiers: { productionPercent: 12, clickPercent: 22 }, row: 7, col: 8, branch: 'modules' });
add({ id: 'omega-catalyst', name: 'Omega Catalyst', description: 'Final-stage boost. Huge output.', cost: 2500000, successChance: 0.44, prerequisites: ['omega-refinery'], modifiers: { productionPercent: 24 }, row: 7, col: 9, branch: 'modules' });
add({ id: 'stellar-tap', name: 'Stellar Tap', description: 'Star-energy harvest. God-tier production.', cost: 8500000, successChance: 0.37, prerequisites: ['stellar-engine'], modifiers: { productionPercent: 28 }, row: 8, col: 6, branch: 'modules' });
add({ id: 'cascade-reactor', name: 'Cascade Reactor', description: 'Self-amplifying loop. Exponential output.', cost: 9200000, successChance: 0.36, prerequisites: ['infinity-loop'], modifiers: { productionPercent: 26, clickPercent: 10 }, row: 8, col: 7, branch: 'modules' });
add({ id: 'cosmic-array', name: 'Cosmic Array', description: 'System-wide cognition. Huge bonuses.', cost: 8800000, successChance: 0.36, prerequisites: ['cosmic-mind'], modifiers: { productionPercent: 18, clickPercent: 28 }, row: 8, col: 8, branch: 'modules' });
add({ id: 'singularity-node', name: 'Singularity Node', description: 'Peak extraction. All bonuses.', cost: 9500000, successChance: 0.35, prerequisites: ['singularity-core'], modifiers: { productionPercent: 24, clickPercent: 14 }, row: 8, col: 9, branch: 'modules' });
add({ id: 'void-conduit', name: 'Void Conduit', description: 'Channel the void. Massive production.', cost: 28000000, successChance: 0.32, prerequisites: ['architect'], modifiers: { productionPercent: 35 }, row: 9, col: 6, branch: 'modules' });
add({ id: 'infinity-core', name: 'Infinity Core', description: 'Unlimited potential. Ultimate output.', cost: 32000000, successChance: 0.31, prerequisites: ['transcendence'], modifiers: { productionPercent: 30, clickPercent: 35 }, row: 9, col: 7, branch: 'modules' });
add({ id: 'omega-matrix', name: 'Omega Matrix', description: 'The final grid. All equations solved.', cost: 35000000, successChance: 0.3, prerequisites: ['omega-theory'], modifiers: { productionPercent: 38, clickPercent: 25 }, row: 9, col: 8, branch: 'modules' });
// More mid-tier modules (cols 8-10)
add({ id: 'pulse-extraction', name: 'Pulse Extraction', description: 'Rhythmic drilling. Steady gain.', cost: 33000, successChance: 0.7, prerequisites: ['deep-extraction'], modifiers: { productionPercent: 6 }, row: 3, col: 10, branch: 'modules' });
add({ id: 'neural-link', name: 'Neural Link', description: 'Direct interface. Click bonus.', cost: 36000, successChance: 0.69, prerequisites: ['neural-boost'], modifiers: { clickPercent: 12 }, row: 4, col: 8, branch: 'modules' });
add({ id: 'plasma-containment', name: 'Plasma Containment', description: 'Controlled fusion. Production.', cost: 115000, successChance: 0.63, prerequisites: ['plasma-catalysis'], modifiers: { productionPercent: 14 }, row: 5, col: 11, branch: 'modules' });
add({ id: 'sensor-fusion', name: 'Sensor Fusion', description: 'Multi-band detection. Efficiency.', cost: 132000, successChance: 0.62, prerequisites: ['quantum-sensors'], modifiers: { productionPercent: 8, clickPercent: 10 }, row: 5, col: 12, branch: 'modules' });
add({ id: 'dark-matter-tap', name: 'Dark Matter Tap', description: 'Exotic matter harvest. Huge production.', cost: 4800000, successChance: 0.4, prerequisites: ['stellar-engine', 'reality-anchor'], modifiers: { productionPercent: 32 }, row: 8, col: 10, branch: 'modules' });
add({ id: 'reality-drill', name: 'Reality Drill', description: 'Pierce the veil. Legendary output.', cost: 5200000, successChance: 0.39, prerequisites: ['infinity-loop', 'void-forge'], modifiers: { productionPercent: 30, clickPercent: 12 }, row: 8, col: 11, branch: 'modules' });

// ---- EXPEDITIONS: +12 nodes (cols 9-11 to avoid module overlap) ----
add({ id: 'signal-boost', name: 'Signal Boost', description: 'Stronger comms. Faster expedition return.', cost: 12000, successChance: 0.76, prerequisites: ['survey-systems'], modifiers: { expeditionDurationPercent: -6 }, row: 2, col: 9, branch: 'expeditions' });
add({ id: 'life-support', name: 'Life Support', description: 'Better life support. Safer expeditions.', cost: 15000, successChance: 0.75, prerequisites: ['survey-systems'], modifiers: { expeditionDeathChancePercent: -4 }, row: 2, col: 10, branch: 'expeditions' });
add({ id: 'nav-computer', name: 'Nav Computer', description: 'Optimal routes. Shorter duration.', cost: 35000, successChance: 0.71, prerequisites: ['faster-probes', 'long-range-comms'], modifiers: { expeditionDurationPercent: -8 }, row: 4, col: 9, branch: 'expeditions' });
add({ id: 'hazard-suits', name: 'Hazard Suits', description: 'Better protection. Lower death chance.', cost: 42000, successChance: 0.7, prerequisites: ['survival-training', 'field-medics'], modifiers: { expeditionDeathChancePercent: -6 }, row: 4, col: 10, branch: 'expeditions' });
add({ id: 'deep-range-scans', name: 'Deep-Range Scans', description: 'See farther. Faster missions.', cost: 78000, successChance: 0.66, prerequisites: ['expedition-ai'], modifiers: { expeditionDurationPercent: -7 }, row: 5, col: 9, branch: 'expeditions' });
add({ id: 'rescue-protocols', name: 'Rescue Protocols', description: 'Stranded-crew recovery. Safer runs.', cost: 85000, successChance: 0.65, prerequisites: ['expedition-ai'], modifiers: { expeditionDeathChancePercent: -5 }, row: 5, col: 10, branch: 'expeditions' });
add({ id: 'mining-protocols', name: 'Mining Protocols', description: 'Expedition mining efficiency. Duration and safety.', cost: 125000, successChance: 0.63, prerequisites: ['deep-range-scans', 'rescue-protocols'], modifiers: { expeditionDurationPercent: -5, expeditionDeathChancePercent: -4 }, row: 6, col: 9, branch: 'expeditions' });
add({ id: 'scout-network', name: 'Scout Network', description: 'Coordinated scouting. Much faster return.', cost: 180000, successChance: 0.61, prerequisites: ['mining-protocols'], modifiers: { expeditionDurationPercent: -10 }, row: 6, col: 10, branch: 'expeditions' });
add({ id: 'emergency-beacon', name: 'Emergency Beacon', description: 'Faster rescue. Much safer.', cost: 220000, successChance: 0.6, prerequisites: ['mining-protocols'], modifiers: { expeditionDeathChancePercent: -8 }, row: 6, col: 11, branch: 'expeditions' });
add({ id: 'interstellar-comms', name: 'Interstellar Comms', description: 'Cross-system link. Expeditions faster.', cost: 380000, successChance: 0.55, prerequisites: ['scout-network'], modifiers: { expeditionDurationPercent: -9 }, row: 7, col: 9, branch: 'expeditions' });
add({ id: 'field-surgery', name: 'Field Surgery', description: 'On-site care. Safer expeditions.', cost: 420000, successChance: 0.54, prerequisites: ['emergency-beacon'], modifiers: { expeditionDeathChancePercent: -7 }, row: 7, col: 10, branch: 'expeditions' });
add({ id: 'expedition-mastery', name: 'Expedition Mastery', description: 'Peak mission design. Fast and safe.', cost: 750000, successChance: 0.48, prerequisites: ['interstellar-comms', 'field-surgery'], modifiers: { expeditionDurationPercent: -12, expeditionDeathChancePercent: -10 }, row: 8, col: 9, branch: 'expeditions' });

fs.writeFileSync(researchPath, JSON.stringify(data, null, 2));
console.log('Wrote', data.length, 'research nodes');