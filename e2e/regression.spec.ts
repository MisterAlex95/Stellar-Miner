import { test, expect } from './base.js';
import * as fs from 'node:fs';

test.describe('Tabs', () => {
  test('keys 1-6 switch to correct panel', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabPanelPairs: { key: string; tab: string; panel: string }[] = [
      { key: '1', tab: '#tab-mine', panel: '#panel-mine' },
      { key: '2', tab: '#tab-dashboard', panel: '#panel-dashboard' },
      { key: '3', tab: '#tab-empire', panel: '#panel-empire' },
      { key: '4', tab: '#tab-research', panel: '#panel-research' },
      { key: '5', tab: '#tab-upgrades', panel: '#panel-upgrades' },
      { key: '6', tab: '#tab-stats', panel: '#panel-stats' },
    ];
    for (const { key, tab, panel } of tabPanelPairs) {
      if (!(await page.locator(tab).isVisible())) continue;
      await page.keyboard.press(key);
      await expect(page.locator(panel)).toBeVisible();
    }
  });

  test('clicking tab shows same panel', async ({ page, gotoApp }) => {
    await gotoApp();
    await expect(page.locator('#panel-mine')).toBeVisible();
    const tabEmpire = page.locator('#tab-empire');
    if (await tabEmpire.isVisible()) {
      await tabEmpire.click();
      await expect(page.locator('#panel-empire')).toBeVisible();
    }
    const tabUpgrades = page.locator('#tab-upgrades');
    if (await tabUpgrades.isVisible()) {
      await tabUpgrades.click();
      await expect(page.locator('#panel-upgrades')).toBeVisible();
    }
    await page.locator('#tab-mine').click();
    await expect(page.locator('#panel-mine')).toBeVisible();
  });
});

