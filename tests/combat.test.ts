import { describe, expect, it } from 'vitest';
import { ROOT_WOLF, S0_CARDS, S0_HEROES } from '../src/data/combat';
import { cardInstanceId, type CardId, type CombatState } from '../src/game/types';
import {
  cardDefFor,
  createCombat,
  drawToHand,
  endTurn,
  firstCardInstanceId,
  holdCard,
  playCard,
  renderIntentText,
} from '../src/systems/combat';

describe('S0 combat', () => {
  it('creates combat from stable authored S0 data', () => {
    const combat = createCombat('test-seed');

    expect(combat.heroes.map((hero) => hero.id)).toEqual(S0_HEROES.map((hero) => hero.id));
    expect(combat.hand.map((cardId) => cardDefFor(combat, cardId).id)).toEqual(S0_CARDS.map((card) => card.id));
    expect(combat.enemy).toEqual(ROOT_WOLF);
  });

  it('authors S0 cards as effect lists', () => {
    expect(S0_CARDS.map((card) => [card.id, card.effects])).toEqual([
      ['iron-cut', [{ type: 'damage', amount: 6, tags: ['physical'] }]],
      ['hold-fast', [{ type: 'gain-block', amount: 8 }]],
      ['mend', [{ type: 'heal', amount: 6 }]],
      ['mark-prey', [{ type: 'apply-status', status: 'mark' }]],
      ['blood-edge', [
        { type: 'damage', amount: 12, tags: ['physical', 'debt'] },
        { type: 'gain-debt', amount: 4 },
      ]],
    ]);
  });

  it('spends shared energy and damages the enemy', () => {
    const combat = createCombat('test-seed');
    const result = playCard(combat, card(combat, 'iron-cut'));

    expect(result.combat.energy).toBe(2);
    expect(result.combat.enemy.hp).toBe(16);
    expect(result.combat.discardPile).toContain(card(combat, 'iron-cut'));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 6,
      blocked: 0,
      target: { kind: 'enemy', id: 'root-wolf' },
      cardId: card(combat, 'iron-cut'),
      defId: 'iron-cut',
    }));
  });

  it('makes Blood Edge stronger while adding debt to its owner', () => {
    const combat = createCombat('test-seed');
    const result = playCard(combat, card(combat, 'blood-edge'));
    const mia = result.combat.heroes.find((hero) => hero.id === 'mia');

    expect(result.combat.enemy.hp).toBe(10);
    expect(mia?.debt).toBe(4);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'DEBT_GAINED', heroId: 'mia', amount: 4, total: 4 }));
  });

  it('emits card causality before authored damage and debt effects', () => {
    const combat = createCombat('test-seed');
    const bloodEdge = card(combat, 'blood-edge');
    const result = playCard(combat, bloodEdge);

    expect(result.events).toEqual([
      { type: 'CARD_PLAYED', cardId: bloodEdge, defId: 'blood-edge', owner: 'mia', cost: 1, target: { kind: 'enemy', id: 'root-wolf' } },
      {
        type: 'DAMAGE_DEALT',
        source: { kind: 'hero', id: 'mia' },
        target: { kind: 'enemy', id: 'root-wolf' },
        amount: 12,
        blocked: 0,
        lethal: false,
        tags: ['physical', 'debt'],
        cardId: bloodEdge,
        defId: 'blood-edge',
      },
      {
        type: 'DEBT_GAINED',
        heroId: 'mia',
        amount: 4,
        total: 4,
        source: { kind: 'hero', id: 'mia' },
        cardId: bloodEdge,
        defId: 'blood-edge',
      },
    ]);
  });

  it('reports enemy block as absorbed damage, not hidden overkill', () => {
    const combat = createCombat('test-seed');
    const result = playCard({ ...combat, enemy: { ...combat.enemy, block: 10 } }, card(combat, 'iron-cut'));

    expect(result.combat.enemy.hp).toBe(combat.enemy.hp);
    expect(result.combat.enemy.block).toBe(4);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 0,
      blocked: 6,
      target: { kind: 'enemy', id: 'root-wolf' },
    }));
  });

  it('supports exactly one held card', () => {
    const combat = createCombat('test-seed');
    const mark = card(combat, 'mark-prey');
    const held = holdCard(combat, mark).combat;
    const unchanged = holdCard(held, card(combat, 'mend'));

    expect(held.held).toBe(mark);
    expect(held.hand.includes(mark)).toBe(false);
    expect(unchanged.combat.held).toBe(mark);
    expect(unchanged.events).toContainEqual({ type: 'CARD_REJECTED', cardId: card(combat, 'mend'), reason: 'hold-slot-full' });
  });

  it('lets a held card be played by id', () => {
    const combat = createCombat('test-seed');
    const mark = card(combat, 'mark-prey');
    const held = holdCard(combat, mark).combat;
    const result = playCard(held, mark);

    expect(result.combat.energy).toBe(2);
    expect(result.combat.held).toBeNull();
    expect(result.combat.discardPile).toContain(mark);
    expect(result.combat.enemy.marked).toBe(true);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'STATUS_APPLIED', status: 'mark', cardId: mark, defId: 'mark-prey' }));
  });

  it('can finish the S0 fight with the authored burst', () => {
    const combat = createCombat('test-seed');
    const marked = playCard(combat, card(combat, 'mark-prey')).combat;
    const bloodied = playCard(marked, card(combat, 'blood-edge')).combat;
    const result = playCard(bloodied, card(combat, 'iron-cut'));

    expect(result.combat.enemy.hp).toBe(0);
    expect(result.events).toContainEqual({ type: 'VICTORY' });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'DAMAGE_DEALT', lethal: true }));
  });

  it('stores enemy intent as typed combat data rendered separately for UI', () => {
    const combat = createCombat('test-seed');

    expect(combat.enemy.intent).toEqual({ type: 'attack', target: 'liese', amount: 6 });
    expect(renderIntentText(combat.enemy.intent)).toBe('Bite Liese for 6');
  });

  it('rejects missing, unaffordable, or unholdable cards without throwing', () => {
    const combat = createCombat('test-seed');
    const missingCard = cardInstanceId('missing-card');
    const missing = playCard(combat, missingCard);
    const emptyEnergy = { ...combat, energy: 0 };
    const unaffordable = playCard(emptyEnergy, card(combat, 'iron-cut'));
    const missingHold = holdCard(combat, missingCard);

    expect(missing.events).toContainEqual({ type: 'CARD_REJECTED', cardId: 'missing-card', reason: 'missing-card' });
    expect(unaffordable.events).toContainEqual({ type: 'CARD_REJECTED', cardId: card(combat, 'iron-cut'), reason: 'not-enough-energy' });
    expect(missingHold.events).toContainEqual({ type: 'CARD_REJECTED', cardId: 'missing-card', reason: 'missing-card' });
  });

  it('validates explicit card targets before spending energy or moving cards', () => {
    const combat = createCombat('test-seed');
    const ironCut = card(combat, 'iron-cut');
    const holdFast = card(combat, 'hold-fast');
    const wrongKind = playCard(combat, ironCut, { kind: 'hero', id: 'liese' });
    const wrongOwner = playCard(combat, holdFast, { kind: 'hero', id: 'eris' });
    const deadEnemy = playCard({ ...combat, enemy: { ...combat.enemy, hp: 0 } }, ironCut, { kind: 'enemy', id: 'root-wolf' });

    expect(wrongKind.combat).toBe(combat);
    expect(wrongKind.events).toEqual([{ type: 'CARD_REJECTED', cardId: ironCut, reason: 'invalid-target', target: { kind: 'hero', id: 'liese' } }]);
    expect(wrongOwner.combat).toBe(combat);
    expect(wrongOwner.events).toEqual([{ type: 'CARD_REJECTED', cardId: holdFast, reason: 'invalid-target', target: { kind: 'hero', id: 'eris' } }]);
    expect(deadEnemy.events).toEqual([{ type: 'CARD_REJECTED', cardId: ironCut, reason: 'dead-target', target: { kind: 'enemy', id: 'root-wolf' } }]);
  });

  it('resolves default targets for every S0 card definition', () => {
    const expectedTargets = {
      'iron-cut': { kind: 'enemy', id: 'root-wolf' },
      'hold-fast': { kind: 'hero', id: 'liese' },
      mend: { kind: 'hero', id: 'eris' },
      'mark-prey': { kind: 'enemy', id: 'root-wolf' },
      'blood-edge': { kind: 'enemy', id: 'root-wolf' },
    } satisfies Record<CardId, { kind: 'enemy'; id: string } | { kind: 'hero'; id: string }>;

    for (const cardId of Object.keys(expectedTargets) as CardId[]) {
      const combat = createCombat('test-seed');
      const played = playCard(combat, card(combat, cardId));
      expect(played.events[0]).toEqual(expect.objectContaining({
        type: 'CARD_PLAYED',
        defId: cardId,
        target: expectedTargets[cardId],
      }));
    }
  });

  it('resolves the wolf turn by biting Liese for 6', () => {
    const result = endTurn(createCombat('test-seed'));
    const liese = result.combat.heroes.find((hero) => hero.id === 'liese');

    expect(result.combat.turn).toBe(1);
    expect(result.combat.energy).toBe(3);
    expect(liese?.hp).toBe(25);
    expect(liese?.block).toBe(0);
    expect(result.events.map((event) => event.type)).toEqual([
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
    expect(result.combat.hand).toHaveLength(5);
    expect(result.combat.discardPile).toEqual([]);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 6,
      blocked: 0,
      source: { kind: 'enemy', id: 'root-wolf' },
      target: { kind: 'hero', id: 'liese' },
    }));
  });

  it('lets block absorb wolf damage before HP changes', () => {
    const combat = createCombat('test-seed');
    const blocked = playCard(combat, card(combat, 'hold-fast')).combat;
    const result = endTurn(blocked);
    const liese = result.combat.heroes.find((hero) => hero.id === 'liese');

    expect(liese?.hp).toBe(31);
    expect(liese?.block).toBe(0);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 0,
      blocked: 6,
      target: { kind: 'hero', id: 'liese' },
    }));
  });

  it('emits defeat after the wolf downs the last living heroes', () => {
    const combat = {
      ...createCombat('test-seed'),
      heroes: createCombat('test-seed').heroes.map((hero) => ({
        ...hero,
        hp: hero.id === 'liese' ? 1 : 0,
      })),
    };
    const result = endTurn(combat);

    expect(result.combat.heroes.every((hero) => hero.hp === 0)).toBe(true);
    expect(result.events.at(-1)).toEqual({ type: 'DEFEAT' });
  });

  it('retargets the wolf intent to the next living hero after Liese drops', () => {
    const combat = {
      ...createCombat('test-seed'),
      heroes: createCombat('test-seed').heroes.map((hero) => ({
        ...hero,
        hp: hero.id === 'liese' ? 1 : hero.hp,
      })),
    };
    const result = endTurn(combat);

    expect(result.combat.heroes.find((hero) => hero.id === 'liese')?.hp).toBe(0);
    expect(result.combat.enemy.intent).toEqual({ type: 'attack', target: 'eris', amount: 6 });
  });

  it('tracks duplicate card definitions as separate instances', () => {
    const combat = createCombat('test-seed');
    const first = card(combat, 'iron-cut');
    const duplicateId = cardInstanceId('test-seed-extra-iron-cut');
    const withDuplicate: CombatState = {
      ...combat,
      cards: { ...combat.cards, [duplicateId]: { id: duplicateId, defId: 'iron-cut' } },
      hand: [...combat.hand, duplicateId],
    };
    const afterFirst = playCard(withDuplicate, first).combat;

    expect(first).not.toBe(duplicateId);
    expect(afterFirst.hand).toContain(duplicateId);
    expect(cardDefFor(afterFirst, duplicateId).id).toBe('iron-cut');
  });

  it('keeps held cards out of discard through end turn', () => {
    const combat = createCombat('test-seed');
    const mark = card(combat, 'mark-prey');
    const held = holdCard(combat, mark).combat;
    const result = endTurn(held);

    expect(result.combat.held).toBe(mark);
    expect(result.combat.discardPile).not.toContain(mark);
  });

  it('draws deterministic card instances from draw pile into hand', () => {
    const combat = createCombat('test-seed');
    const extra = cardInstanceId('test-seed-extra-iron-cut');
    const withDrawPile: CombatState = {
      ...combat,
      cards: { ...combat.cards, [extra]: { id: extra, defId: 'iron-cut' } },
      hand: combat.hand.slice(0, 4),
      drawPile: [extra],
    };

    const drawn = drawToHand(withDrawPile, 5);

    expect(drawn.hand.at(-1)).toBe(extra);
    expect(drawn.drawPile).toEqual([]);
    expect(cardDefFor(drawn, extra).id).toBe('iron-cut');
  });
});

function card(combat: CombatState, defId: CardId) {
  const cardId = firstCardInstanceId(combat, defId);
  if (!cardId) throw new Error(`Missing test card ${defId}`);
  return cardId;
}
