import { expect, test, type Locator, type Page } from '@playwright/test';
import type { FeelSettings } from '../../src/fx/feelScheduler';
import type { CardId, CardInstanceId, GameEvent, SliceState } from '../../src/game/types';

declare global {
  interface Window {
    __HOLLOWMARK_DEBUG__?: {
      objectCounts: {
        total: number;
        dynamicLabels: number;
        fx: number;
        hitZones: number;
      };
      pendingEvents: number;
      state: SliceState;
      selectedCardId: CardInstanceId | null;
      intentText: string | null;
      feelSettings: FeelSettings;
      lastEvents: readonly GameEvent[];
    };
  }
}

test('S0 browser smoke: move, hold, win, and capture canvas receipt', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await startFresh(page);
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
  expect(combatStarted.feelSettings.reducedMotion).toBe(false);
  expect(combatStarted.intentText).toBe('Bite Liese for 6');
  const baselineObjects = combatStarted.objectCounts.total;
  expect(combatStarted.objectCounts.fx).toBe(0);
  await page.keyboard.press('KeyS');
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('combat');
    expect(state.position).toEqual({ x: 1, y: 1 });
    expect(state.commandLog.at(-1)).toEqual({ type: 'step-back' });
  });
  await clickGame(page, canvas, 263, 249);
  await expectDebugState(page, (state) => {
    expect(state.combat?.heroes.find((hero) => hero.id === 'liese')?.hp).toBe(25);
    expect(state.combat?.turn).toBe(1);
  });
  await expect.poll(async () => (await getDebugState(page)).pendingEvents).toBeGreaterThan(0);
  await expect.poll(async () => {
    const state = await getDebugState(page);
    return { fx: state.objectCounts.fx, pending: state.pendingEvents };
  }).toEqual({ fx: 0, pending: 0 });

  await selectCardByDef(page, 'mark-prey');
  await clickGame(page, canvas, 354, 249);
  await expectDebugState(page, (state) => {
    expect(heldDef(state)).toBe('mark-prey');
    expect(state.selectedCardId).toBeNull();
  });

  await clickGame(page, canvas, 354, 249);
  await expectDebugState(page, (state) => {
    expect(selectedDef(state)).toBe('mark-prey');
  });
  await assertObjectCountIsBounded(page, baselineObjects, 6);
  for (let index = 0; index < 5; index += 1) {
    await selectCardByDef(page, 'iron-cut');
    await selectCardByDef(page, 'hold-fast');
  }
  await assertObjectCountIsBounded(page, baselineObjects, 6);
  await clickGame(page, canvas, 354, 249);
  await expectDebugState(page, (state) => {
    expect(selectedDef(state)).toBe('mark-prey');
  });
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);
  await expectDebugState(page, (state) => {
    expect(state.combat?.enemy.marked).toBe(true);
  });

  await selectCardByDef(page, 'blood-edge');
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);
  await expectDebugState(page, (state) => {
    expect(state.selectedCardId).toBeNull();
    expect(state.combat?.enemy.hp).toBe(6);
  });
  await selectCardByDef(page, 'iron-cut');
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);

  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('victory');
    expect(state.position).toEqual({ x: 1, y: 1 });
    expect(state.combat?.enemy.hp).toBe(0);
    expect(state.combat?.held).toBeNull();
    expect(state.combat?.heroes.find((hero) => hero.id === 'mia')?.debt).toBe(4);
    expect(state.objectCounts.hitZones).toBe(0);
    expect(state.objectCounts.total).toBeLessThanOrEqual(baselineObjects + 6);
  });

  const screenshot = await canvas.screenshot({ path: '.logs/s0-signature-slice.png' });
  expect(screenshot.readUInt32BE(16)).toBe(640);
  expect(screenshot.readUInt32BE(20)).toBe(360);
  expect(screenshot.byteLength).toBeGreaterThan(5_000);

  await page.keyboard.press('KeyR');
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('explore');
    expect(state.position).toEqual({ x: 1, y: 3 });
    expect(state.combat).toBeNull();
    expect(state.selectedCardId).toBeNull();
  });
  await expect.poll(async () => (await getDebugState(page)).pendingEvents).toBe(0);
  expect(await page.evaluate(() => window.localStorage.getItem('hollowmark:s0-save'))).toBeNull();
  expect(pageErrors).toEqual([]);
});

test('S0 browser smoke: repeated end turns drain FX and render defeat', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await startFresh(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('Space');

  const baselineObjects = (await getDebugState(page)).objectCounts.total;
  for (let turn = 0; turn < 24; turn += 1) {
    const state = await getDebugState(page);
    if (state.mode === 'defeat') break;
    await clickGame(page, canvas, 263, 249);
    await expect.poll(async () => (await getDebugState(page)).pendingEvents).toBeGreaterThan(0);
    await waitForFxDrain(page);
  }

  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('defeat');
    expect(state.objectCounts.hitZones).toBe(0);
    expect(state.objectCounts.total).toBeLessThanOrEqual(baselineObjects + 8);
  });
  expect(pageErrors).toEqual([]);
});

