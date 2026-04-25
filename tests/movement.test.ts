import { describe, expect, it } from 'vitest';
import { attemptStep, turnFacing } from '../src/systems/movement';
import { createSliceState } from '../src/systems/slice';

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
});
