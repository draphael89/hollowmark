import { describe, expect, it } from 'vitest';
import { S0_FLOOR } from '../src/data/floors/s0';
import { isFloorWalkable, logLineAt, threatAt, tileAt, tileKey } from '../src/systems/floor';
import { attemptStep, turnFacing } from '../src/systems/movement';
import { createSliceState } from '../src/systems/slice';
import { computeViewSlots, viewSlot } from '../src/systems/viewSlots';

describe('S0 movement', () => {
  it('moves through the authored hallway and raises threat', () => {
    const firstStep = attemptStep(createSliceState(), 'forward');
    expect(firstStep.type).toBe('moved');
    expect(firstStep.state.position).toEqual({ x: 1, y: 2 });
    expect(firstStep.state.threat).toBe('uneasy');

    const secondStep = attemptStep(firstStep.state, 'forward');
    expect(secondStep.type).toBe('moved');
    expect(secondStep.state.position).toEqual({ x: 1, y: 1 });
    expect(secondStep.state.threat).toBe('hunted');
  });

  it('reads walkability and threat from floor data', () => {
    expect(S0_FLOOR.start).toEqual({ x: 1, y: 3 });
    expect(isFloorWalkable(S0_FLOOR, { x: 1, y: 1 })).toBe(true);
    expect(isFloorWalkable(S0_FLOOR, { x: 1, y: 4 })).toBe(false);
    expect(threatAt(S0_FLOOR, { x: 1, y: 2 })).toBe('uneasy');
    expect(logLineAt(S0_FLOOR, { x: 1, y: 1 })).toBe('The wolf watches from the root arch.');
    expect(tileAt(S0_FLOOR, { x: 2, y: 1 })?.purpose).toBe('side-path');
  });

  it('keeps the authored S0 floor coherent', () => {
    const keys = S0_FLOOR.tiles.map((tile) => tileKey(tile.coord));
    expect(new Set(keys).size).toBe(keys.length);
    expect(isFloorWalkable(S0_FLOOR, S0_FLOOR.start)).toBe(true);

    const reached = new Set<string>();
    const queue = [S0_FLOOR.start];
    while (queue.length > 0) {
      const coord = queue.shift()!;
      const key = tileKey(coord);
      if (reached.has(key)) continue;
      reached.add(key);

      [
        { x: coord.x, y: coord.y - 1 },
        { x: coord.x + 1, y: coord.y },
        { x: coord.x, y: coord.y + 1 },
        { x: coord.x - 1, y: coord.y },
      ].forEach((next) => {
        if (isFloorWalkable(S0_FLOOR, next) && !reached.has(tileKey(next))) queue.push(next);
      });
    }

    const walkableKeys = S0_FLOOR.tiles
      .filter((tile) => tile.walkable)
      .map((tile) => tileKey(tile.coord));
    expect([...reached].sort()).toEqual(walkableKeys.sort());
  });

  it('bumps blocked walls without changing position', () => {
    const state = createSliceState();
    const bumped = attemptStep(state, 'back');

    expect(bumped.type).toBe('bumped');
    expect(bumped.state.position).toEqual(state.position);
    expect(bumped.state.log.at(-1)).toBe('Stone refuses the step.');
  });

  it('turns in cardinal 90-degree steps', () => {
    expect(turnFacing('north', 'right')).toBe('east');
    expect(turnFacing('north', 'left')).toBe('west');
  });

  it('computes view slots for all four facings', () => {
    expect(viewSlot(computeViewSlots(S0_FLOOR, { x: 1, y: 2 }, 'north'), 'front').coord).toEqual({ x: 1, y: 1 });
    expect(viewSlot(computeViewSlots(S0_FLOOR, { x: 1, y: 2 }, 'east'), 'front').coord).toEqual({ x: 2, y: 2 });
    expect(viewSlot(computeViewSlots(S0_FLOOR, { x: 1, y: 2 }, 'south'), 'front').coord).toEqual({ x: 1, y: 3 });
    expect(viewSlot(computeViewSlots(S0_FLOOR, { x: 1, y: 2 }, 'west'), 'front').coord).toEqual({ x: 0, y: 2 });
  });

  it('marks visible wall slots as non-walkable', () => {
    const slots = computeViewSlots(S0_FLOOR, { x: 1, y: 2 }, 'east');

    expect(viewSlot(slots, 'front').walkable).toBe(false);
    expect(viewSlot(slots, 'right').coord).toEqual({ x: 2, y: 3 });
  });
});
