export type Rect = Readonly<{
  x: number;
  y: number;
  w: number;
  h: number;
}>;

export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export const VIEWPORT = {
  x: 8,
  y: 8,
  w: 392,
  h: 220,
} as const satisfies Rect;

export const TRAY = {
  x: 8,
  y: 236,
  w: 392,
  h: 78,
} as const satisfies Rect;

export const SIDE_PANEL = {
  x: 408,
  y: 8,
  w: 224,
  h: 306,
} as const satisfies Rect;

export const S0_LAYOUT = {
  panel: {
    border: 2,
    innerBorder: 1,
    innerInset: 3,
  },
  viewport: {
    innerPad: 4,
    exploreBackWall: { x: 68, y: 42, w: 272, h: 170 },
    exploreMouth: { x: 96, y: 72, w: 216, h: 108 },
    leftWall: { x1: 64, y1: 215, x2: 204, y2: 36, x3: 344, y3: 215 },
    leftWing: { x1: 8, y1: 228, x2: 204, y2: 36, x3: 64, y3: 215 },
    rightWing: { x1: 400, y1: 228, x2: 204, y2: 36, x3: 344, y3: 215 },
    rootLines: { startX: 122, endX: 300, stepX: 34, topY: 55, dx: -22, bottomY: 190 },
    huntedWolf: { x: 204, y: 145, w: 86, h: 44 },
    huntedEyeLeft: { x: 188, y: 130, radius: 3 },
    huntedEyeRight: { x: 220, y: 130, radius: 3 },
    huntedName: { x: 165, y: 94 },
    huntedIntent: { x: 170, y: 108 },
    facingLabel: { x: 18, y: 18 },
  },
  combat: {
    room: { x: 32, y: 46, w: 344, h: 156 },
    backWall: { x: 48, y: 74, w: 312, h: 112 },
    floorShadow: { x: 204, y: 176, w: 192, h: 28 },
    enemyShadow: { x: 204, y: 150, w: 114, h: 56 },
    enemyBody: { x1: 146, y1: 150, x2: 204, y2: 70, x3: 262, y3: 150 },
    enemyEyeLeft: { x: 187, y: 119, radius: 4 },
    enemyEyeRight: { x: 221, y: 119, radius: 4 },
    enemyHitBox: { x: 148, y: 64, w: 112, h: 104 },
    enemyName: { x: 154, y: 48 },
    enemyHp: { x: 178, y: 174 },
    enemyIntent: { x: 160, y: 30 },
    victoryLabel: { x: 72, y: 196 },
    defeatLabel: { x: 74, y: 196 },
  },
  tray: {
    log: { x: TRAY.x + 10, y: TRAY.y + 12 },
    exploreHint: { x: TRAY.x + 10, y: TRAY.y + 58 },
    outcomeTitle: { x: TRAY.x + 10, y: TRAY.y + 10 },
    outcomeLine: { x: TRAY.x + 10, y: TRAY.y + 26 },
    outcomeLog: { x: TRAY.x + 10, y: TRAY.y + 46 },
    energy: { x: TRAY.x + 10, y: TRAY.y + 8 },
    endTurn: { x: TRAY.x + 220, y: TRAY.y + 6, w: 70, h: 14 },
    endTurnLabel: { x: TRAY.x + 232, y: TRAY.y + 9 },
    hand: { x: TRAY.x + 8, y: TRAY.y + 25, gapX: 76 },
    card: { w: 70, h: 44, textX: 4, ownerY: 4, nameY: 16, bodyY: 29 },
    hold: { x: TRAY.x + 304, y: TRAY.y + 6, w: 82, h: 14 },
    holdTitle: { x: TRAY.x + 310, y: TRAY.y + 9 },
  },
  sidePanel: {
    title: { x: SIDE_PANEL.x + 10, y: SIDE_PANEL.y + 10 },
    minimap: { x: SIDE_PANEL.x + 12, y: SIDE_PANEL.y + 28, w: 56, h: 30 },
    minimapTile: { w: 9, h: 5, stepX: 12, stepY: 7, offsetY: -4 },
    heroStartY: SIDE_PANEL.y + 70,
    heroGapY: 48,
    heroCard: { x: SIDE_PANEL.x + 10, w: 204, h: 38 },
    heroName: { x: SIDE_PANEL.x + 16, yOffset: 5 },
    heroHpBar: { x: SIDE_PANEL.x + 16, yOffset: 19, w: 86, h: 6 },
    heroHpText: { x: SIDE_PANEL.x + 108, yOffset: 16 },
    heroBlock: { x: SIDE_PANEL.x + 150, yOffset: 5 },
    heroDebt: { x: SIDE_PANEL.x + 150, yOffset: 20 },
    debtWarning: 4,
    seed: { x: SIDE_PANEL.x + 10, y: SIDE_PANEL.y + 270 },
    commandCount: { x: SIDE_PANEL.x + 10, y: SIDE_PANEL.y + 286 },
  },
  footer: {
    rect: { x: 8, y: 322, w: 624, h: 30 },
    label: { x: 18, y: 331 },
  },
  feedback: {
    debtFloat: { x: SIDE_PANEL.x + 152, y: SIDE_PANEL.y + 184 },
    enemyDamageFloat: { x: 198, y: 96 },
    heroDamageFloat: { x: SIDE_PANEL.x + 64, y: SIDE_PANEL.y + 88, heroGapY: 48 },
  },
} as const;

export const LAYOUT_RECTS = [
  VIEWPORT,
  TRAY,
  SIDE_PANEL,
  S0_LAYOUT.tray.endTurn,
  S0_LAYOUT.tray.hold,
  S0_LAYOUT.footer.rect,
] as const;

export function containsRect(bounds: Rect, rect: Rect): boolean {
  return rect.x >= bounds.x
    && rect.y >= bounds.y
    && rect.x + rect.w <= bounds.x + bounds.w
    && rect.y + rect.h <= bounds.y + bounds.h;
}

export function fitsGame(rect: Rect): boolean {
  return containsRect({ x: 0, y: 0, w: GAME_WIDTH, h: GAME_HEIGHT }, rect);
}
