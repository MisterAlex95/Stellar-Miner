import { test, expect } from '@playwright/test';

test('app loads and shows title', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('STELLAR MINER');
});

test('mine zone is clickable and coins update', async ({ page }) => {
  await page.goto('/');
  const coinsEl = page.locator('#coins-value');
  const initial = await coinsEl.textContent();
  await page.locator('#mine-zone').click();
  await page.locator('#mine-zone').click();
  await page.waitForTimeout(300);
  const after = await coinsEl.textContent();
  expect(after).not.toBe(initial);
});

test('tabs switch with keyboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#panel-mine')).toBeVisible();
  await page.keyboard.press('2');
  await expect(page.locator('#panel-base')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('#panel-mine')).toBeVisible();
});
