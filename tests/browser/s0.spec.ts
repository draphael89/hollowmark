import { expect, test } from '@playwright/test';
import type { SliceState } from '../../src/game/types';

test('S0 browser smoke: move, start combat, play debt card', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();

  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('Space');
  await page.keyboard.press('Digit5');
  await page.screenshot({ path: '.logs/s0-signature-slice.png' });
  await page.keyboard.press('Enter');

  const debug = await page.evaluate(() => {
    const windowWithDebug = window as unknown as { __HOLLOWMARK_DEBUG__?: { state: SliceState } };
    return windowWithDebug.__HOLLOWMARK_DEBUG__?.state;
  });

  expect(debug?.mode).toBe('combat');
  expect(debug?.position).toEqual({ x: 1, y: 1 });
  expect(debug?.combat?.enemy.hp).toBe(12);
  expect(debug?.combat?.heroes.find((hero) => hero.id === 'mia')?.debt).toBe(4);

});
