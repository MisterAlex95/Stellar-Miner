/**
 * Read-only catalog of static game data for the dev data tool. Imports JSON so the tool can display them.
 */
import balance from '../data/balance.json';
import gameConfig from '../data/gameConfig.json';
import modules from '../data/modules.json';
import events from '../data/events.json';
import progression from '../data/progression.json';
import achievements from '../data/achievements.json';
import codex from '../data/codex.json';
import discoveryFlavor from '../data/discoveryFlavor.json';
import narrator from '../data/narrator.json';
import prestigeLore from '../data/prestigeLore.json';
import questFlavor from '../data/questFlavor.json';
import planetAffinity from '../data/planetAffinity.json';
import researchIconMapping from '../data/researchIconMapping.json';
import changelog from '../data/changelog.json';

export const STATIC_DATA: Record<string, unknown> = {
  balance,
  gameConfig,
  modules,
  events,
  progression,
  achievements,
  codex,
  discoveryFlavor,
  narrator,
  prestigeLore,
  questFlavor,
  planetAffinity,
  researchIconMapping,
  changelog,
};
