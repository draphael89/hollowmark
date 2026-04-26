import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { DevSceneDebug, DevSceneKey } from '../../src/scenes/devSceneDebug';

declare global {
  interface Window {
    __HOLLOWMARK_DEV_SCENE__?: DevSceneDebug;
  }
}

const routes: readonly DevSceneKey[] = ['combat-sandbox', 'dungeon-sandbox', 'visual-gallery', 'scenario-lab'];
const SAVE_VISUAL_AUDITS = process.env.SAVE_VISUAL_AUDITS === '1';

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
  await page.keyboard.press('Digit7');
  await expect.poll(async () => (await getDevDebug(page)).label).toMatch(/^7 sandbox-m1-[1-9]\d*$/);
  let sandbox = (await getDevDebug(page)).combatSandbox;
  expect(sandbox?.hand).toHaveLength(5);
  expect(sandbox?.drawPileCount).toBe(19);
  expect(sandbox?.enemyHp).toBe(22);
  expect(new Set(sandbox?.hand).size).toBe(sandbox?.hand.length);
  expect(sandbox?.selectedCard).toEqual(expect.objectContaining({
    slot: 'Q',
    id: sandbox?.hand[0],
    cost: expect.any(Number),
    target: expect.stringMatching(/enemy|owner/),
  }));
  await page.keyboard.press('Digit8');
  await expect.poll(async () => (await getDevDebug(page)).label).toMatch(/^Q /);

  const after = await getDevDebug(page);
  sandbox = after.combatSandbox;
  expect(sandbox?.hand.length).toBeLessThan(5);
  expect(sandbox?.hand.length).toBeGreaterThanOrEqual(3);
  expect(sandbox?.discardPileCount).toBeGreaterThan(0);
  expect(sandbox?.lastEvents.length).toBeGreaterThan(0);
  expect(after.objectCount).toBeGreaterThanOrEqual(baseline);
  expect(after.objectCount).toBeLessThan(90);
  expect(pageErrors).toEqual([]);
});

test('combat sandbox previews a status-heavy M1 board', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await startDevScene(page, 'combat-sandbox');
  const canvas = page.locator('canvas');
  await canvas.click();
  await page.keyboard.press('Digit0');
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('0 Status stack');

  const debug = await getDevDebug(page);
  expect(debug.combatSandbox).toEqual(expect.objectContaining({
    enemyHp: 19,
    enemyStatuses: 'Po2 Bl2',
  }));
  expect(debug.combatSandbox?.enemyStatusStacks).toEqual(expect.objectContaining({
    poison: 2,
    bleed: 2,
  }));
  expect(debug.combatSandbox?.heroStatuses.liese).toEqual(expect.objectContaining({
    ward: 1,
  }));
  expect(debug.combatSandbox?.heroDebt.mia).toBe(1);
  expect(debug.combatSandbox?.lastEvents).toEqual(expect.arrayContaining([
    'status:ward+1',
    'status:poison+2',
    'status:bleed+2',
    'debt:mia+1',
  ]));
  expect(debug.combatSandbox?.statusLegend).toEqual([
    'Poison: Poison ticks before action',
    'Bleed: Bleed opens on HP hits',
    'Weak: Weak softens next hit',
    'Vulnerable: Vulnerable amplifies next hit',
    'Mark: Mark adds burst damage',
    'Ward: Ward prevents one hit',
  ]);
  expect(pageErrors).toEqual([]);
});

test('combat sandbox exposes M1 hand play, hold, and turn state for playtests', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await startDevScene(page, 'combat-sandbox');
  const canvas = page.locator('canvas');
  await canvas.click();

  await page.keyboard.press('KeyH');
  let debug = await getDevDebug(page);
  expect(debug.label).toMatch(/^H /);
  expect(debug.combatSandbox?.held).not.toBeNull();
  expect(debug.combatSandbox?.lastEvents.some((event) => event.startsWith('hold:'))).toBe(true);

  await page.keyboard.press('KeyW');
  debug = await getDevDebug(page);
  expect(debug.label).toMatch(/^W /);
  expect(debug.combatSandbox?.selectedCard).toEqual(expect.objectContaining({
    slot: 'W',
    id: debug.combatSandbox?.hand[1],
    name: expect.any(String),
    text: expect.any(String),
  }));

  await canvas.click({ position: { x: 214, y: 122 } });
  debug = await getDevDebug(page);
  expect(debug.label).toMatch(/^E /);
  expect(debug.combatSandbox?.selectedCard).toEqual(expect.objectContaining({
    slot: 'E',
    id: debug.combatSandbox?.hand[2],
  }));

  await page.keyboard.press('Enter');
  debug = await getDevDebug(page);
  expect(debug.label).toMatch(/^E /);
  expect(debug.combatSandbox?.lastEvents.length).toBeGreaterThan(0);

  await page.keyboard.press('Digit9');
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('9 End turn');
  debug = await getDevDebug(page);
  expect(debug.combatSandbox?.hand).toHaveLength(5);
  expect(debug.combatSandbox?.lastEvents).toContain('player_turn_started');
  expect(pageErrors).toEqual([]);
});

