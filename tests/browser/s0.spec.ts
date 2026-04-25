import { expect, test, type Locator, type Page } from '@playwright/test';
import type { CardId, SliceState } from '../../src/game/types';

declare global {
  interface Window {
    __HOLLOWMARK_DEBUG__?: {
      state: SliceState;
      selectedCardId: CardId | null;
    };
  }
}

test('S0 browser smoke: move, hold, win, and capture canvas receipt', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveJSProperty('width', 640);
  await expect(canvas).toHaveJSProperty('height', 360);
  await expect(canvas).toHaveCSS('width', '640px');
  await expect(canvas).toHaveCSS('height', '360px');

  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('Space');

  const combatStarted = await getDebugState(page);
  await page.keyboard.press('KeyS');
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('combat');
    expect(state.position).toEqual({ x: 1, y: 1 });
    expect(state.commandLog).toHaveLength(combatStarted.commandLog.length);
  });

  await page.keyboard.press('Digit4');
  await clickGame(page, canvas, 354, 249);
  await expectDebugState(page, (state) => {
    expect(state.combat?.held?.id).toBe('mark-prey');
    expect(state.selectedCardId).toBeNull();
  });

  await clickGame(page, canvas, 354, 249);
  await expectDebugState(page, (state) => {
    expect(state.selectedCardId).toBe('mark-prey');
  });
  await clickGame(page, canvas, 204, 116);

  await page.keyboard.press('Digit4');
  await page.keyboard.press('Enter');
  await clickGame(page, canvas, 271, 282);
  await expectDebugState(page, (state) => {
    expect(state.selectedCardId).toBeNull();
    expect(state.combat?.enemy.hp).toBe(6);
  });
  await page.keyboard.press('Digit1');
  await page.keyboard.press('Enter');

  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('victory');
    expect(state.position).toEqual({ x: 1, y: 1 });
    expect(state.combat?.enemy.hp).toBe(0);
    expect(state.combat?.held).toBeNull();
    expect(state.combat?.heroes.find((hero) => hero.id === 'mia')?.debt).toBe(4);
  });

  const screenshot = await canvas.screenshot({ path: '.logs/s0-signature-slice.png' });
  expect(screenshot.readUInt32BE(16)).toBe(640);
  expect(screenshot.readUInt32BE(20)).toBe(360);
  expect(screenshot.byteLength).toBeGreaterThan(5_000);
  expect(pageErrors).toEqual([]);
});

async function clickGame(page: Page, canvas: Locator, x: number, y: number) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Missing canvas bounds');

  const size = await canvas.evaluate((element) => ({
    width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height,
  }));

  await page.mouse.click(box.x + (x * box.width) / size.width, box.y + (y * box.height) / size.height);
}

async function expectDebugState(page: Page, assert: (state: SliceState & { selectedCardId: CardId | null }) => void) {
  assert(await getDebugState(page));
}

async function getDebugState(page: Page): Promise<SliceState & { selectedCardId: CardId | null }> {
  const debug = await page.evaluate(() => window.__HOLLOWMARK_DEBUG__);
  if (!debug) throw new Error('Missing Hollowmark debug state');
  return { ...debug.state, selectedCardId: debug.selectedCardId };
}
