import type { CoinsMined } from './CoinsMined.js';
import type { UpgradePurchased } from './UpgradePurchased.js';
import type { EventTriggered } from './EventTriggered.js';
import type { PrestigeActivated } from './PrestigeActivated.js';

export type DomainEvent =
  | CoinsMined
  | UpgradePurchased
  | EventTriggered
  | PrestigeActivated;

export { createCoinsMined } from './CoinsMined.js';
export { createUpgradePurchased } from './UpgradePurchased.js';
export { createEventTriggered } from './EventTriggered.js';
export { createPrestigeActivated } from './PrestigeActivated.js';
