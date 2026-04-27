import { expect, test, type Locator, type Page } from '@playwright/test';
import { ALL_CARDS } from '../../src/data/combat';
import type { FeelSettings } from '../../src/fx/feelScheduler';
import type { CardId, CardInstanceId, GameEvent, SliceCommand, SliceState } from '../../src/game/types';
import { MOTION } from '../../src/game/motion';

const SAVE_BROWSER_RECEIPTS = process.env.SAVE_BROWSER_RECEIPTS === '1';

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
      selectedCardDetail: string | null;
      selectedCardHint: string | null;
      selectedCardSummary: string | null;
      selectedStatusRule: string | null;
      intentText: string | null;
      gameplayAssets: {
        explorationBackground: null | {
          id: string;
          path: string;
          approvalGate: string;
        };
        combatBackground: null | {
          id: string;
          path: string;
          approvalGate: string;
        };
        cardArt: readonly {
          cardId: string;
          assetId: string;
          path: string;
          approvalGate: string;
        }[];
        enemySprite: null | {
          id: string;
          path: string;
          approvalGate: string;
        };
      };
      feelSettings: FeelSettings;
      lastEvents: readonly GameEvent[];
      dispatch?: (command: SliceCommand) => readonly GameEvent[];
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

  await enterS0Combat(page);

  const combatStarted = await getDebugState(page);
  expect(combatStarted.feelSettings.reducedMotion).toBe(false);
  expect(combatStarted.intentText).toBe('Bite Liese for 6');
  expect(combatStarted.gameplayAssets).toEqual({
    explorationBackground: {
      id: 'underroot.corridor.placeholder',
      path: '/assets/drafts/underroot/batch-01/underroot-corridor-preview-01.png',
      approvalGate: 'approved-for-gameplay',
    },
    combatBackground: {
      id: 'underroot.combat.placeholder',
      path: '/assets/drafts/underroot/batch-01/underroot-combat-preview-01.png',
      approvalGate: 'approved-for-gameplay',
    },
    cardArt: [{
      cardId: 'blood-edge',
      assetId: 'card.blood-edge.placeholder',
      path: '/assets/drafts/underroot/batch-01/blood-edge-preview-01.png',
      approvalGate: 'approved-for-gameplay',
    }],
    enemySprite: {
      id: 'enemy.root-wolf.placeholder',
      path: '/assets/drafts/underroot/batch-02/rootbitten-wolf-preview-01.png',
      approvalGate: 'approved-for-gameplay',
    },
  });
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
    expect(state.combat?.enemy.statuses.mark).toBe(1);
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

  const screenshot = await captureCanvasReceipt(canvas, '.logs/s0-signature-slice.png');
  expect(screenshot.readUInt32BE(16)).toBe(640);
  expect(screenshot.readUInt32BE(20)).toBe(360);
  expect(screenshot.byteLength).toBeGreaterThan(5_000);

  await page.keyboard.press('KeyR');
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('explore');
    expect(state.position).toEqual({ x: 1, y: 3 });
    expect(state.combat).toBeNull();
    expect(state.selectedCardId).toBeNull();
    expect(state.lastEvents).toEqual([]);
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
  await enterS0Combat(page);

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

test('M1 browser smoke: seeded starter route plays a natural 24-card win', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/?scene=m1-combat');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('combat');
    expect(state.seed).toBe('m1-natural-19');
    expect(state.combat?.hand).toHaveLength(5);
    expect(state.combat?.drawPile).toHaveLength(19);
    expect(state.combat?.hand.map((cardId) => state.combat?.cards[cardId]?.defId)).toEqual([
      'ringing-blow',
      'blood-edge',
      'shadow-mark',
      'quiet-rebuke',
      'iron-cut',
    ]);
  });

  await playCardByDefDebug(page, 'shadow-mark');
  await waitForFxDrain(page);
  await playCardByDefDebug(page, 'blood-edge');
  await waitForFxDrain(page);
  await playCardByDefDebug(page, 'iron-cut');
  await waitForFxDrain(page);

  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('victory');
    expect(state.combat?.enemy.hp).toBe(0);
    expect(state.combat?.heroes.find((hero) => hero.id === 'mia')?.debt).toBe(4);
    expect(state.combat?.heroes.find((hero) => hero.id === 'robin')?.debt).toBe(1);
    expect(state.commandLog.map((command) => command.type)).toEqual(['play-card', 'play-card', 'play-card']);
  });
  expect(await page.evaluate(() => window.localStorage.getItem('hollowmark:s0-save'))).toBeNull();

  await page.goto('/?scene=s0');
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('explore');
    expect(state.seed).toBe('s0-root-wolf');
    expect(state.combat).toBeNull();
  });
  expect(pageErrors).toEqual([]);
});

