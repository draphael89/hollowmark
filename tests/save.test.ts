import { describe, expect, it } from 'vitest';
import { cardInstanceId, type SliceCommand, type SliceState } from '../src/game/types';
import { deserializeSave, migrateSave, serializeSave } from '../src/systems/save';
import { applyCommand, createSliceState } from '../src/systems/slice';

describe('versioned saves', () => {
  it('round-trips S0 explore state through JSON', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'turn-right' },
    ]);
    const result = deserializeSave(JSON.parse(JSON.stringify(serializeSave(state))));

    expect(result).toEqual({ ok: true, state });
  });

  it('round-trips active combat, zones, debt, and held cards', () => {
    const combat = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
      { type: 'hold-card', cardId: cardInstanceId('s0-root-wolf-3-mark-prey') },
      { type: 'play-card', cardId: cardInstanceId('s0-root-wolf-3-mark-prey') },
      { type: 'play-card', cardId: cardInstanceId('s0-root-wolf-4-blood-edge') },
    ]);
    const result = deserializeSave(JSON.parse(JSON.stringify(serializeSave(combat))));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toEqual(combat);
    expect(result.state.floorId).toBe('s0-root-wolf-hallway');
    expect(result.state.combat?.enemy.hp).toBe(6);
    expect(result.state.combat?.enemy.marked).toBe(false);
    expect(result.state.combat?.heroes.find((hero) => hero.id === 'mia')?.debt).toBe(4);
    expect(result.state.combat?.held).toBeNull();
    expect(result.state.combat?.discardPile).toEqual([
      's0-root-wolf-3-mark-prey',
      's0-root-wolf-4-blood-edge',
    ]);
  });

  it('round-trips target-bearing command logs', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
      { type: 'play-card', cardId: cardInstanceId('s0-root-wolf-0-iron-cut'), target: { kind: 'enemy', id: 'root-wolf' } },
    ]);
    const result = deserializeSave(JSON.parse(JSON.stringify(serializeSave(state))));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.commandLog.at(-1)).toEqual({
      type: 'play-card',
      cardId: 's0-root-wolf-0-iron-cut',
      target: { kind: 'enemy', id: 'root-wolf' },
    });
  });

  it('rejects malformed or unsupported saves without throwing', () => {
    expect(deserializeSave(null)).toEqual({ ok: false, error: 'Save must be an object.' });
    expect(deserializeSave({ version: 2, state: createSliceState() })).toEqual({ ok: false, error: 'Unsupported save version.' });
    expect(deserializeSave({ version: 1, state: { ...createSliceState(), floorId: 'unknown-floor' } })).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects combat saves with card-zone references that do not exist', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const broken = serializeSave({
      ...state,
      combat: state.combat ? { ...state.combat, hand: [cardInstanceId('missing-card')] } : null,
    });

    expect(deserializeSave(JSON.parse(JSON.stringify(broken)))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects combat saves with one card duplicated across zones', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const duplicated = serializeSave({
      ...state,
      combat: state.combat
        ? {
            ...state.combat,
            discardPile: [state.combat.hand[0]!],
          }
        : null,
    });

    expect(deserializeSave(JSON.parse(JSON.stringify(duplicated)))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects outcome saves without combat state', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);

    expect(deserializeSave(serializeSave({ ...state, mode: 'victory', combat: null }))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
    expect(deserializeSave(serializeSave({ ...state, mode: 'defeat', combat: null }))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('migrates current saves through the migration entrypoint', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);

    expect(migrateSave(JSON.parse(JSON.stringify(serializeSave(state))))).toEqual({ ok: true, state });
  });
});

function run(commands: SliceCommand[], seed = 's0-root-wolf'): SliceState {
  let state = createSliceState(seed);
  for (const command of commands) state = applyCommand(state, command).state;
  return state;
}