test.describe('Empire', () => {
  test('opening Empire tab shows panel with no console errors', async ({ page, gotoApp }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await gotoApp();
    if (!(await page.locator('#tab-empire').isVisible())) {
      test.skip(true, 'Empire tab not yet unlocked');
      return;
    }
    await page.keyboard.press('3');
    await expect(page.locator('#panel-empire')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe('Upgrades', () => {
  test('buying first affordable upgrade decreases coins', async ({ page, gotoApp }) => {
    await gotoApp();
    const coinsEl = page.locator('#coins-value');
    for (let i = 0; i < 40; i++) await page.locator('#mine-zone').click();
    await page.waitForTimeout(400);
    const coinsBefore = await coinsEl.textContent();
    const tabUpgrades = page.locator('#tab-upgrades');
    if (!(await tabUpgrades.isVisible())) {
      test.skip(true, 'Upgrades tab not yet unlocked (need 30 coins)');
      return;
    }
    await tabUpgrades.click();
    await expect(page.locator('#panel-upgrades')).toBeVisible();
    const buyBtn = page.locator('button.upgrade-btn--buy[data-upgrade-id="mining-robot"]');
    await buyBtn.waitFor({ state: 'visible', timeout: 5000 });
    if (await buyBtn.isDisabled()) {
      test.skip(true, 'Mining robot not yet affordable');
      return;
    }
    await buyBtn.click();
    await page.waitForTimeout(300);
    const coinsAfter = await coinsEl.textContent();
    expect(coinsAfter).not.toBe(coinsBefore);
  });
});

test.describe('Prestige', () => {
  test('prestige confirm modal opens and cancel closes it', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabEmpire = page.locator('#tab-empire');
    if (!(await tabEmpire.isVisible())) {
      test.skip(true, 'Empire tab not yet unlocked');
      return;
    }
    await tabEmpire.click();
    await expect(page.locator('#panel-empire')).toBeVisible();
    const prestigeBtn = page.locator('#prestige-btn');
    if (await prestigeBtn.isDisabled()) {
      test.skip(true, 'Prestige button not yet enabled');
      return;
    }
    await prestigeBtn.click();
    await expect(page.locator('#prestige-confirm-overlay')).toBeVisible();
    await page.locator('#prestige-confirm-cancel').click();
    await expect(page.locator('#prestige-confirm-overlay')).not.toBeVisible();
  });
});

test.describe('Settings', () => {
  test('settings open and close', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#settings-btn').click();
    await expect(page.locator('#settings-overlay')).toBeVisible();
    await page.locator('#settings-close').click();
    await expect(page.locator('#settings-overlay')).not.toBeVisible();
  });
});

test.describe('Save', () => {
  test('export then import restores session', async ({ page, gotoApp }) => {
    await gotoApp();
    for (let i = 0; i < 15; i++) await page.locator('#mine-zone').click();
    await page.waitForTimeout(200);
    const coinsBefore = (await page.locator('#coins-value').textContent()) ?? '';
    await page.locator('#settings-btn').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#settings-export-btn').click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const json = fs.readFileSync(path!, 'utf8');
    expect(json.length).toBeGreaterThan(0);
    const fileChooser = page.waitForEvent('filechooser');
    await page.locator('#settings-import-btn').click();
    const chooser = await fileChooser;
    await chooser.setFiles({
      name: 'save.json',
      mimeType: 'application/json',
      buffer: Buffer.from(json),
    });
    await expect(page.locator('#coins-value')).toHaveText(coinsBefore, { timeout: 10000 });
  });
});

test.describe('Research and Stats', () => {
  test('Research tab shows panel', async ({ page, gotoApp }) => {
    await gotoApp();
    if (!(await page.locator('#tab-research').isVisible())) {
      test.skip(true, 'Research tab not yet unlocked');
      return;
    }
    await page.keyboard.press('4');
    await expect(page.locator('#panel-research')).toBeVisible();
  });

  test('Stats tab shows panel', async ({ page, gotoApp }) => {
    await gotoApp();
    if (!(await page.locator('#tab-stats').isVisible())) {
      test.skip(true, 'Stats tab not yet unlocked');
      return;
    }
    await page.keyboard.press('6');
    await expect(page.locator('#panel-stats')).toBeVisible();
  });

  test('Research panel has research section', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabResearch = page.locator('#tab-research');
    if (!(await tabResearch.isVisible())) {
      test.skip(true, 'Research tab not yet unlocked');
      return;
    }
    await tabResearch.click();
    await expect(page.locator('#research-section')).toBeVisible();
  });

  test('Stats panel has production value', async ({ page, gotoApp }) => {
    await gotoApp();
    await expect(page.locator('#production-value')).toBeVisible();
  });
});

test.describe('Mine', () => {
  test('multiple mine clicks increase coins repeatedly', async ({ page, gotoApp }) => {
    await gotoApp();
    const coinsEl = page.locator('#coins-value');
    const first = await coinsEl.textContent();
    for (let i = 0; i < 30; i++) await page.locator('#mine-zone').click();
    await page.waitForTimeout(200);
    const after = await coinsEl.textContent();
    expect(after).not.toBe(first);
  });

  test('mine zone is visible and has hint', async ({ page, gotoApp }) => {
    await gotoApp();
    await expect(page.locator('#mine-zone')).toBeVisible();
    await expect(page.locator('#mine-zone-hint')).toBeVisible();
  });

  test('combo indicator exists', async ({ page, gotoApp }) => {
    await gotoApp();
    await expect(page.locator('#combo-indicator')).toBeAttached();
  });
});

test.describe('Header and modals', () => {
  test('header shows title and subtitle', async ({ page, gotoApp }) => {
    await gotoApp();
    await expect(page.locator('h1')).toContainText('STELLAR MINER');
  });

  test('info modal opens and closes', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#info-btn').click();
    await expect(page.locator('#info-overlay')).toBeVisible();
    await page.locator('#info-close').click();
    await expect(page.locator('#info-overlay')).not.toBeVisible();
  });

  test('settings has export and import buttons', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#settings-btn').click();
    await expect(page.locator('#settings-export-btn')).toBeVisible();
    await expect(page.locator('#settings-import-btn')).toBeVisible();
    await page.locator('#settings-close').click();
  });

  test('settings has theme selector', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#settings-btn').click();
    await expect(page.locator('#setting-theme')).toBeVisible();
    await page.locator('#settings-close').click();
  });

  test('Escape closes settings when open', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#settings-btn').click();
    await expect(page.locator('#settings-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-overlay')).not.toBeVisible();
  });
});

test.describe('Tabs extended', () => {
  test('each tab button toggles correct panel', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabs = [
      { tab: '#tab-mine', panel: '#panel-mine' },
      { tab: '#tab-dashboard', panel: '#panel-dashboard' },
      { tab: '#tab-empire', panel: '#panel-empire' },
      { tab: '#tab-research', panel: '#panel-research' },
      { tab: '#tab-upgrades', panel: '#panel-upgrades' },
      { tab: '#tab-stats', panel: '#panel-stats' },
    ];
    for (const { tab, panel } of tabs) {
      const tabEl = page.locator(tab);
      if (!(await tabEl.isVisible())) continue;
      await tabEl.click();
      await expect(page.locator(panel)).toBeVisible();
    }
  });

  test('key 1 returns to Mine panel', async ({ page, gotoApp }) => {
    await gotoApp();
    if (await page.locator('#tab-empire').isVisible()) {
      await page.keyboard.press('3');
      await expect(page.locator('#panel-empire')).toBeVisible();
    }
    await page.keyboard.press('1');
    await expect(page.locator('#panel-mine')).toBeVisible();
  });
});

