import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getAssignedAstronauts } from '../application/crewHelpers.js';
import { getUnlockedCrewRoles } from '../application/research.js';
import {
  getAstronautCost,
  getMaxAstronauts,
  CREW_ROLES,
  CREW_JOB_ROLES,
  MINER_PRODUCTION_BONUS,
  OTHER_CREW_PRODUCTION_BONUS,
  VETERAN_PRODUCTION_BONUS,
  SCIENTIST_RESEARCH_SUCCESS_PER_SCIENTIST,
  SCIENTIST_RESEARCH_SUCCESS_CAP,
  type CrewRole,
  type CrewJobRole,
} from '../domain/constants.js';
import { t, tParam, type StringKey } from '../application/strings.js';
import { updateTooltipForButton } from './components/buttonTooltip.js';

const ROLE_KEYS: Record<CrewRole, StringKey> = {
  astronaut: 'crewRoleAstronaut',
  miner: 'crewRoleMiner',
  scientist: 'crewRoleScientist',
  pilot: 'crewRolePilot',
  medic: 'crewRoleMedic',
  engineer: 'crewRoleEngineer',
};

const ROLE_HINT_KEYS: Partial<Record<CrewRole, StringKey>> = {
  astronaut: 'crewRoleAstronautHint',
  miner: 'crewRoleMinerHint',
  scientist: 'crewRoleScientistHint',
  pilot: 'crewRolePilotHint',
  medic: 'crewRoleMedicHint',
  engineer: 'crewRoleEngineerHint',
};

const ROLE_EFFECT_KEYS: Partial<Record<CrewRole, StringKey>> = {
  miner: 'crewRoleEffectMiner',
  scientist: 'crewRoleEffectScientist',
  pilot: 'crewRoleEffectPilot',
  medic: 'crewRoleEffectMedic',
  engineer: 'crewRoleEffectEngineer',
};

function isJobRoleUnlocked(role: CrewRole, unlockedJobs: CrewJobRole[]): boolean {
  return role === 'astronaut' || unlockedJobs.includes(role as CrewJobRole);
}

