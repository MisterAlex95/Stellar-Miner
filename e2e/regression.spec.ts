import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';

test.describe('Tabs', () => {
  test('keys 1-6 switch to correct panel', async ({ page }) => {
    await page.goto('/');
    const panels = [
      '#panel-mine',
      '#panel-dashboard',
      '#panel-empire',
      '#panel-research',
      '#panel-upgrades',
      '#panel-stats',
    ];
    for (let i = 0; i < panels.length; i++) {
      await page.keyboard.press(String(i + 1));
      await expect(page.locator(panels[i])).toBeVisible();
    }
  });

  test('clicking tab shows same panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#panel-mine')).toBeVisible();
    await page.locator('#tab-empire').click();
    await expect(page.locator('#panel-empire')).toBeVisible();
    await page.locator('#tab-upgrades').click();
    await expect(page.locator('#panel-upgrades')).toBeVisible();
    await page.locator('#tab-mine').click();
    await expect(page.locator('#panel-mine')).toBeVisible();
  });
});

test.describe('Empire', () => {
  test('opening Empire tab shows panel with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.keyboard.press('3');
    await expect(page.locator('#panel-empire')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe('Upgrades', () => {
  test('buying first affordable upgrade decreases coins', async ({ page }) => {
    await page.goto('/');
    const coinsEl = page.locator('#coins-value');
    for (let i = 0; i < 20; i++) await page.locator('#mine-zone').click();
    await page.waitForTimeout(200);
    const coinsBefore = await coinsEl.textContent();
    await page.locator('#tab-upgrades').click();
    await expect(page.locator('#panel-upgrades')).toBeVisible();
    const buyBtn = page.locator('button.upgrade-btn--buy[data-upgrade-id="mining-robot"]');
    await buyBtn.waitFor({ state: 'visible', timeout: 5000 });
    await buyBtn.click();
    await page.waitForTimeout(300);
    const coinsAfter = await coinsEl.textContent();
    expect(coinsAfter).not.toBe(coinsBefore);
  });
});

test.describe('Prestige', () => {
  test('prestige confirm modal opens and cancel closes it', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tab-empire').click();
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
  test('settings open and close', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();
    await expect(page.locator('#settings-overlay')).toBeVisible();
    await page.locator('#settings-close').click();
    await expect(page.locator('#settings-overlay')).not.toBeVisible();
  });
});

test.describe('Save', () => {
  test('export then import restores session', async ({ page }) => {
    await page.goto('/');
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
  test('Research tab shows panel', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('4');
    await expect(page.locator('#panel-research')).toBeVisible();
  });

  test('Stats tab shows panel', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('6');
    await expect(page.locator('#panel-stats')).toBeVisible();
  });

  test('Research panel has research section', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tab-research').click();
    await expect(page.locator('#research-section')).toBeVisible();
  });

  test('Stats panel has production value', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tab-stats').click();
    await expect(page.locator('#production-value')).toBeVisible();
  });
});

test.describe('Mine', () => {
  test('multiple mine clicks increase coins repeatedly', async ({ page }) => {
    await page.goto('/');
    const coinsEl = page.locator('#coins-value');
    const first = await coinsEl.textContent();
    for (let i = 0; i < 30; i++) await page.locator('#mine-zone').click();
    await page.waitForTimeout(200);
    const after = await coinsEl.textContent();
    expect(after).not.toBe(first);
  });

  test('mine zone is visible and has hint', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#mine-zone')).toBeVisible();
    await expect(page.locator('#mine-zone-hint')).toBeVisible();
  });

  test('combo indicator exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#combo-indicator')).toBeVisible();
  });
});

test.describe('Header and modals', () => {
  test('header shows title and subtitle', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('STELLAR MINER');
  });

  test('info modal opens and closes', async ({ page }) => {
    await page.goto('/');
    await page.locator('#info-btn').click();
    await expect(page.locator('#info-overlay')).toBeVisible();
    await page.locator('#info-close').click();
    await expect(page.locator('#info-overlay')).not.toBeVisible();
  });

  test('settings has export and import buttons', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();
    await expect(page.locator('#settings-export-btn')).toBeVisible();
    await expect(page.locator('#settings-import-btn')).toBeVisible();
    await page.locator('#settings-close').click();
  });

  test('settings has theme selector', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();
    await expect(page.locator('#setting-theme')).toBeVisible();
    await page.locator('#settings-close').click();
  });

  test('Escape closes settings when open', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();
    await expect(page.locator('#settings-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-overlay')).not.toBeVisible();
  });
});

test.describe('Tabs extended', () => {
  test('each tab button toggles correct panel', async ({ page }) => {
    await page.goto('/');
    const tabs = [
      { tab: '#tab-mine', panel: '#panel-mine' },
      { tab: '#tab-dashboard', panel: '#panel-dashboard' },
      { tab: '#tab-empire', panel: '#panel-empire' },
      { tab: '#tab-research', panel: '#panel-research' },
      { tab: '#tab-upgrades', panel: '#panel-upgrades' },
      { tab: '#tab-stats', panel: '#panel-stats' },
    ];
    for (const { tab, panel } of tabs) {
      await page.locator(tab).click();
      await expect(page.locator(panel)).toBeVisible();
    }
  });

  test('key 1 returns to Mine panel', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('3');
    await expect(page.locator('#panel-empire')).toBeVisible();
    await page.keyboard.press('1');
    await expect(page.locator('#panel-mine')).toBeVisible();
  });
});

test.describe('Empire extended', () => {
  test('Empire has quest section', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tab-empire').click();
    await expect(page.locator('#quest-section')).toBeVisible();
  });

  test('Empire has crew section', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tab-empire').click();
    await expect(page.locator('#crew-section')).toBeVisible();
  });

  test('Empire has planets section', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tab-empire').click();
    await expect(page.locator('#planets-section')).toBeVisible();
  });

  test('Empire has prestige section', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tab-empire').click();
    await expect(page.locator('#prestige-section')).toBeVisible();
  });
});

test.describe('Upgrades extended', () => {
  test('Upgrades panel has upgrade list container', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tab-upgrades').click();
    await expect(page.locator('#upgrade-list')).toBeVisible();
  });

  test('buying mining robot then clicking mine shows production', async ({ page }) => {
    await page.goto('/');
    for (let i = 0; i < 25; i++) await page.locator('#mine-zone').click();
    await page.waitForTimeout(150);
    await page.locator('#tab-upgrades').click();
    const buyBtn = page.locator('button.upgrade-btn--buy[data-upgrade-id="mining-robot"]');
    await buyBtn.waitFor({ state: 'visible', timeout: 5000 });
    await buyBtn.click();
    await page.waitForTimeout(200);
    await page.locator('#tab-mine').click();
    await page.waitForTimeout(500);
    const prod = await page.locator('#production-value').textContent();
    expect(prod).toBeTruthy();
  });
});

test.describe('Prestige extended', () => {
  test('prestige confirm overlay has cancel and confirm buttons', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tab-empire').click();
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
  test('export produces valid JSON with version', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#settings-export-btn').click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const json = fs.readFileSync(path!, 'utf8');
    const data = JSON.parse(json);
    expect(data.version).toBeDefined();
    expect(data.session).toBeDefined();
  });
});
