import { describe, expect, it } from 'vitest';
import { runReplay } from '../src/systems/slice';
import type { SliceCommand } from '../src/game/types';

describe('S0 replay', () => {
  it('replays the hallway and debt fight deterministically from commands', () => {
    const commands: SliceCommand[] = [
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
      { type: 'play-card', cardId: 'mark-prey' },
      { type: 'play-card', cardId: 'blood-edge' },
    ];

    const first = runReplay(commands, 'same-seed');
    const second = runReplay(commands, 'same-seed');

    expect(first).toEqual(second);
    expect(first.mode).toBe('combat');
    expect(first.combat?.enemy.hp).toBe(8);
    expect(first.commandLog).toHaveLength(commands.length);
  });
});