test('M1 browser smoke: natural route survives an enemy turn and refills', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/?scene=m1-combat');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  await selectCardByDef(page, 'ringing-blow');
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);

  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('combat');
    expect(state.combat?.turn).toBe(1);
    expect(state.combat?.energy).toBe(3);
    expect(state.combat?.hand).toHaveLength(5);
    expect(state.combat?.drawPile).toHaveLength(14);
    expect(state.combat?.discardPile).toHaveLength(5);
    expect(state.combat?.enemy.hp).toBe(18);
    expect(state.combat?.enemy.statuses.weak).toBe(0);
    expect(state.combat?.heroes.find((hero) => hero.id === 'liese')?.hp).toBe(27);
    expect(state.lastEvents.map((event) => event.type)).toContain('HAND_REFILLED');
  });
  expect(await page.evaluate(() => window.localStorage.getItem('hollowmark:s0-save'))).toBeNull();
  expect(pageErrors).toEqual([]);
});

test('default route opens the playable Underroot dive from Marrowgate', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('town');
    expect(state.floorId).toBe('underroot-m2-placeholder');
    expect(state.townService).toBe('gate');
    expect(state.completedInteractions).toEqual([]);
  });

  await page.keyboard.press('Space');
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('explore');
    expect(state.position).toEqual({ x: 1, y: 5 });
    expect(state.lastEvents).toContainEqual({ type: 'UNDERROOT_ENTERED' });
  });
});

test('M2 browser smoke: Marrowgate enters Underroot and returns with tile progress', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/?scene=m2-underroot');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('town');
    expect(state.floorId).toBe('underroot-m2-placeholder');
    expect(state.townService).toBe('gate');
    expect(state.completedInteractions).toEqual([]);
  });
  await dispatchDebug(page, { type: 'choose-town-service', service: 'vellum' });
  await expectDebugState(page, (state) => {
    expect(state.townService).toBe('vellum');
    expect(state.lastEvents).toContainEqual({ type: 'TOWN_SERVICE_SELECTED', service: 'vellum' });
  });

  await dispatchDebug(page, { type: 'enter-underroot' });
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('explore');
    expect(state.position).toEqual({ x: 1, y: 5 });
    expect(state.lastEvents).toContainEqual({ type: 'UNDERROOT_ENTERED' });
  });
  await page.keyboard.up('ArrowUp');

  await dispatchDebug(page, { type: 'step-forward' });
  await expect.poll(async () => (await getDebugState(page)).position).toEqual({ x: 1, y: 4 });
  await expectDebugState(page, (state) => {
    expect(state.threatClock).toBe(1);
  });
  await dispatchDebug(page, { type: 'interact' });
  await expectDebugState(page, (state) => {
    expect(state.completedInteractions).toContain('underroot-rest-1');
    expect(state.position).toEqual({ x: 1, y: 4 });
    expect(state.threatClock).toBe(0);
    expect(state.log.at(-1)).toBe('Sanctuary moss steadies the party. The roots go quiet.');
    expect(state.lastEvents).toContainEqual({ type: 'TILE_INTERACTION_COMPLETED', id: 'underroot-rest-1', interaction: 'rest' });
  });

  await dispatchDebug(page, { type: 'step-forward' });
  await expect.poll(async () => (await getDebugState(page)).position).toEqual({ x: 1, y: 3 });
  await dispatchDebug(page, { type: 'step-forward' });
  await expect.poll(async () => (await getDebugState(page)).position).toEqual({ x: 1, y: 2 });
  await dispatchDebug(page, { type: 'interact' });
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('town');
    expect(state.completedInteractions).toEqual(['underroot-rest-1', 'underroot-return-1']);
    expect(state.lastEvents).toContainEqual({ type: 'MARROWGATE_RETURNED' });
  });
  expect(await page.evaluate(() => window.localStorage.getItem('hollowmark:s0-save'))).toBeNull();
  expect(pageErrors).toEqual([]);
});

