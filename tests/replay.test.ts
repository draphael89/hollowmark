import { describe, expect, it } from 'vitest';
import { firstCardInstanceId } from '../src/systems/combat';
import { applyCommand, createSliceState, runReplay } from '../src/systems/slice';
import { cardInstanceId, type CardId, type CombatState, type SliceCommand } from '../src/game/types';

describe('S0 replay', () => {
  it('replays the hallway and held-card debt fight to victory', () => {
    const commands = victoryCommands('same-seed');

    const first = runReplay(commands, 'same-seed');
    const second = runReplay(commands, 'same-seed');

    expect(first).toEqual(second);
    expect(first.state.mode).toBe('victory');
    expect(first.state.combat?.enemy.hp).toBe(0);
    expect(first.state.commandLog).toHaveLength(commands.length);
    expect(first.events.map((event) => event.type)).toEqual([
      'STEP_MOVED',
      'STEP_MOVED',
      'COMBAT_STARTED',
      'CARD_HELD',
      'CARD_PLAYED',
      'STATUS_APPLIED',
      'CARD_PLAYED',
      'DAMAGE_DEALT',
      'DEBT_GAINED',
      'CARD_PLAYED',
      'DAMAGE_DEALT',
      'VICTORY',
    ]);
  });

  it('replays a wolf bite turn deterministically', () => {
    const commands: SliceCommand[] = [
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
      { type: 'end-turn' },
    ];

    const first = runReplay(commands, 'same-seed');
    const second = runReplay(commands, 'same-seed');
    const liese = first.state.combat?.heroes.find((hero) => hero.id === 'liese');

    expect(first).toEqual(second);
    expect(liese?.hp).toBe(25);
    expect(first.events.map((event) => event.type)).toEqual([
      'STEP_MOVED',
      'STEP_MOVED',
      'COMBAT_STARTED',
      'ENEMY_TURN_STARTED',
      'DAMAGE_DEALT',
      'ENEMY_TURN_ENDED',
      'PLAYER_TURN_STARTED',
      'CARD_DRAWN',
      'CARD_DRAWN',
      'CARD_DRAWN',
      'CARD_DRAWN',
      'CARD_DRAWN',
      'HAND_REFILLED',
    ]);
  });

  it('does not let exploration commands move an active fight', () => {
    const combat = runReplay([{ type: 'step-forward' }, { type: 'step-forward' }, { type: 'interact' }]);
    const moved = applyCommand(combat.state, { type: 'step-back' });
    const turned = applyCommand(combat.state, { type: 'turn-right' });

    expect(combat.state.mode).toBe('combat');
    expect(moved.state.mode).toBe('combat');
    expect(turned.state.mode).toBe('combat');
    expect(moved.state.position).toEqual({ x: 1, y: 1 });
    expect(moved.state.threat).toBe('hunted');
    expect(moved.state.commandLog).toHaveLength(4);
    expect(moved.events).toContainEqual({
      type: 'COMMAND_REJECTED',
      reason: 'wrong-mode',
      commandType: 'step-back',
      mode: 'combat',
    });
  });

  it('rejects combat-only hold commands before combat starts', () => {
    const result = applyCommand(runReplay([]).state, { type: 'hold-card', cardId: cardInstanceId('same-seed-3-mark-prey') });

    expect(result.state.mode).toBe('explore');
    expect(result.events).toContainEqual({
      type: 'COMMAND_REJECTED',
      reason: 'wrong-mode',
      commandType: 'hold-card',
      mode: 'explore',
    });
  });
});

function victoryCommands(seed: string): SliceCommand[] {
  let state = createSliceState(seed);
  const commands: SliceCommand[] = [{ type: 'step-forward' }, { type: 'step-forward' }, { type: 'interact' }];
  for (const command of commands) state = applyCommand(state, command).state;
  const combat = state.combat!;

  return [
    ...commands,
    { type: 'hold-card', cardId: card(combat, 'mark-prey') },
    { type: 'play-card', cardId: card(combat, 'mark-prey') },
    { type: 'play-card', cardId: card(combat, 'blood-edge') },
    { type: 'play-card', cardId: card(combat, 'iron-cut') },
  ];
}

function card(combat: CombatState, defId: CardId) {
  const cardId = firstCardInstanceId(combat, defId);
  if (!cardId) throw new Error(`Missing replay card ${defId}`);
  return cardId;
}
