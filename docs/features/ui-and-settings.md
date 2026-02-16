# UI and settings

## Tabs

- **Tab IDs**: Mine, Dashboard, Empire, Research, Upgrades, Stats. Stored in localStorage and synced with hash (e.g. `#upgrades`).
- **Visibility**: Tabs are shown or hidden based on progression unlocks (getUnlockedBlocks). Mine and Dashboard always visible; Upgrades when upgrades unlocked; Empire when crew, planets, or prestige unlocked; Research when research unlocked; Stats when upgrades unlocked.
- **Badges**: Tabs can show an action badge (e.g. quest claimable, affordable upgrade, prestige ready, expedition/crew/slot/housing action). See mountTabs.ts updateTabBadges.
- **Layout**: **Tabs** (default) or **One page** (all panels visible at once). Persisted in settings.

## Views and panels

- **Mine**: Mine zone (2D canvas or 3D), coins, production, combo indicator, event badge.
- **Dashboard**: Overview, quick actions, recommended next step, shortcuts.
- **Empire**: Production breakdown, crew, planet list (with housing per planet), quest block, prestige block.
- **Research**: Skill tree (researchView).
- **Upgrades**: Upgrade list (upgradeListView) with buy / install progress.
- **Stats**: Statistics (statsView, statisticsView), charts (recent / long term), achievements link.
- **Lazy loading**: Tab panels (research, dashboard, upgrades, empire, stats) render on first switch; only hydrated panels are refreshed on refresh signal.

## Modals

- **Settings**: Starfield, orbit lines, click particles, compact numbers, space repeat, layout, pause when background, theme, sound, reduced motion, language, export/import save, reset progress, achievements link.
- **Prestige**: Confirm and (optional) rewards.
- **Reset progress**: Confirm before full reset.
- **Upgrade choose planet**: When buying an upgrade and multiple planets have free slots.
- **Achievements**: List of achievements (unlocked and locked; secret show ???).
- **Changelog / What's new**: Version and changelog entries (from changelog.json).

## Accessibility

- **ARIA**: tablist, tabs, panels, modals with roles and aria-selected/aria-hidden.
- **Keyboard**: 1–4 (or similar) switch tabs; Tab trapped in open modal; Escape closes modal. Focus moved to first focusable when opening settings/reset/prestige.
- **Reduce motion**: Setting `reducedMotion` applied via `data-reduced-motion` on `<html>`; CSS can reduce or disable animations.

## Settings (full list)

From `src/settings.ts` and UI strings:

| Setting | Type | Description |
|---------|------|-------------|
| starfieldSpeed | number | Starfield animation speed |
| showOrbitLines | boolean | Show orbit lines in starfield |
| clickParticles | boolean | Click particles in mine zone |
| compactNumbers | boolean | Display 1.2K, 1.5M, etc. |
| spaceKeyRepeat | boolean | Allow holding Space to mine |
| layout | 'tabs' \| 'one-page' | Tabbed or one-page layout |
| pauseWhenBackground | boolean | Pause production when tab in background |
| reducedMotion | boolean | Reduce motion (a11y) |
| theme | 'light' \| 'dark' | UI theme |
| soundEnabled | boolean | Sound effects on/off |
| language | 'en' \| 'fr' | UI language (i18n) |

Save & data (in Settings modal): Export save, Import save, Reset progress. All settings persisted in localStorage (stellar-miner-settings).
