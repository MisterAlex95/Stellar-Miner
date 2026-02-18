/**
 * Composable to init the mine zone 3D canvas and register its API.
 * Used by MineZoneCanvas.vue.
 */
import { onUnmounted } from 'vue';
import { createMineZone3D } from '../../canvas/MineZone3D.js';
import { getSettings, getEventContext, setMineZoneCanvasApi } from '../../../application/gameState.js';

export function useMineZoneCanvas(container: HTMLElement | null): void {
  if (!container) return;
  const api = createMineZone3D(container, getSettings, getEventContext);
  setMineZoneCanvasApi(api);
  onUnmounted(() => {
    setMineZoneCanvasApi(null);
  });
}
