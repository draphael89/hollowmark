import { describe, expect, it } from 'vitest';
import {
  containsRect,
  fitsGame,
  GAME_HEIGHT,
  GAME_WIDTH,
  LAYOUT_RECTS,
  S0_LAYOUT,
  TRAY,
  VIEWPORT,
} from '../src/game/layout';
import { THEME } from '../src/game/theme';

describe('S0 layout', () => {
  it('keeps fixed panels and controls inside the 640x360 canvas', () => {
    expect(GAME_WIDTH).toBe(640);
    expect(GAME_HEIGHT).toBe(360);

    LAYOUT_RECTS.forEach((rect) => {
      expect(fitsGame(rect)).toBe(true);
    });
  });

  it('keeps tray controls inside the tray', () => {
    expect(containsRect(TRAY, S0_LAYOUT.tray.endTurn)).toBe(true);
    expect(containsRect(TRAY, S0_LAYOUT.tray.hold)).toBe(true);

    const lastHandCard = {
      x: S0_LAYOUT.tray.hand.x + S0_LAYOUT.tray.hand.gapX * 4,
      y: S0_LAYOUT.tray.hand.y,
      w: S0_LAYOUT.tray.card.w,
      h: S0_LAYOUT.tray.card.h,
    };

    expect(containsRect(TRAY, lastHandCard)).toBe(true);
    expect(S0_LAYOUT.tray.hold.y + S0_LAYOUT.tray.hold.h).toBeLessThanOrEqual(S0_LAYOUT.tray.hand.y);
    expect(S0_LAYOUT.tray.card.bodyY).toBeLessThan(S0_LAYOUT.tray.card.h);
  });

  it('keeps combat targeting inside the viewport', () => {
    expect(containsRect(VIEWPORT, S0_LAYOUT.combat.enemyHitBox)).toBe(true);
  });

  it('keeps numeric and CSS void colors paired', () => {
    expect(`#${THEME.color.void.toString(16).padStart(6, '0')}`).toBe(THEME.text.void);
  });
});
