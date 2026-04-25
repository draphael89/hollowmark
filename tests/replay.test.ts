import { describe, expect, it } from 'vitest';
import { applyCommand, runReplay } from '../src/systems/slice';
import type { SliceCommand } from '../src/game/types';

describe('S0 replay', () => {
  it('replays the hallway and held-card debt fight to victory', () => {
    const commands: SliceCommand[] = [
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
      { type: 'hold-card', cardId: 'mark-prey' },
      { type: 'play-card', cardId: 'mark-prey' },
      { type: 'play-card', cardId: 'blood-edge' },
      { type: 'play-card', cardId: 'iron-cut' },
    ];

    const first = runReplay(commands, 'same-seed');
    const second = runReplay(commands, 'same-seed');

    expect(first).toEqual(second);
    expect(first.mode).toBe('victory');
    expect(first.combat?.enemy.hp).toBe(0);
    expect(first.commandLog).toHaveLength(commands.length);
  });

  it('does not let exploration commands move an active fight', () => {
    const combat = runReplay([{ type: 'step-forward' }, { type: 'step-forward' }, { type: 'interact' }]);
    const moved = applyCommand(combat, { type: 'step-back' });
    const turned = applyCommand(combat, { type: 'turn-right' });

    expect(combat.mode).toBe('combat');
    expect(moved).toBe(combat);
    expect(turned).toBe(combat);
    expect(moved.position).toEqual({ x: 1, y: 1 });
    expect(moved.threat).toBe('hunted');
    expect(moved.commandLog).toHaveLength(3);
  });

  it('fails combat-only hold commands before combat starts', () => {
    expect(() => applyCommand(runReplay([]), { type: 'hold-card', cardId: 'mark-prey' })).toThrow(
      'Combat command requires combat state',
    );
  });
});
