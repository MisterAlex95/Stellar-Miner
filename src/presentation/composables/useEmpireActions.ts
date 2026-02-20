import {
  handlePrestige,
  handleHireAstronaut,
  handleAddSlot,
  handleBuildHousing,
  handleCancelExpedition,
} from '../../application/handlers.js';
import { openExpeditionModal } from '../modals/expedition.js';
import { openPlanetDetail } from '../modals/planetDetail.js';

/** Empire panel click delegation: expedition, planets, prestige, crew. Returns true if the click was handled. */
export function onEmpireClick(e: Event): boolean {
  const target = e.target as HTMLElement;
  if (!target || !target.closest) return false;

  const buyPlanet = target.closest('.buy-planet-btn');
  if (buyPlanet) {
    e.preventDefault();
    e.stopPropagation();
    openExpeditionModal();
    return true;
  }
  const cancelExp = target.closest('.expedition-cancel-btn');
  if (cancelExp) {
    e.preventDefault();
    e.stopPropagation();
    handleCancelExpedition();
    return true;
  }
  const addSlotBtn = target.closest('.add-slot-btn');
  if (addSlotBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = (addSlotBtn as HTMLElement).getAttribute('data-planet-id');
    if (id) handleAddSlot(id);
    return true;
  }
  const housingBtn = target.closest('.build-housing-btn');
  if (housingBtn && !(housingBtn as HTMLButtonElement).disabled) {
    e.preventDefault();
    e.stopPropagation();
    const planetId = (housingBtn as HTMLElement).getAttribute('data-planet-id');
    if (planetId) handleBuildHousing(planetId);
    return true;
  }
  const planetCard = target.closest('.planet-card');
  if (planetCard) {
    const planetId = (planetCard as HTMLElement).getAttribute('data-planet-id');
    if (planetId) {
      e.preventDefault();
      e.stopPropagation();
      openPlanetDetail(planetId);
      return true;
    }
    return true;
  }
  const prestigeBtn = target.closest('.prestige-btn');
  if (prestigeBtn || target.id === 'prestige-btn') {
    e.preventDefault();
    e.stopPropagation();
    handlePrestige();
    return true;
  }
  const hireBtn = target.closest('.hire-astronaut-btn');
  if (hireBtn) {
    e.preventDefault();
    e.stopPropagation();
    const role = (hireBtn as HTMLElement).getAttribute('data-role') as 'miner' | 'scientist' | 'pilot' | 'medic' | 'engineer' | 'astronaut' | null;
    handleHireAstronaut(role ?? 'miner');
    return true;
  }
  return false;
}