test('scenario lab previews golden scenario metrics', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await startDevScene(page, 'scenario-lab');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  let debug = await getDevDebug(page);
  expect(debug.label).toBe('s0-one-hallway-fight');

  await canvas.click();
  await page.keyboard.press('Digit4');
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('corruption-bargain');
  debug = await getDevDebug(page);
  expect(debug.scenarioLab).toEqual(expect.objectContaining({
    id: 'corruption-bargain',
    verdict: 'pass',
    kind: 'replay',
    outcome: 'combat',
    debtGained: 4,
    damageTaken: 0,
  }));
  await page.keyboard.press('Digit8');
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('m1-poison-lethal');
  debug = await getDevDebug(page);
  expect(debug.scenarioLab).toEqual(expect.objectContaining({
    id: 'm1-poison-lethal',
    verdict: 'pass',
    kind: 'fixture',
    outcome: 'victory',
    debtGained: 1,
    damageTaken: 0,
  }));
  expect(debug.scenarioLab?.gates).toContainEqual({ label: 'fixture, not shuffle proof', passed: true });
  await page.keyboard.press('Digit0');
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('m1-bad-shuffle-recovery');
  debug = await getDevDebug(page);
  expect(debug.scenarioLab).toEqual(expect.objectContaining({
    id: 'm1-bad-shuffle-recovery',
    verdict: 'pass',
    kind: 'replay',
    outcome: 'victory',
  }));
  expect(debug.scenarioLab?.gatesPassed).toBe(debug.scenarioLab?.gatesTotal);
  expect(debug.scenarioLab?.gates).toContainEqual({ label: 'natural M1 replay', passed: true });
  expect(debug.objectCount).toBeGreaterThan(0);
  expect(debug.objectCount).toBeLessThan(80);
  expect(pageErrors).toEqual([]);
});

test('visual gallery exposes stable placeholder manifest selection', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await startDevScene(page, 'visual-gallery');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.click();

  let debug = await getDevDebug(page);
  expect(debug.visualGallery).toEqual(expect.objectContaining({
    assetCount: 5,
    selectedId: 'underroot.corridor.placeholder',
    selectedKind: 'background',
    selectedStatus: 'processed',
    selectedReviewFocus: 'depth, tile read, no text',
  }));
  expect(debug.visualGallery?.stableIds).toEqual([
    'underroot.corridor.placeholder',
    'underroot.combat.placeholder',
    'enemy.root-wolf.placeholder',
    'card.blood-edge.placeholder',
    'ui.ornaments.placeholder',
  ]);

  await page.keyboard.press('Digit4');
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('card.blood-edge.placeholder');
  debug = await getDevDebug(page);
  expect(debug.visualGallery).toEqual(expect.objectContaining({
    selectedId: 'card.blood-edge.placeholder',
    selectedKind: 'card-art',
    selectedReviewFocus: 'temptation, danger, crop safety',
  }));

  await page.keyboard.press('Digit5');
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('ui.ornaments.placeholder');
  await canvas.click({ position: { x: 162, y: 158 } });
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('enemy.root-wolf.placeholder');
  debug = await getDevDebug(page);
  expect(debug.visualGallery).toEqual(expect.objectContaining({
    selectedId: 'enemy.root-wolf.placeholder',
    selectedReviewFocus: 'silhouette, intent read, hit flash',
  }));
  expect(pageErrors).toEqual([]);
});

test('dungeon sandbox exposes S0 view-slot review poses', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await startDevScene(page, 'dungeon-sandbox');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.click();

  let debug = await getDevDebug(page);
  expect(debug.dungeonSandbox).toEqual(expect.objectContaining({
    floorId: 's0-root-wolf-hallway',
    position: '1,3',
    facing: 'north',
    currentPurpose: 'start',
  }));
  expect(debug.dungeonSandbox?.slots).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'current', coord: '1,3', walkable: true, purpose: 'start' }),
    expect.objectContaining({ id: 'front', coord: '1,2', walkable: true, threat: 'uneasy', purpose: 'approach' }),
  ]));

  await page.keyboard.press('Digit3');
  await expect.poll(async () => (await getDevDebug(page)).label).toBe('1,1:east');
  debug = await getDevDebug(page);
  expect(debug.dungeonSandbox).toEqual(expect.objectContaining({
    position: '1,1',
    facing: 'east',
    currentPurpose: 'encounter',
  }));
  expect(debug.dungeonSandbox?.slots).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'front', coord: '2,1', walkable: true, purpose: 'side-path' }),
    expect.objectContaining({ id: 'left', coord: '2,0', walkable: false, purpose: null }),
  ]));
  expect(pageErrors).toEqual([]);
});

test('visual audit receipts render S0 and dev scenes at 640x360', async ({ page }) => {
  if (SAVE_VISUAL_AUDITS) await mkdir('.logs/visual-audits', { recursive: true });
  await page.addInitScript(() => window.localStorage.clear());

  const receipts: readonly { name: string; url: string }[] = [
    { name: 's0', url: '/' },
    { name: 'combat-sandbox', url: '/?scene=combat-sandbox' },
    { name: 'dungeon-sandbox', url: '/?scene=dungeon-sandbox' },
    { name: 'visual-gallery', url: '/?scene=visual-gallery' },
    { name: 'scenario-lab', url: '/?scene=scenario-lab' },
  ];

  for (const receipt of receipts) {
    await page.goto(receipt.url);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const screenshot = await canvas.screenshot(SAVE_VISUAL_AUDITS ? { path: `.logs/visual-audits/${receipt.name}.png` } : {});
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
