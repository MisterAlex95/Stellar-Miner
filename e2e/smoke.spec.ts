import { test, expect } from './base.js';

test('app loads and shows title', async ({ page, gotoApp }) => {
  await gotoApp();
  await expect(page.locator('h1')).toContainText('STELLAR MINER');
});

test('mine zone is clickable and coins update', async ({ page, gotoApp }) => {
  await gotoApp();
  const coinsEl = page.locator('#coins-value');
  const initial = await coinsEl.textContent();
  await page.locator('#mine-zone').click();
  await page.locator('#mine-zone').click();
  await page.waitForTimeout(300);
  const after = await coinsEl.textContent();
  expect(after).not.toBe(initial);
});

test('Space key mines and increases coins', async ({ page, gotoApp }) => {
  await gotoApp();
  const coinsEl = page.locator('#coins-value');
  const initial = await coinsEl.textContent();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const after = await coinsEl.textContent();
  expect(after).not.toBe(initial);
});

test('tabs switch with keyboard', async ({ page, gotoApp }) => {
  await gotoApp();
  await expect(page.locator('#panel-mine')).toBeVisible();
  await page.keyboard.press('2');
  await expect(page.locator('#panel-dashboard')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('#panel-mine')).toBeVisible();
});

test("What's new and settings buttons are visible", async ({ page, gotoApp }) => {
  await gotoApp();
  await expect(page.locator('#info-btn')).toBeVisible();
  await expect(page.locator('#settings-btn')).toBeVisible();
});
