/**
 * Re-export Decimal from break_infinity.js for idle-game scale numbers (up to ~1e9e15).
 * Used for coins, production rate, totalCoinsEver, and any value that can grow unbounded.
 */
import Decimal from 'break_infinity.js';

export type DecimalSource = number | string | Decimal;

export function toDecimal(value: DecimalSource): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export { Decimal };
