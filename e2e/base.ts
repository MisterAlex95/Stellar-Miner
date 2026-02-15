import { test as base } from '@playwright/test';

/** Intro "Got it" button is disabled for 5s (INTRO_READY_DELAY_MS). */
const INTRO_READY_MS = 5500;

/**
 * Dismiss the welcome intro overlay if present (blocks clicks for 5s on first load).
 */
async function dismissIntroIfPresent(
  page: import('@playwright/test').Page
): Promise<void> {
  const overlay = page.locator('#intro-overlay.intro-overlay--open');
  await overlay.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  if ((await overlay.count()) === 0) return;
  await page.locator('#intro-got-it').waitFor({ state: 'visible', timeout: 6000 });
  await page.waitForTimeout(INTRO_READY_MS);
  await page.locator('#intro-got-it').click();
  await overlay.waitFor({ state: 'hidden', timeout: 3000 });
  await page.locator('#tab-mine').focus();
}

type Fixtures = {
  gotoApp: () => Promise<void>;
};

export const test = base.extend<Fixtures>({
  gotoApp: async ({ page }, use) => {
    await use(async () => {
      await page.goto('/');
      await dismissIntroIfPresent(page);
    });
  },
});

export { expect } from '@playwright/test';
