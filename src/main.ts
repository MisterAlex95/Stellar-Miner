import { Player } from './domain/entities/Player.js';
import { Upgrade } from './domain/entities/Upgrade.js';
import { UpgradeEffect } from './domain/value-objects/UpgradeEffect.js';
import { UpgradeService } from './domain/services/UpgradeService.js';
import { GameSession } from './domain/aggregates/GameSession.js';

const player = Player.create('player-1');
player.addCoins(100);

const upgrade = new Upgrade(
  'mining-robot',
  'Mining Robot',
  50,
  new UpgradeEffect(1)
);

const upgradeService = new UpgradeService();
const event = upgradeService.purchaseUpgrade(player, upgrade);

const session = new GameSession('session-1', player);
console.log('Stellar Miner — domain check');
console.log('Player coins:', player.coins.value);
console.log('Production rate:', player.productionRate.value);
console.log('Upgrade purchased event:', event?.type ?? 'none');
console.log('Session id:', session.id);
