export { saveSession, handleExportSave, handleImportSave } from './handlersSave.js';
export { handleMineClick } from './handlersMine.js';
export { handleUpgradeBuy, handleUpgradeBuyMax, showUpgradeInstallProgress } from './handlersUpgrade.js';
export {
  handleBuyNewPlanet,
  completeExpeditionIfDue,
  handleAddSlot,
  handleBuildHousing,
  handleHireAstronaut,
} from './handlersPlanet.js';
export { handleClaimQuest } from './handlersQuest.js';
export {
  openPrestigeConfirmModal,
  closePrestigeConfirmModal,
  openPrestigeRewardsModal,
  closePrestigeRewardsModal,
  confirmPrestige,
  handlePrestige,
} from './handlersPrestige.js';
export { handleResearchAttempt, startResearchWithProgress } from './handlersResearch.js';
export {
  openSettings,
  closeSettings,
  applySettingsToUI,
  updateLastSavedIndicator,
  openResetConfirmModal,
  closeResetConfirmModal,
  handleResetProgress,
} from './handlersSettings.js';
export {
  triggerRandomEvent,
  openDebugMenu,
  closeDebugMenu,
  toggleDebugMenu,
  updateDebugPanel,
  handleDebugAction,
  renderAchievementsList,
  renderAchievementsModalContent,
} from './handlersDebug.js';