test('S0 browser smoke: clicking the enemy plays a selected attack', async ({ page }) => {
  await startFresh(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('Space');

  await selectCardByDef(page, 'iron-cut');
  await expectDebugState(page, (state) => {
    expect(selectedDef(state)).toBe('iron-cut');
  });
  await clickGame(page, canvas, 204, 116);
  await waitForFxDrain(page);

  await expectDebugState(page, (state) => {
    expect(state.selectedCardId).toBeNull();
    expect(state.combat?.enemy.hp).toBe(16);
    expect(cardPlayedTarget(state)).toEqual({ kind: 'enemy', id: 'root-wolf' });
  });
});

test('S0 browser smoke: combat card affordances capture cleanly', async ({ page }) => {
  await startFresh(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('Space');
  await selectCardByDef(page, 'blood-edge');

  const screenshot = await canvas.screenshot({ path: '.logs/s0-combat-card-affordances.png' });
  expect(screenshot.readUInt32BE(16)).toBe(640);
  expect(screenshot.readUInt32BE(20)).toBe(360);
  expect(screenshot.byteLength).toBeGreaterThan(5_000);
  await expectDebugState(page, (state) => {
    expect(state.objectCounts.total).toBeLessThan(90);
    expect(selectedDef(state)).toBe('blood-edge');
  });
});

test('S0 browser smoke: owner-target cards emit their owner target', async ({ page }) => {
  await startFresh(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('Space');

  await selectCardByDef(page, 'mend');
  await page.keyboard.press('Enter');

  await expect.poll(async () => cardPlayedTarget(await getDebugState(page))).toEqual({ kind: 'hero', id: 'eris' });
  await expectDebugState(page, (state) => {
    expect(state.selectedCardId).toBeNull();
  });
});

test('S0 browser smoke: reload restores mid-combat save and can finish', async ({ page }) => {
  await startFreshForRestore(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('Space');

  await selectCardByDef(page, 'mark-prey');
  await page.keyboard.press('KeyH');
  await clickGame(page, canvas, 354, 249);
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('combat');
    expect(state.combat?.enemy.marked).toBe(true);
  });

  await page.reload();
  await expect(canvas).toBeVisible();
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('combat');
    expect(state.floorId).toBe('s0-root-wolf-hallway');
    expect(state.position).toEqual({ x: 1, y: 1 });
    expect(state.combat?.enemy.marked).toBe(true);
    expect(state.combat?.energy).toBe(2);
  });

  await selectCardByDef(page, 'blood-edge');
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);
  await selectCardByDef(page, 'iron-cut');
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);

  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('victory');
    expect(state.combat?.enemy.hp).toBe(0);
    expect(state.combat?.heroes.find((hero) => hero.id === 'mia')?.debt).toBe(4);
  });
});

test('S0 browser smoke: reduced motion setting is applied at boot', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startFresh(page);

  const state = await getDebugState(page);
  expect(state.feelSettings).toEqual({ reducedMotion: true, frameBudget: 'normal' });
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

async function startFresh(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
}

async function startFreshForRestore(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function selectCardByDef(page: Page, defId: CardId) {
  const key = await page.evaluate((cardDefId) => {
    const state = window.__HOLLOWMARK_DEBUG__?.state;
    const hand = state?.combat?.hand;
    const cards = state?.combat?.cards;
    const index = hand?.findIndex((cardId) => cards?.[cardId]?.defId === cardDefId) ?? -1;
    if (index < 0) throw new Error(`Card not in hand: ${cardDefId}`);
    return `Digit${index + 1}`;
  }, defId);

  await page.keyboard.press(key);
  await expect.poll(async () => selectedDef(await getDebugState(page))).toBe(defId);
}

async function expectDebugState(
  page: Page,
  assert: (state: SliceState & DebugState) => void,
) {
  assert(await getDebugState(page));
}

type DebugState = {
  intentText: string | null;
  objectCounts: {
    total: number;
    dynamicLabels: number;
    fx: number;
    hitZones: number;
  };
  pendingEvents: number;
  selectedCardId: CardInstanceId | null;
  feelSettings: FeelSettings;
  lastEvents: readonly GameEvent[];
};

async function getDebugState(page: Page): Promise<SliceState & DebugState> {
  const debug = await page.evaluate(() => window.__HOLLOWMARK_DEBUG__);
  if (!debug) throw new Error('Missing Hollowmark debug state');
  return {
    ...debug.state,
    intentText: debug.intentText,
    objectCounts: debug.objectCounts,
    pendingEvents: debug.pendingEvents,
    selectedCardId: debug.selectedCardId,
    feelSettings: debug.feelSettings,
    lastEvents: debug.lastEvents,
  };
}

function selectedDef(state: SliceState & DebugState) {
  if (!state.selectedCardId || !state.combat) return null;
  return state.combat.cards[state.selectedCardId]?.defId ?? null;
}

function heldDef(state: SliceState & DebugState) {
  if (!state.combat?.held) return null;
  return state.combat.cards[state.combat.held]?.defId ?? null;
}

function cardPlayedTarget(state: SliceState & DebugState) {
  const event = state.lastEvents.find((candidate) => candidate.type === 'CARD_PLAYED');
  return event?.type === 'CARD_PLAYED' ? event.target : null;
}

async function assertObjectCountIsBounded(page: Page, baseline: number, allowance: number) {
  const state = await getDebugState(page);
  expect(state.objectCounts.fx).toBe(0);
  expect(state.objectCounts.total).toBeLessThanOrEqual(baseline + allowance);
}

async function waitForFxDrain(page: Page) {
  await expect
    .poll(async () => {
      const state = await getDebugState(page);
      return { fx: state.objectCounts.fx, pending: state.pendingEvents };
    }, { timeout: 15_000 })
    .toEqual({ fx: 0, pending: 0 });
}
