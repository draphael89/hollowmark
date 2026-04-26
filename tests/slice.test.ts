import { describe, expect, it } from 'vitest';
import { cardInstanceId } from '../src/game/types';
import { applyCommand, createSliceState } from '../src/systems/slice';

describe('mode-safe slice reducer', () => {
  it('rejects combat commands while exploring', () => {
    const result = applyCommand(createSliceState(), { type: 'play-card', cardId: cardInstanceId('iron-cut') });

    expect(result.state.mode).toBe('explore');
    expect(result.state.commandLog).toHaveLength(1);
    expect(result.events).toContainEqual({
      type: 'COMMAND_REJECTED',
      reason: 'wrong-mode',
      commandType: 'play-card',
      mode: 'explore',
    });
  });

  it('emits movement events while exploring', () => {
    const result = applyCommand(createSliceState(), { type: 'step-forward' });

    expect(result.state.position).toEqual({ x: 1, y: 2 });
    expect(result.events).toContainEqual({
      type: 'STEP_MOVED',
      from: { x: 1, y: 3 },
      to: { x: 1, y: 2 },
      threat: 'uneasy',
    });
  });

  it('does not emit the same event identity twice for one dispatch', () => {
    const result = applyCommand(createSliceState(), { type: 'step-back' });
    const seen = new Set<string>();

    for (const event of result.events) {
      const key = JSON.stringify(event);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('transitions to defeat when combat emits defeat', () => {
    let state = createSliceState();
    state = applyCommand(state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'interact' }).state;
    state = {
      ...state,
      combat: {
        ...state.combat!,
        heroes: state.combat!.heroes.map((hero) => ({
          ...hero,
          hp: hero.id === 'liese' ? 1 : 0,
        })),
      },
    };

    const result = applyCommand(state, { type: 'end-turn' });

    expect(result.state.mode).toBe('defeat');
    expect(result.events.at(-1)).toEqual({ type: 'DEFEAT' });
  });

  it('rejects invalid explicit combat targets through the slice boundary', () => {
    let state = createSliceState();
    state = applyCommand(state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'interact' }).state;
    const combat = state.combat!;
    const ironCut = combat.hand.find((cardId) => combat.cards[cardId]?.defId === 'iron-cut');
    if (!ironCut) throw new Error('Missing Iron Cut');

    const result = applyCommand(state, { type: 'play-card', cardId: ironCut, target: { kind: 'hero', id: 'liese' } });

    expect(result.state.mode).toBe('combat');
    expect(result.state.combat).toBe(combat);
    expect(result.state.commandLog.at(-1)).toEqual({ type: 'play-card', cardId: ironCut, target: { kind: 'hero', id: 'liese' } });
    expect(result.events).toEqual([{ type: 'CARD_REJECTED', cardId: ironCut, reason: 'invalid-target', target: { kind: 'hero', id: 'liese' } }]);
  });
});
