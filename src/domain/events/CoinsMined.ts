/** Domain event: triggered when player clicks or gains passive coins. */
export type CoinsMined = {
  type: 'CoinsMined';
  playerId: string;
  amount: number;
  source: 'click' | 'passive';
};

export function createCoinsMined(
  playerId: string,
  amount: number,
  source: 'click' | 'passive'
): CoinsMined {
  return { type: 'CoinsMined', playerId, amount, source };
}