test.describe('Empire extended', () => {
  test('Empire has quest section', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabEmpire = page.locator('#tab-empire');
    if (!(await tabEmpire.isVisible())) {
      test.skip(true, 'Empire tab not yet unlocked');
      return;
    }
    await tabEmpire.click();
    await expect(page.locator('#quest-section')).toBeVisible();
  });

  test('Empire has crew section', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabEmpire = page.locator('#tab-empire');
    if (!(await tabEmpire.isVisible())) {
      test.skip(true, 'Empire tab not yet unlocked');
      return;
    }
    await tabEmpire.click();
    await expect(page.locator('#crew-section')).toBeVisible();
  });

  test('Empire has planets section', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabEmpire = page.locator('#tab-empire');
    if (!(await tabEmpire.isVisible())) {
      test.skip(true, 'Empire tab not yet unlocked');
      return;
    }
    await tabEmpire.click();
    await expect(page.locator('#planets-section')).toBeVisible();
  });

  test('Empire has prestige section', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabEmpire = page.locator('#tab-empire');
    if (!(await tabEmpire.isVisible())) {
      test.skip(true, 'Empire tab not yet unlocked');
      return;
    }
    await tabEmpire.click();
    await expect(page.locator('#prestige-section')).toBeVisible();
  });
});

test.describe('Upgrades extended', () => {
  test('Upgrades panel has upgrade list container', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabUpgrades = page.locator('#tab-upgrades');
    if (!(await tabUpgrades.isVisible())) {
      test.skip(true, 'Upgrades tab not yet unlocked');
      return;
    }
    await tabUpgrades.click();
    await expect(page.locator('#upgrade-list')).toBeVisible();
  });

  test('buying mining robot then clicking mine shows production', async ({ page, gotoApp }) => {
    await gotoApp();
    for (let i = 0; i < 40; i++) await page.locator('#mine-zone').click();
    await page.waitForTimeout(400);
    const tabUpgrades = page.locator('#tab-upgrades');
    if (!(await tabUpgrades.isVisible())) {
      test.skip(true, 'Upgrades tab not yet unlocked');
      return;
    }
    await tabUpgrades.click();
    const buyBtn = page.locator('button.upgrade-btn--buy[data-upgrade-id="mining-robot"]');
    await buyBtn.waitFor({ state: 'visible', timeout: 5000 });
    if (await buyBtn.isDisabled()) {
      test.skip(true, 'Mining robot not yet affordable');
      return;
    }
    await buyBtn.click();
    await page.waitForTimeout(200);
    await page.locator('#tab-mine').click();
    await page.waitForTimeout(500);
    const prod = await page.locator('#production-value').textContent();
    expect(prod).toBeTruthy();
  });
});

test.describe('Prestige extended', () => {
  test('prestige confirm overlay has cancel and confirm buttons', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabEmpire = page.locator('#tab-empire');
    if (!(await tabEmpire.isVisible())) {
      test.skip(true, 'Empire tab not yet unlocked');
      return;
    }
    await tabEmpire.click();
    const prestigeBtn = page.locator('#prestige-btn');
    if (await prestigeBtn.isDisabled()) {
      test.skip(true, 'Prestige not yet enabled');
      return;
    }
    await prestigeBtn.click();
    await expect(page.locator('#prestige-confirm-cancel')).toBeVisible();
    await expect(page.locator('#prestige-confirm-do')).toBeVisible();
    await page.locator('#prestige-confirm-cancel').click();
  });
});

test.describe('Save extended', () => {
  test('export produces valid JSON with version', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#settings-btn').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#settings-export-btn').click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const json = fs.readFileSync(path!, 'utf8');
    const data = JSON.parse(json);
    expect(data.version).toBeDefined();
    expect(data.player).toBeDefined();
  });
});

test.describe("What's new / Info", () => {
  test('info modal opens and shows version', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#info-btn').click();
    await expect(page.locator('#info-overlay')).toBeVisible();
    await expect(page.locator('#info-version-value')).toBeVisible();
    await page.locator('#info-close').click();
    await expect(page.locator('#info-overlay')).not.toBeVisible();
  });

  test('info modal has changelog list container', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#info-btn').click();
    await expect(page.locator('#info-changelog-list')).toBeVisible();
    await page.locator('#info-close').click();
  });
});

test.describe('Keyboard', () => {
  test('Space key mines from Mine tab', async ({ page, gotoApp }) => {
    await gotoApp();
    await expect(page.locator('#panel-mine')).toBeVisible();
    const coinsEl = page.locator('#coins-value');
    const initial = await coinsEl.textContent();
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    const after = await coinsEl.textContent();
    expect(after).not.toBe(initial);
  });

  test('Escape closes info modal when open', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#info-btn').click();
    await expect(page.locator('#info-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#info-overlay')).not.toBeVisible();
  });
});