test('M2 browser smoke: lab run can seal the Underroot boss and show a town result', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/?scene=m2-underroot');
  await expect(page.locator('canvas')).toBeVisible();

  await dispatchDebug(page, { type: 'enter-underroot' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'interact' });
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('explore');
    expect(state.log.at(-1)).toContain('stays shut');
    expect(state.lastEvents).toEqual([{ type: 'INTERACT_NONE' }]);
  });

  await dispatchDebug(page, { type: 'step-back' });
  await dispatchDebug(page, { type: 'step-back' });
  await dispatchDebug(page, { type: 'turn-right' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'interact' });
  await expectDebugState(page, (state) => {
    expect(state.completedInteractions).toContain('underroot-reward-1');
  });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'interact' });
  await dispatchDebug(page, { type: 'turn-left' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'interact' });
  await expect.poll(async () => (await getDebugState(page)).combat?.enemy.id).toBe('underroot-alpha');

  await finishCurrentCombat(page);

  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('town');
    expect(state.completedInteractions).toContain('underroot-boss-1');
    expect(state.log.at(-1)).toBe('Marrowgate bells answer: Warm Shard carried the seal.');
    expect(state.lastEvents).toContainEqual({ type: 'MARROWGATE_RETURNED' });
  });
  expect(pageErrors).toEqual([]);
});

test('M2 browser smoke: shortcut branch folds back to the main seam with debt', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/?scene=m2-underroot');
  await expect(page.locator('canvas')).toBeVisible();

  await dispatchDebug(page, { type: 'enter-underroot' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'turn-right' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'step-forward' });
  await expectDebugState(page, (state) => {
    expect(state.position).toEqual({ x: 3, y: 3 });
    expect(state.townDebt).toBe(0);
  });

  await dispatchDebug(page, { type: 'interact' });
  await expectDebugState(page, (state) => {
    expect(state.position).toEqual({ x: 1, y: 3 });
    expect(state.townDebt).toBe(1);
    expect(state.completedInteractions).toContain('underroot-shortcut-1');
    expect(state.log.at(-1)).toBe('Roots take blood and fold you back to the main seam.');
    expect(state.lastEvents).toContainEqual({ type: 'TILE_INTERACTION_COMPLETED', id: 'underroot-shortcut-1', interaction: 'shortcut' });
  });
  expect(pageErrors).toEqual([]);
});

test('M2 browser smoke: hunting pressure sharpens the next bite', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/?scene=m2-underroot');
  await expect(page.locator('canvas')).toBeVisible();

  await dispatchDebug(page, { type: 'enter-underroot' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'turn-right' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'step-forward' });
  await dispatchDebug(page, { type: 'step-forward' });
  await expectDebugState(page, (state) => {
    expect(state.position).toEqual({ x: 4, y: 3 });
    expect(state.threatClock).toBeGreaterThanOrEqual(8);
  });

  await dispatchDebug(page, { type: 'interact' });
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('combat');
    expect(state.intentText).toBe('Bite Liese for 8');
    expect(state.combat?.enemy.intent).toEqual({ type: 'attack', target: 'liese', amount: 8 });
    expect(state.log).toContain('The roots are hunting. The next bite sharpens.');
  });
  expect(pageErrors).toEqual([]);
});