export function renderCrewSection(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const crewSummaryEl = document.getElementById('crew-summary');
  const crewCapacityFill = document.getElementById('crew-capacity-fill');
  const crewCapacityWrap = document.getElementById('crew-capacity-wrap');
  const crewInModulesEl = document.getElementById('crew-in-modules');
  const crewVeteransEl = document.getElementById('crew-veterans');
  if (!crewSummaryEl) return;

  const assigned = getAssignedAstronauts(session);
  const free = player.freeCrewCount;
  const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
  const maxCrew = getMaxAstronauts(player.planets.length, totalHousing);
  const totalCrew = player.astronautCount;
  const atCap = totalCrew >= maxCrew;
  const cost = getAstronautCost(free);
  const canHire = player.coins.gte(cost) && !atCap;
  const costStr = formatNumber(cost, settings.compactNumbers);

  const { astronaut, miner, scientist, pilot, medic, engineer } = player.crewByRole;
  const crewBonusPct = Math.round(
    (miner * MINER_PRODUCTION_BONUS +
      (scientist + pilot + medic + engineer) * OTHER_CREW_PRODUCTION_BONUS) * 100 +
      player.veteranCount * VETERAN_PRODUCTION_BONUS * 100
  );
  const unlockedCrewRoles = getUnlockedCrewRoles();

  if (crewCapacityFill && crewCapacityWrap) {
    crewCapacityFill.style.width = '100%';
    const capacityPct = maxCrew > 0 ? Math.min(100, (totalCrew / maxCrew) * 100) : 0;
    crewCapacityWrap.setAttribute('aria-valuenow', String(Math.round(capacityPct)));
    const pctOfMax = (n: number) => (maxCrew > 0 ? (n / maxCrew) * 100 : 0);
    const setSegment = (el: HTMLElement | null, value: number, title: string) => {
      if (!el) return;
      const pct = pctOfMax(value);
      el.style.width = `${pct.toFixed(1)}%`;
      el.style.minWidth = pct === 0 && maxCrew > 0 ? '4px' : '';
      el.setAttribute('title', title);
    };
    CREW_ROLES.forEach((role) => {
      const segmentEl = document.getElementById(`crew-capacity-segment-${role}`);
      const n = player.crewByRole[role];
      const roleLabel = t(ROLE_KEYS[role]);
      const showSegment = isJobRoleUnlocked(role, unlockedCrewRoles);
      if (segmentEl) {
        segmentEl.style.display = showSegment ? '' : 'none';
        setSegment(segmentEl, n, tParam('crewSegmentRole', { n: String(n), role: roleLabel }));
      }
    });
    const equipmentSegmentEl = document.getElementById('crew-capacity-segment-equipment');
    setSegment(equipmentSegmentEl, assigned, tParam('crewSegmentEquipment', { n: String(assigned) }));
    const freeSegmentEl = document.getElementById('crew-capacity-segment-free');
    const freeSlots = Math.max(0, maxCrew - totalCrew);
    setSegment(freeSegmentEl, freeSlots, tParam('crewSegmentFree', { n: String(freeSlots) }));
  }

  crewSummaryEl.title = tParam('freeAstronautsTitle', { max: maxCrew, planets: player.planets.length });
  const crewEmptyState = document.getElementById('crew-empty-state');
  if (crewEmptyState) {
    const showEmpty = totalCrew === 0;
    crewEmptyState.hidden = !showEmpty;
    crewEmptyState.setAttribute('aria-hidden', String(!showEmpty));
  }
  const crewSummaryLabel = document.getElementById('crew-section-summary');
  if (crewSummaryLabel) crewSummaryLabel.textContent = totalCrew > 0 ? tParam('crewSectionCount', { n: String(totalCrew) }) : '';
  if (totalCrew === 0) {
    crewSummaryEl.textContent = tParam('noCrewYetMax', { max: maxCrew });
  } else if (assigned > 0) {
    const freeStr = String(free);
    const assignedStr = String(assigned);
    const totalStr = String(totalCrew);
    const maxStr = String(maxCrew);
    if (crewBonusPct > 0) {
      crewSummaryEl.textContent = tParam('crewSummaryWithAssigned', {
        free: freeStr,
        assigned: assignedStr,
        total: totalStr,
        max: maxStr,
        pct: String(crewBonusPct),
      });
    } else {
      crewSummaryEl.textContent = tParam('crewSummaryNoBonusWithAssigned', {
        free: freeStr,
        assigned: assignedStr,
        total: totalStr,
        max: maxStr,
      });
    }
  } else if (crewBonusPct > 0) {
    crewSummaryEl.textContent = tParam('crewSummary', {
      current: String(totalCrew),
      max: String(maxCrew),
      pct: String(crewBonusPct),
    });
  } else {
    crewSummaryEl.textContent = tParam('crewSummaryNoBonus', {
      current: String(totalCrew),
      max: String(maxCrew),
    });
  }

  CREW_ROLES.forEach((role) => {
    const cardEl = document.getElementById(`crew-role-card-${role}`);
    const countEl = document.getElementById(`crew-role-count-${role}`);
    const effectEl = document.getElementById(`crew-role-effect-${role}`);
    const btn = document.getElementById(`hire-astronaut-${role}`);
    const n = player.crewByRole[role];
    const showCard = isJobRoleUnlocked(role, unlockedCrewRoles);

    if (cardEl) cardEl.classList.toggle('crew-role-card--unlocked', showCard);
    if (countEl) countEl.textContent = String(n);

    if (effectEl) {
      if (role === 'astronaut') {
        effectEl.textContent = '';
      } else if (role === 'miner' && ROLE_EFFECT_KEYS.miner) {
        effectEl.textContent = n > 0 ? tParam(ROLE_EFFECT_KEYS.miner, { pct: String(Math.round(n * MINER_PRODUCTION_BONUS * 100)) }) : '';
      } else if (role === 'scientist' && ROLE_EFFECT_KEYS.scientist) {
        const scientistPct = Math.min(
          n * SCIENTIST_RESEARCH_SUCCESS_PER_SCIENTIST * 100,
          SCIENTIST_RESEARCH_SUCCESS_CAP * 100
        );
        effectEl.textContent = n > 0 ? tParam(ROLE_EFFECT_KEYS.scientist, { pct: String(Math.round(scientistPct)) }) : '';
      } else if (role === 'pilot' && ROLE_EFFECT_KEYS.pilot) {
        effectEl.textContent = n > 0 ? t(ROLE_EFFECT_KEYS.pilot) : '';
      } else if (role === 'medic' && ROLE_EFFECT_KEYS.medic) {
        effectEl.textContent = n > 0 ? tParam(ROLE_EFFECT_KEYS.medic, { pct: String(Math.round(n * 2)) }) : '';
      } else if (role === 'engineer' && ROLE_EFFECT_KEYS.engineer) {
        effectEl.textContent =
          n > 0 ? tParam(ROLE_EFFECT_KEYS.engineer, { pct: String(Math.round(n * OTHER_CREW_PRODUCTION_BONUS * 100)) }) : '';
      } else {
        effectEl.textContent = '';
      }
    }

    if (btn && btn instanceof HTMLButtonElement) {
      const roleLabel = t(ROLE_KEYS[role]);
      const roleEl = btn.querySelector('.crew-btn-role');
      const costEl = btn.querySelector('.crew-btn-cost');
      if (roleEl) roleEl.textContent = roleLabel;
      if (costEl) costEl.textContent = `${costStr} ⬡`;
      const hintKey = ROLE_HINT_KEYS[role];
      const tooltipText = atCap
        ? tParam('freeAstronautsTitle', { max: maxCrew, planets: player.planets.length })
        : canHire
          ? (hintKey ? t(hintKey) : '') + ` · ${costStr} ⬡ (${totalCrew}/${maxCrew}).`
          : tParam('needCoinsToBuy', { cost: costStr, crew: '' }) + ` (${totalCrew}/${maxCrew}).`;
      updateTooltipForButton(btn, tooltipText);
      btn.toggleAttribute('disabled', !canHire);
    }
  });

  if (crewInModulesEl) {
    if (assigned > 0) {
      crewInModulesEl.textContent = tParam('crewInModules', { n: String(assigned) });
      crewInModulesEl.style.display = '';
    } else {
      crewInModulesEl.textContent = '';
      crewInModulesEl.style.display = 'none';
    }
  }

  if (crewVeteransEl) {
    if (player.veteranCount > 0) {
      crewVeteransEl.textContent = tParam('crewVeterans', { n: String(player.veteranCount) });
      crewVeteransEl.style.display = '';
    } else {
      crewVeteransEl.textContent = '';
      crewVeteransEl.style.display = 'none';
    }
  }

}
