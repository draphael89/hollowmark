import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { DevSceneDebug, DevSceneKey } from '../../src/scenes/devSceneDebug';

declare global {
  interface Window {
    __HOLLOWMARK_DEV_SCENE__?: DevSceneDebug;
  }
}

const routes: readonly DevSceneKey[] = ['combat-sandbox', 'dungeon-sandbox', 'visual-gallery'];

for (const route of routes) {
  test(`dev scene boots: ${route}`, async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await startDevScene(page, route);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveJSProperty('width', 640);
    await expect(canvas).toHaveJSProperty('height', 360);

    const debug = await getDevDebug(page);
    expect(debug.scene).toBe(route);
    expect(debug.label.length).toBeGreaterThan(0);
    expect(debug.objectCount).toBeGreaterThan(0);
    expect(debug.objectCount).toBeLessThan(80);
    expect(pageErrors).toEqual([]);
  });
}

test('combat sandbox previews cues without rebuilding the shell', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await startDevScene(page, 'combat-sandbox');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const baseline = (await getDevDebug(page)).objectCount;

  await canvas.click();
  await page.keyboard.press('Digit2');
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('2 Heavy hit');
  await page.keyboard.press('Digit4');
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('4 Debt');

  const after = await getDevDebug(page);
  expect(after.objectCount).toBeGreaterThanOrEqual(baseline);
  expect(after.objectCount).toBeLessThan(90);
  expect(pageErrors).toEqual([]);
});

test('visual audit receipts render S0 and dev scenes at 640x360', async ({ page }) => {
  await mkdir('.logs/visual-audits', { recursive: true });
  await page.addInitScript(() => window.localStorage.clear());

  const receipts: readonly { name: string; url: string }[] = [
    { name: 's0', url: '/' },
    { name: 'combat-sandbox', url: '/?scene=combat-sandbox' },
    { name: 'dungeon-sandbox', url: '/?scene=dungeon-sandbox' },
    { name: 'visual-gallery', url: '/?scene=visual-gallery' },
  ];

  for (const receipt of receipts) {
    await page.goto(receipt.url);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const screenshot = await canvas.screenshot({ path: `.logs/visual-audits/${receipt.name}.png` });
    expect(screenshot.readUInt32BE(16)).toBe(640);
    expect(screenshot.readUInt32BE(20)).toBe(360);
    expect(screenshot.byteLength).toBeGreaterThan(2_000);
  }
});

async function startDevScene(page: Page, route: DevSceneKey) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto(`/?scene=${route}`);
}

async function getDevDebug(page: Page): Promise<DevSceneDebug> {
  const debug = await page.evaluate(() => window.__HOLLOWMARK_DEV_SCENE__);
  if (!debug) throw new Error('Missing Hollowmark dev scene debug state');
  return debug;
}