test('M2 browser smoke: exploration keeps one buffered movement input', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/?scene=m2-underroot');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  await dispatchDebug(page, { type: 'enter-underroot' });
  await expect.poll(async () => (await getDebugState(page)).mode).toBe('explore');

  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyW');

  await expect.poll(async () => {
    const state = await getDebugState(page);
    return { position: state.position, facing: state.facing, commands: state.commandLog.length };
  }).toEqual({
    position: { x: 1, y: 3 },
    facing: 'north',
    commands: 3,
  });

  await page.waitForTimeout(MOTION.explore.forwardMs * 2 + 50);
  await expectDebugState(page, (state) => {
    expect(state.position).toEqual({ x: 1, y: 3 });
    expect(state.facing).toBe('north');
    expect(state.commandLog.map((command) => command.type)).toEqual(['enter-underroot', 'step-forward', 'step-forward']);
  });
  expect(pageErrors).toEqual([]);
});

test('S0 browser smoke: debug dispatch is limited to lab routes', async ({ page }) => {
  await startFresh(page);
  await expect.poll(async () => (await getDebugState(page)).mode).toBe('explore');

  expect(await page.evaluate(() => typeof window.__HOLLOWMARK_DEBUG__?.dispatch)).toBe('undefined');

  await page.goto('/?scene=m2-underroot');
  await expect.poll(async () => (await getDebugState(page)).mode).toBe('town');

  expect(await page.evaluate(() => typeof window.__HOLLOWMARK_DEBUG__?.dispatch)).toBe('function');
});

