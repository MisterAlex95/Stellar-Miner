/**
 * Simple event bus for key game actions. Use for analytics, debugging, or performance tracking
 * without coupling to the UI layer.
 */

export type GameEventKind =
  | 'upgrade_purchased'
  | 'prestige'
  | 'quest_claimed'
  | 'planet_bought'
  | 'astronaut_hired'
  | 'session_loaded'
  | 'save_success'
  | 'save_failed';

export type GameEventPayload = {
  upgrade_purchased: { upgradeId: string; planetId?: string };
  prestige: { level: number };
  quest_claimed: { streak: number };
  planet_bought: { planetCount: number };
  astronaut_hired: { count: number };
  session_loaded: { fromStorage: boolean };
  save_success: void;
  save_failed: { error?: string };
};

type Listener<K extends GameEventKind> = (payload: GameEventPayload[K]) => void;

const listeners: { [K in GameEventKind]?: Listener<K>[] } = {};

export function subscribe<K extends GameEventKind>(kind: K, fn: Listener<K>): () => void {
  const list = (listeners[kind] ??= []) as Listener<K>[];
  list.push(fn);
  return () => {
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };
}

export function emit<K extends GameEventKind>(kind: K, payload: GameEventPayload[K]): void {
  const list = listeners[kind];
  if (!list) return;
  for (const fn of list) (fn as (p: GameEventPayload[K]) => void)(payload);
}
