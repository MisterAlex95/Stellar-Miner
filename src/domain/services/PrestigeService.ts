import type { Player } from '../entities/Player.js';
import { createPrestigeActivated } from '../events/PrestigeActivated.js';
import type { DomainEvent } from '../events/index.js';

/** Domain service: compute prestige bonus and reset game. */
export class PrestigeService {
  activatePrestige(player: Player): DomainEvent {
    const newLevel = player.prestigeLevel + 1;
    return createPrestigeActivated(player.id, newLevel);
  }
}
