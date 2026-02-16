/**
 * Interfaces for canvas/rendering APIs used by the game loop.
 * Implementations live in presentation; gameState and game loop depend only on these types.
 */

export interface StarfieldApi {
  update(dt: number): void;
  draw(): void;
  resize(): void;
}

export interface MineZoneCanvasApi {
  update(dt: number): void;
  draw(): void;
  onMineClick(
    clientX?: number,
    clientY?: number,
    options?: { superLucky?: boolean; critical?: boolean }
  ): { hitShootingStar?: boolean };
  setPlanets(planetViews: unknown): void;
  resize(): void;
}