test('S0 browser smoke: clicking the enemy plays a selected attack', async ({ page }) => {
  await startFresh(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await enterS0Combat(page);

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

test('S0 browser smoke: enemy click only acts on selected enemy cards', async ({ page }) => {
  await startFresh(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await enterS0Combat(page);

  const beforeUnselectedClick = await getDebugState(page);
  await clickGame(page, canvas, 204, 116);
  await expectDebugState(page, (state) => {
    expect(state.combat?.turn).toBe(0);
    expect(state.commandLog).toHaveLength(beforeUnselectedClick.commandLog.length);
    expect(state.commandLog.at(-1)?.type).toBe('interact');
    expect(state.lastEvents.map((event) => event.type)).not.toContain('CARD_PLAYED');
  });

  await selectCardByDef(page, 'mend');
  const beforeOwnerTargetClick = await getDebugState(page);
  await clickGame(page, canvas, 204, 116);
  await expectDebugState(page, (state) => {
    expect(selectedDef(state)).toBe('mend');
    expect(state.commandLog).toHaveLength(beforeOwnerTargetClick.commandLog.length);
    expect(state.combat?.heroes.find((hero) => hero.id === 'eris')?.hp).toBe(24);
  });
});

test('S0 browser smoke: compact card summaries cover the core effect families', async ({ page }) => {
  await startFresh(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await enterS0Combat(page);

  const expectedSummaries: readonly [CardId, string][] = [
    ['iron-cut', 'D6'],
    ['hold-fast', 'Blk8'],
    ['mend', 'H6'],
    ['mark-prey', 'Mk1'],
    ['blood-edge', 'D12 +D4'],
  ];

  for (const [defId, summary] of expectedSummaries) {
    await selectCardByDef(page, defId);
    await expectDebugState(page, (state) => {
      expect(state.selectedCardSummary).toBe(summary);
    });
  }
});

test('S0 browser smoke: combat card affordances capture cleanly', async ({ page }) => {
  await startFresh(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await enterS0Combat(page);
  await selectCardByDef(page, 'blood-edge');

  const screenshot = await captureCanvasReceipt(canvas, '.logs/s0-combat-card-affordances.png');
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
  await enterS0Combat(page);

  await selectCardByDef(page, 'mend');
  await canvas.click();
  await page.keyboard.press('Enter');

  await expect.poll(async () => {
    const state = await getDebugState(page);
    return {
      selected: state.selectedCardId,
      target: cardPlayedTarget(state),
    };
  }).toEqual({ selected: null, target: { kind: 'hero', id: 'eris' } });
});

test('S0 browser smoke: status card selection exposes a readable rule hint', async ({ page }) => {
  await startFresh(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await enterS0Combat(page);

  await selectCardByDef(page, 'mark-prey');

  await expectDebugState(page, (state) => {
    expect(state.selectedCardHint).toContain('Selected Mark Prey');
    expect(state.selectedCardHint).toContain('Mark adds burst damage');
    expect(state.selectedStatusRule).toBe('Mark adds burst damage');
  });
});

test('M1 browser smoke: selected multi-effect cards expose every compact effect', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/?scene=m1-combat');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  await selectCardByDef(page, 'shadow-mark');

  await expectDebugState(page, (state) => {
    expect(state.selectedCardSummary).toBe('Mk1 +D1');
    expect(state.selectedCardDetail).toContain('Shadow Mark');
    expect(state.selectedCardDetail).toContain('Mark 1 / Debt 1');
    expect(state.selectedCardHint).toContain('Mark adds burst damage');
    expect(state.selectedCardHint).toContain('Debt +1');
  });
});

test('M1 browser smoke: long card names fit compactly and expand in selected detail', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/?scene=m1-combat');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  await selectCardByDef(page, 'ringing-blow');
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);
  await selectCardByDef(page, 'sundering-cut');

  await expectDebugState(page, (state) => {
    expect(state.selectedCardSummary).toBe('D4 Vu1');
    expect(state.selectedCardDetail).toContain('Sundering Cut');
    expect(state.selectedCardDetail).toContain('Deal 4 / Vulnerable 1');
  });
});

test('S0 browser smoke: narrow portrait view shows an explicit viewport guard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startFresh(page);

  await expect(page.locator('#viewport-guard')).toBeVisible();
  await expect(page.locator('#viewport-guard')).toContainText('Rotate or widen');
  await expect(page.locator('canvas')).toBeHidden();
});

test('S0 browser smoke: landscape view keeps the integer-scaled canvas playable', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await startFresh(page);

  const canvas = page.locator('canvas');
  await expect(page.locator('#viewport-guard')).toBeHidden();
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveCSS('width', '640px');
  await expect(canvas).toHaveCSS('height', '360px');
});

test('S0 browser smoke: reload restores mid-combat save and can finish', async ({ page }) => {
  await startFreshForRestore(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await enterS0Combat(page);

  await selectCardByDef(page, 'mark-prey');
  await page.keyboard.press('KeyH');
  await clickGame(page, canvas, 354, 249);
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('combat');
    expect(state.combat?.enemy.statuses.mark).toBe(1);
  });

  await page.reload();
  await expect(canvas).toBeVisible();
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('combat');
    expect(state.floorId).toBe('s0-root-wolf-hallway');
    expect(state.position).toEqual({ x: 1, y: 1 });
    expect(state.combat?.enemy.statuses.mark).toBe(1);
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

test('S0 browser smoke: restart during pending combat FX clears scene timers', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await startFresh(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await enterS0Combat(page);

  await selectCardByDef(page, 'mark-prey');
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);
  await selectCardByDef(page, 'blood-edge');
  await page.keyboard.press('Enter');
  await waitForFxDrain(page);
  await selectCardByDef(page, 'iron-cut');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await getDebugState(page)).pendingEvents).toBeGreaterThan(0);

  await page.keyboard.press('KeyR');
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('explore');
    expect(state.combat).toBeNull();
    expect(state.selectedCardId).toBeNull();
    expect(state.lastEvents).toEqual([]);
    expect(state.pendingEvents).toBe(0);
  });

  await page.waitForTimeout(300);
  await expectDebugState(page, (state) => {
    expect(state.mode).toBe('explore');
    expect(state.pendingEvents).toBe(0);
    expect(state.lastEvents).toEqual([]);
  });
  expect(pageErrors).toEqual([]);
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
  await page.goto('/?scene=s0');
}

async function enterS0Combat(page: Page) {
  await getDebugState(page);
  await page.keyboard.press('KeyW');
  await expect.poll(async () => (await getDebugState(page)).position).toEqual({ x: 1, y: 2 });
  await page.keyboard.press('KeyW');
  await expect.poll(async () => (await getDebugState(page)).position).toEqual({ x: 1, y: 1 });
  await page.keyboard.press('Space');
  await expect.poll(async () => (await getDebugState(page)).mode).toBe('combat');
}