test.describe('Settings extended', () => {
  test('settings has language selector', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#settings-btn').click();
    await expect(page.locator('#setting-language')).toBeVisible();
    await page.locator('#settings-close').click();
  });

  test('achievements button opens achievements modal', async ({ page, gotoApp }) => {
    await gotoApp();
    await expect(page.locator('#achievements-btn')).toBeVisible();
    await page.locator('#achievements-btn').click();
    await expect(page.locator('#achievements-overlay.achievements-overlay--open')).toBeVisible();
    await expect(page.locator('#achievements-modal-list')).toBeVisible();
    await page.locator('#achievements-modal-close').click();
    await expect(page.locator('#achievements-overlay.achievements-overlay--open')).not.toBeVisible();
  });

  test('settings has reset progress button', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#settings-btn').click();
    await expect(page.locator('#settings-reset-btn')).toBeVisible();
    await page.locator('#settings-close').click();
  });

  test('reset confirm modal opens and cancel closes it', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#settings-btn').click();
    await page.locator('#settings-reset-btn').click();
    await expect(page.locator('#reset-confirm-overlay.reset-confirm-overlay--open')).toBeVisible();
    await page.locator('#reset-confirm-cancel').click();
    await expect(page.locator('#reset-confirm-overlay.reset-confirm-overlay--open')).not.toBeVisible();
    await page.locator('#settings-close').click();
  });
});

test.describe('Dashboard extended', () => {
  test('Dashboard has Go to Mine button', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#tab-dashboard').click();
    await expect(page.locator('#panel-dashboard')).toBeVisible();
    await expect(page.getByRole('button', { name: /Go to Mine/i })).toBeVisible();
  });

  test('Dashboard shows coins and production', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#tab-dashboard').click();
    await expect(page.locator('#dashboard-section')).toContainText('Coins');
    await expect(page.locator('#dashboard-section')).toContainText('Production');
  });
});

test.describe('Quest', () => {
  test('Quest section shows progress', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabEmpire = page.locator('#tab-empire');
    if (!(await tabEmpire.isVisible())) {
      test.skip(true, 'Empire tab not yet unlocked');
      return;
    }
    await tabEmpire.click();
    await expect(page.locator('#quest-section')).toBeVisible();
    await expect(page.locator('#quest-progress')).toBeVisible();
  });

  test('Quest claim button exists', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabEmpire = page.locator('#tab-empire');
    if (!(await tabEmpire.isVisible())) {
      test.skip(true, 'Empire tab not yet unlocked');
      return;
    }
    await tabEmpire.click();
    await expect(page.locator('#quest-claim')).toBeVisible();
  });
});

test.describe('Prestige rewards', () => {
  test('prestige rewards button opens modal and close works', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabEmpire = page.locator('#tab-empire');
    if (!(await tabEmpire.isVisible())) {
      test.skip(true, 'Empire tab not yet unlocked');
      return;
    }
    await tabEmpire.click();
    const rewardsBtn = page.locator('#prestige-rewards-btn');
    if ((await rewardsBtn.count()) === 0) {
      test.skip(true, 'Prestige rewards not yet visible');
      return;
    }
    await rewardsBtn.click();
    await expect(page.locator('#prestige-rewards-overlay.prestige-rewards-overlay--open')).toBeVisible();
    await page.locator('#prestige-rewards-close').click();
    await expect(page.locator('#prestige-rewards-overlay.prestige-rewards-overlay--open')).not.toBeVisible();
  });
});

test.describe('Events hint', () => {
  test('events hint trigger exists in header stats', async ({ page, gotoApp }) => {
    await gotoApp();
    await expect(page.locator('#events-hint-trigger')).toBeVisible();
  });

  test('events hint modal opens and closes', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.locator('#events-hint-trigger').click();
    await expect(page.locator('#events-hint-overlay.events-hint-overlay--open')).toBeVisible();
    await page.locator('#events-hint-close').click();
    await expect(page.locator('#events-hint-overlay.events-hint-overlay--open')).not.toBeVisible();
  });
});

test.describe('Stats panel', () => {
  test('Stats panel shows statistics container', async ({ page, gotoApp }) => {
    await gotoApp();
    const tabStats = page.locator('#tab-stats');
    if (!(await tabStats.isVisible())) {
      test.skip(true, 'Stats tab not yet unlocked');
      return;
    }
    await tabStats.click();
    await expect(page.locator('#statistics-container')).toBeVisible();
  });
});

test.describe('Next milestone', () => {
  test('next milestone text is visible', async ({ page, gotoApp }) => {
    await gotoApp();
    await expect(page.locator('#next-milestone')).toBeVisible();
  });
});
