import { describe, expect, it } from 'vitest';
import { createCombat, holdCard, playCard } from '../src/systems/combat';

describe('S0 combat', () => {
  it('spends shared energy and damages the enemy', () => {
    const result = playCard(createCombat('test-seed'), 'iron-cut');

    expect(result.combat.energy).toBe(2);
    expect(result.combat.enemy.hp).toBe(16);
    expect(result.events).toContainEqual({ type: 'DAMAGE', amount: 6 });
  });

  it('makes Blood Edge stronger while adding debt to its owner', () => {
    const result = playCard(createCombat('test-seed'), 'blood-edge');
    const mia = result.combat.heroes.find((hero) => hero.id === 'mia');

    expect(result.combat.enemy.hp).toBe(10);
    expect(mia?.debt).toBe(4);
    expect(result.events).toContainEqual({ type: 'DEBT', heroId: 'mia', amount: 4 });
  });

  it('supports exactly one held card', () => {
    const combat = createCombat('test-seed');
    const held = holdCard(combat, 'mark-prey');
    const unchanged = holdCard(held, 'mend');

    expect(held.held?.id).toBe('mark-prey');
    expect(held.hand.some((card) => card.id === 'mark-prey')).toBe(false);
    expect(unchanged.held?.id).toBe('mark-prey');
  });

  it('lets a held card be played by id', () => {
    const held = holdCard(createCombat('test-seed'), 'mark-prey');
    const result = playCard(held, 'mark-prey');

    expect(result.combat.energy).toBe(2);
    expect(result.combat.held).toBeNull();
    expect(result.combat.enemy.marked).toBe(true);
    expect(result.events).toContainEqual({ type: 'MARK' });
  });

  it('can finish the S0 fight with the authored burst', () => {
    const marked = playCard(createCombat('test-seed'), 'mark-prey').combat;
    const bloodied = playCard(marked, 'blood-edge').combat;
    const result = playCard(bloodied, 'iron-cut');

    expect(result.combat.enemy.hp).toBe(0);
    expect(result.events).toContainEqual({ type: 'VICTORY' });
  });
});
