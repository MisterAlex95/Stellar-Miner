/** Domain event: triggered when a random game event occurs. */
export type EventTriggered = {
  type: 'EventTriggered';
  eventId: string;
  eventName: string;
};

export function createEventTriggered(
  eventId: string,
  eventName: string
): EventTriggered {
  return { type: 'EventTriggered', eventId, eventName };
}