async function dispatchDebug(page: Page, command: SliceCommand) {
  await page.evaluate((debugCommand) => {
    const dispatch = window.__HOLLOWMARK_DEBUG__?.dispatch;
    if (!dispatch) throw new Error('Missing Hollowmark debug dispatch');
    dispatch(debugCommand);
  }, command);
}

async function finishCurrentCombat(page: Page) {
  for (let turn = 0; turn < 20; turn += 1) {
    let played = false;
    for (let slot = 0; slot < 5; slot += 1) {
      const state = await getDebugState(page);
      const combat = state.combat;
      if (state.mode !== 'combat' || !combat) return;
      const cardId = combat.hand.find((candidate) => {
        const def = ALL_CARDS.find((card) => card.id === combat.cards[candidate]?.defId);
        return def && def.cost <= combat.energy;
      });
      if (!cardId) break;

      const def = ALL_CARDS.find((card) => card.id === combat.cards[cardId]?.defId);
      if (!def) throw new Error(`Missing card def for ${cardId}`);
      await dispatchDebug(page, def.target.type === 'enemy' ? { type: 'play-card', cardId, target: { kind: 'enemy', id: combat.enemy.id } } : { type: 'play-card', cardId });
      await page.waitForTimeout(25);
      played = true;
      if ((await getDebugState(page)).mode !== 'combat') return;
    }

    if (!played) await dispatchDebug(page, { type: 'end-turn' });
    else await dispatchDebug(page, { type: 'end-turn' });
    await page.waitForTimeout(25);
    const state = await getDebugState(page);
    if (state.mode !== 'combat') return;
  }
  throw new Error('Combat did not finish within 20 turns');
}

async function playCardByDefDebug(page: Page, defId: CardId) {
  const command = await page.evaluate((cardDefId) => {
    const state = window.__HOLLOWMARK_DEBUG__?.state;
    const combat = state?.combat;
    const cardId = combat?.hand.find((id) => combat.cards[id]?.defId === cardDefId);
    if (!combat || !cardId) throw new Error(`Card not in hand: ${cardDefId}`);
    return {
      type: 'play-card' as const,
      cardId,
      target: { kind: 'enemy' as const, id: combat.enemy.id },
    };
  }, defId);

  await dispatchDebug(page, command);
}

async function startFreshForRestore(page: Page) {
  await page.goto('/?scene=s0');
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
  gameplayAssets: {
    explorationBackground: null | {
      id: string;
      path: string;
      approvalGate: string;
    };
    combatBackground: null | {
      id: string;
      path: string;
      approvalGate: string;
    };
    cardArt: readonly {
      cardId: string;
      assetId: string;
      path: string;
      approvalGate: string;
    }[];
    enemySprite: null | {
      id: string;
      path: string;
      approvalGate: string;
    };
  };
  objectCounts: {
    total: number;
    dynamicLabels: number;
    fx: number;
    hitZones: number;
  };
  pendingEvents: number;
  selectedCardId: CardInstanceId | null;
  selectedCardDetail: string | null;
  selectedCardHint: string | null;
  selectedCardSummary: string | null;
  selectedStatusRule: string | null;
  feelSettings: FeelSettings;
  lastEvents: readonly GameEvent[];
};

async function getDebugState(page: Page): Promise<SliceState & DebugState> {
  await page.waitForFunction(() => window.__HOLLOWMARK_DEBUG__);
  const debug = await page.evaluate(() => window.__HOLLOWMARK_DEBUG__);
  if (!debug) throw new Error('Missing Hollowmark debug state');
  return {
    ...debug.state,
    intentText: debug.intentText,
    gameplayAssets: debug.gameplayAssets,
    objectCounts: debug.objectCounts,
    pendingEvents: debug.pendingEvents,
    selectedCardId: debug.selectedCardId,
    selectedCardDetail: debug.selectedCardDetail,
    selectedCardHint: debug.selectedCardHint,
    selectedCardSummary: debug.selectedCardSummary,
    selectedStatusRule: debug.selectedStatusRule,
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

async function captureCanvasReceipt(canvas: Locator, path: string): Promise<Buffer> {
  return canvas.screenshot(SAVE_BROWSER_RECEIPTS ? { path } : {});
}
