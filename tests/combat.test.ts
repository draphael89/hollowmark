import { describe, expect, it } from 'vitest';
import { M1_CARDS, M1_STARTER_CARDS, ROOT_WOLF, S0_CARDS, S0_HEROES } from '../src/data/combat';
import { cardInstanceId, type CardDef, type CardId, type CombatState, type HeroId } from '../src/game/types';
import {
  cardDefFor,
  createCombat,
  createCombatWithCards,
  drawToHand,
  endTurn,
  firstCardInstanceId,
  holdCard,
  playCard,
  renderIntentText,
} from '../src/systems/combat';
import { addStatus } from '../src/systems/status';

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
      ['mark-prey', [{ type: 'apply-status', status: 'mark', amount: 1 }]],
      ['blood-edge', [
        { type: 'damage', amount: 12, tags: ['physical', 'debt'] },
        { type: 'gain-debt', amount: 4 },
      ]],
    ]);
  });

  it('keeps S0 as the default combat deck while exposing an M1 starter lab deck', () => {
    const s0 = createCombat('test-seed');
    const m1 = createCombatWithCards('m1-seed', M1_STARTER_CARDS);

    expect(M1_CARDS).toHaveLength(19);
    expect(M1_STARTER_CARDS).toHaveLength(24);
    expect(s0.hand.map((cardId) => cardDefFor(s0, cardId).id)).toEqual(S0_CARDS.map((card) => card.id));
    expect(s0.drawPile).toEqual([]);
    expect(m1.hand).toHaveLength(5);
    expect(m1.drawPile).toHaveLength(19);
    expect(new Set([...m1.hand, ...m1.drawPile]).size).toBe(24);
    expect([...m1.hand, ...m1.drawPile].map((cardId) => cardDefFor(m1, cardId).id).sort()).toEqual(
      M1_STARTER_CARDS.map((cardDef) => cardDef.id).sort(),
    );
  });

  it('shuffles M1 lab decks deterministically by seed without changing card instance IDs', () => {
    const first = createCombatWithCards('m1-seed', M1_STARTER_CARDS);
    const second = createCombatWithCards('m1-seed', M1_STARTER_CARDS);
    const other = createCombatWithCards('other-seed', M1_STARTER_CARDS);
    const order = (combat: CombatState) => [...combat.hand, ...combat.drawPile].map((cardId) => cardDefFor(combat, cardId).id);

    expect(order(first)).toEqual(order(second));
    expect(order(first)).not.toEqual(order(other));
    expect(first.cards[cardInstanceId('m1-seed-0-iron-cut')]?.defId).toBe('iron-cut');
  });

  it('authors a 24-card starter deck with six cards per hero', () => {
    expect(countCardsByOwner(M1_STARTER_CARDS)).toEqual({
      liese: 6,
      eris: 6,
      mia: 6,
      robin: 6,
    });
  });

  it('locks the 24 starter card public contracts', () => {
    expect(M1_STARTER_CARDS.map(({ id, owner, cost, target, effects }) => ({ id, owner, cost, target, effects }))).toEqual([
      contract('iron-cut', 'liese', 1, 'enemy', [{ type: 'damage', amount: 6, tags: ['physical'] }]),
      contract('hold-fast', 'liese', 1, 'owner', [{ type: 'gain-block', amount: 8 }]),
      contract('mend', 'eris', 1, 'owner', [{ type: 'heal', amount: 6 }]),
      contract('mark-prey', 'robin', 1, 'enemy', [{ type: 'apply-status', status: 'mark', amount: 1 }]),
      contract('blood-edge', 'mia', 1, 'enemy', [
        { type: 'damage', amount: 12, tags: ['physical', 'debt'] },
        { type: 'gain-debt', amount: 4 },
      ]),
      contract('oath-ward', 'liese', 1, 'owner', [{ type: 'gain-block', amount: 4 }, { type: 'apply-status', status: 'ward', amount: 1 }]),
      contract('sundering-cut', 'liese', 1, 'enemy', [{ type: 'damage', amount: 4, tags: ['physical'] }, { type: 'apply-status', status: 'vulnerable', amount: 1 }]),
      contract('stone-guard', 'liese', 1, 'owner', [{ type: 'gain-block', amount: 6 }, { type: 'apply-status', status: 'ward', amount: 1 }]),
      contract('ringing-blow', 'liese', 1, 'enemy', [{ type: 'damage', amount: 4, tags: ['physical'] }, { type: 'apply-status', status: 'weak', amount: 1 }]),
      contract('sanctuary-veil', 'eris', 1, 'owner', [{ type: 'heal', amount: 3 }, { type: 'apply-status', status: 'ward', amount: 1 }]),
      contract('quiet-rebuke', 'eris', 1, 'enemy', [{ type: 'apply-status', status: 'weak', amount: 1 }]),
      contract('white-thread', 'eris', 1, 'owner', [{ type: 'heal', amount: 4 }, { type: 'apply-status', status: 'ward', amount: 1 }]),
      contract('mercy-cut', 'eris', 1, 'enemy', [{ type: 'damage', amount: 4, tags: ['physical'] }, { type: 'apply-status', status: 'weak', amount: 1 }]),
      contract('prayer-knot', 'eris', 0, 'owner', [{ type: 'heal', amount: 3 }, { type: 'gain-debt', amount: 1 }]),
      contract('glass-hex', 'mia', 1, 'enemy', [{ type: 'apply-status', status: 'vulnerable', amount: 2 }, { type: 'gain-debt', amount: 2 }]),
      contract('rootfire', 'mia', 1, 'enemy', [{ type: 'apply-status', status: 'poison', amount: 2 }, { type: 'gain-debt', amount: 1 }]),
      contract('black-spark', 'mia', 1, 'enemy', [{ type: 'damage', amount: 7, tags: ['physical', 'debt'] }, { type: 'gain-debt', amount: 2 }]),
      contract('venom-script', 'mia', 1, 'enemy', [{ type: 'apply-status', status: 'poison', amount: 3 }]),
      contract('glass-pulse', 'mia', 1, 'enemy', [{ type: 'apply-status', status: 'vulnerable', amount: 1 }, { type: 'damage', amount: 4, tags: ['physical'] }]),
      contract('barbed-shot', 'robin', 1, 'enemy', [{ type: 'damage', amount: 3, tags: ['physical'] }, { type: 'apply-status', status: 'bleed', amount: 2 }]),
      contract('shadow-mark', 'robin', 0, 'enemy', [{ type: 'apply-status', status: 'mark', amount: 1 }, { type: 'gain-debt', amount: 1 }]),
      contract('needle-rain', 'robin', 1, 'enemy', [{ type: 'damage', amount: 4, tags: ['physical'] }, { type: 'apply-status', status: 'bleed', amount: 1 }]),
      contract('marked-step', 'robin', 0, 'enemy', [{ type: 'apply-status', status: 'mark', amount: 1 }]),
      contract('tripwire', 'robin', 1, 'enemy', [{ type: 'apply-status', status: 'weak', amount: 1 }, { type: 'apply-status', status: 'bleed', amount: 1 }]),
    ]);
  });

  it('resolves new M1 status cards through the same combat rules', () => {
    const oath = playOnlyCard('oath-ward');
    const rootfire = playOnlyCard('rootfire');
    const barbed = playOnlyCard('barbed-shot');
    const shadow = playOnlyCard('shadow-mark');
    const prayer = playOnlyCard('prayer-knot');
    const tripwire = playOnlyCard('tripwire');

    expect(oath.combat.heroes.find((hero) => hero.id === 'liese')).toEqual(expect.objectContaining({
      block: 4,
      statuses: expect.objectContaining({ ward: 1 }),
    }));
    expect(rootfire.combat.enemy.statuses.poison).toBe(2);
    expect(rootfire.combat.heroes.find((hero) => hero.id === 'mia')?.debt).toBe(1);
    expect(barbed.combat.enemy.hp).toBe(19);
    expect(barbed.combat.enemy.statuses.bleed).toBe(2);
    expect(shadow.combat.enemy.statuses.mark).toBe(1);
    expect(shadow.combat.heroes.find((hero) => hero.id === 'robin')?.debt).toBe(1);
    expect(prayer.combat.heroes.find((hero) => hero.id === 'eris')?.debt).toBe(1);
    expect(tripwire.combat.enemy.statuses).toEqual(expect.objectContaining({ weak: 1, bleed: 1 }));
  });

  it('can resolve every M1 starter card through the public play path', () => {
    for (const def of M1_STARTER_CARDS) {
      const result = playOnlyCard(def.id);

      expect(result.events[0]).toEqual(expect.objectContaining({
        type: 'CARD_PLAYED',
        defId: def.id,
        owner: def.owner,
        cost: def.cost,
        target: def.target.type === 'enemy'
          ? { kind: 'enemy', id: 'root-wolf' }
          : { kind: 'hero', id: def.owner },
      }));
      expect(result.combat.energy).toBe(3 - def.cost);
      expect(result.combat.hand).toEqual([]);
      expect(result.combat.discardPile.map((cardId) => cardDefFor(result.combat, cardId).id)).toEqual([def.id]);
      for (const effect of def.effects) {
        expect(result.events).toEqual(expect.arrayContaining([expect.objectContaining(eventForEffect(effect.type))]));
      }
    }
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

  it('uses the current enemy name in combat log lines', () => {
    const base = createCombat('test-seed');
    const combat = {
      ...base,
      enemy: { ...base.enemy, name: 'Underroot Alpha', hp: 6, maxHp: 42 },
    };
    const result = playCard(combat, card(combat, 'iron-cut'));

    expect(result.combat.log.slice(-2)).toEqual([
      'Underroot Alpha takes 6.',
      'Underroot Alpha falls into the roots.',
    ]);
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
    expect(result.combat.enemy.statuses.mark).toBe(1);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'STATUS_APPLIED', status: 'mark', amount: 1, total: 1, cardId: mark, defId: 'mark-prey' }));
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

  it('does not apply later target-bound effects to an enemy killed earlier in the card', () => {
    const barbedDef = M1_CARDS.find((candidate) => candidate.id === 'barbed-shot');
    if (!barbedDef) throw new Error('Missing Barbed Shot definition');
    const combat = createCombatWithCards('lethal-status', [barbedDef]);
    const barbedShot = card(combat, 'barbed-shot');
    const nearDeadEnemy = { ...combat, enemy: { ...combat.enemy, hp: 3 } };

    const result = playCard(nearDeadEnemy, barbedShot);

    expect(result.combat.enemy.hp).toBe(0);
    expect(result.combat.enemy.statuses.bleed).toBe(0);
    expect(result.events).toEqual([
      expect.objectContaining({ type: 'CARD_PLAYED', defId: 'barbed-shot' }),
      expect.objectContaining({ type: 'DAMAGE_DEALT', lethal: true }),
      { type: 'VICTORY' },
    ]);
  });

  it('still resolves explicit debt costs after lethal damage', () => {
    const combat = createCombat('test-seed');
    const bloodEdge = card(combat, 'blood-edge');
    const nearDeadEnemy = { ...combat, enemy: { ...combat.enemy, hp: 12 } };

    const result = playCard(nearDeadEnemy, bloodEdge);

    expect(result.combat.enemy.hp).toBe(0);
    expect(result.combat.heroes.find((hero) => hero.id === 'mia')?.debt).toBe(4);
    expect(result.events).toEqual([
      expect.objectContaining({ type: 'CARD_PLAYED', defId: 'blood-edge' }),
      expect.objectContaining({ type: 'DAMAGE_DEALT', lethal: true }),
      expect.objectContaining({ type: 'DEBT_GAINED', heroId: 'mia', amount: 4 }),
      { type: 'VICTORY' },
    ]);
  });

  it('consumes Mark through the shared status stacks after bonus damage', () => {
    const combat = createCombat('test-seed');
    const marked = playCard(combat, card(combat, 'mark-prey')).combat;
    const result = playCard(marked, card(combat, 'iron-cut'));

    expect(marked.enemy.statuses.mark).toBe(1);
    expect(result.combat.enemy.statuses.mark).toBe(0);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 10,
      tags: ['physical', 'mark'],
    }));
  });

  it('spends Weak on the acting hero to soften the next card hit', () => {
    const combat = createCombat('test-seed');
    const weakLiese = {
      ...combat,
      heroes: combat.heroes.map((hero) =>
        hero.id === 'liese' ? { ...hero, statuses: addStatus(hero.statuses, 'weak') } : hero,
      ),
    };
    const result = playCard(weakLiese, card(combat, 'iron-cut'));

    expect(result.combat.enemy.hp).toBe(18);
    expect(result.combat.heroes.find((hero) => hero.id === 'liese')?.statuses.weak).toBe(0);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 4,
      tags: ['physical', 'weak'],
    }));
  });

  it('spends Vulnerable on the enemy to amplify the next card hit', () => {
    const combat = createCombat('test-seed');
    const vulnerableEnemy = {
      ...combat,
      enemy: { ...combat.enemy, statuses: addStatus(combat.enemy.statuses, 'vulnerable') },
    };
    const result = playCard(vulnerableEnemy, card(combat, 'iron-cut'));

    expect(result.combat.enemy.hp).toBe(13);
    expect(result.combat.enemy.statuses.vulnerable).toBe(0);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 9,
      tags: ['physical', 'vulnerable'],
    }));
  });

  it('spends Bleed on the enemy when physical card damage gets through HP', () => {
    const combat = createCombat('test-seed');
    const bleedingEnemy = {
      ...combat,
      enemy: { ...combat.enemy, statuses: addStatus(combat.enemy.statuses, 'bleed', 3) },
    };
    const result = playCard(bleedingEnemy, card(combat, 'iron-cut'));

    expect(result.combat.enemy.hp).toBe(13);
    expect(result.combat.enemy.statuses.bleed).toBe(2);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 9,
      tags: ['physical', 'bleed'],
    }));
  });

  it('does not spend Bleed when block absorbs the full physical card hit', () => {
    const combat = createCombat('test-seed');
    const guardedBleeder = {
      ...combat,
      enemy: {
        ...combat.enemy,
        block: 8,
        statuses: addStatus(combat.enemy.statuses, 'bleed', 3),
      },
    };
    const result = playCard(guardedBleeder, card(combat, 'iron-cut'));

    expect(result.combat.enemy.hp).toBe(22);
    expect(result.combat.enemy.statuses.bleed).toBe(3);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 0,
      blocked: 6,
      tags: ['physical'],
    }));
  });

  it('composes Weak, Mark, and Vulnerable in a deterministic card hit order', () => {
    const combat = createCombat('test-seed');
    const stacked = {
      ...combat,
      heroes: combat.heroes.map((hero) =>
        hero.id === 'liese' ? { ...hero, statuses: addStatus(hero.statuses, 'weak') } : hero,
      ),
      enemy: {
        ...combat.enemy,
        statuses: addStatus(addStatus(combat.enemy.statuses, 'mark'), 'vulnerable'),
      },
    };
    const result = playCard(stacked, card(combat, 'iron-cut'));

    expect(result.combat.enemy.hp).toBe(10);
    expect(result.combat.enemy.statuses.mark).toBe(0);
    expect(result.combat.enemy.statuses.vulnerable).toBe(0);
    expect(result.combat.heroes.find((hero) => hero.id === 'liese')?.statuses.weak).toBe(0);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 12,
      tags: ['physical', 'weak', 'mark', 'vulnerable'],
    }));
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

  it('rejects cards played by downed owners before spending energy or moving cards', () => {
    const combat = createCombat('test-seed');
    const bloodEdge = card(combat, 'blood-edge');
    const downedMia = {
      ...combat,
      heroes: combat.heroes.map((hero) => (hero.id === 'mia' ? { ...hero, hp: 0 } : hero)),
    };

    const result = playCard(downedMia, bloodEdge);

    expect(result.events).toEqual([{ type: 'CARD_REJECTED', cardId: bloodEdge, reason: 'dead-owner' }]);
    expect(result.combat.energy).toBe(downedMia.energy);
    expect(result.combat.hand).toEqual(downedMia.hand);
    expect(result.combat.discardPile).toEqual(downedMia.discardPile);
    expect(result.combat.held).toBe(downedMia.held);
    expect(result.combat.heroes.find((hero) => hero.id === 'mia')).toEqual(
      downedMia.heroes.find((hero) => hero.id === 'mia'),
    );
  });

  it('resolves default targets for every S0 card definition', () => {
    const expectedTargets = {
      'iron-cut': { kind: 'enemy', id: 'root-wolf' },
      'hold-fast': { kind: 'hero', id: 'liese' },
      mend: { kind: 'hero', id: 'eris' },
      'mark-prey': { kind: 'enemy', id: 'root-wolf' },
      'blood-edge': { kind: 'enemy', id: 'root-wolf' },
    } as const;

    for (const cardId of Object.keys(expectedTargets) as Array<keyof typeof expectedTargets>) {
      const combat = createCombat('test-seed');
      const played = playCard(combat, card(combat, cardId));
      expect(played.events[0]).toEqual(expect.objectContaining({
        type: 'CARD_PLAYED',
        defId: cardId,
        target: expectedTargets[cardId],
      }));
    }
  });

  it('applies effect events to the resolved target', () => {
    const combat = {
      ...createCombat('test-seed'),
      heroes: createCombat('test-seed').heroes.map((hero) =>
        hero.id === 'eris' ? { ...hero, hp: 10 } : hero,
      ),
    };
    const block = playCard(combat, card(combat, 'hold-fast'));
    const healed = playCard(combat, card(combat, 'mend'));
    const marked = playCard(combat, card(combat, 'mark-prey'), { kind: 'enemy', id: 'root-wolf' });

    expect(block.events).toContainEqual(expect.objectContaining({
      type: 'BLOCK_GAINED',
      heroId: 'liese',
    }));
    expect(healed.combat.heroes.find((hero) => hero.id === 'eris')?.hp).toBe(16);
    expect(healed.events).toContainEqual(expect.objectContaining({
      type: 'HEAL_APPLIED',
      heroId: 'eris',
    }));
    expect(marked.events).toContainEqual(expect.objectContaining({
      type: 'STATUS_APPLIED',
      target: { kind: 'enemy', id: 'root-wolf' },
    }));
  });

  it('can apply hero-targeted statuses without falling through the enemy path', () => {
    const oathWard = M1_CARDS.find((candidate) => candidate.id === 'oath-ward');
    if (!oathWard) throw new Error('Missing Oath Ward definition');
    const combat = createCombatWithCards('test-seed', [oathWard]);
    const result = playCard(combat, card(combat, 'oath-ward'), { kind: 'hero', id: 'liese' });

    expect(result.combat.heroes.find((hero) => hero.id === 'liese')?.statuses.ward).toBe(1);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'STATUS_APPLIED',
      status: 'ward',
      amount: 1,
      total: 1,
      target: { kind: 'hero', id: 'liese' },
    }));
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

  it('spends Ward to prevent one enemy hit before Block is touched', () => {
    const combat = createCombat('test-seed');
    const warded = {
      ...combat,
      heroes: combat.heroes.map((hero) =>
        hero.id === 'liese'
          ? { ...hero, block: 8, statuses: addStatus(hero.statuses, 'ward') }
          : hero,
      ),
    };
    const result = endTurn(warded);
    const liese = result.combat.heroes.find((hero) => hero.id === 'liese');

    expect(liese?.hp).toBe(31);
    expect(liese?.block).toBe(0);
    expect(liese?.statuses.ward).toBe(0);
    expect(result.events.slice(0, 3)).toEqual([
      { type: 'ENEMY_TURN_STARTED' },
      { type: 'STATUS_CONSUMED', status: 'ward', target: { kind: 'hero', id: 'liese' }, prevented: 6 },
      expect.objectContaining({
        type: 'DAMAGE_DEALT',
        amount: 0,
        blocked: 0,
        target: { kind: 'hero', id: 'liese' },
      }),
    ]);
  });

  it('lets Ward prevent a hit without spending target Vulnerable', () => {
    const combat = createCombat('test-seed');
    const guarded = {
      ...combat,
      heroes: combat.heroes.map((hero) =>
        hero.id === 'liese'
          ? { ...hero, statuses: addStatus(addStatus(hero.statuses, 'ward'), 'vulnerable') }
          : hero,
      ),
    };
    const result = endTurn(guarded);
    const liese = result.combat.heroes.find((hero) => hero.id === 'liese');

    expect(liese?.hp).toBe(31);
    expect(liese?.statuses.ward).toBe(0);
    expect(liese?.statuses.vulnerable).toBe(1);
    expect(result.events).toContainEqual({ type: 'STATUS_CONSUMED', status: 'ward', target: { kind: 'hero', id: 'liese' }, prevented: 6 });
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 0,
      tags: ['physical'],
    }));
  });

  it('spends Weak on the enemy to soften the next intent hit', () => {
    const combat = createCombat('test-seed');
    const weakEnemy = {
      ...combat,
      enemy: { ...combat.enemy, statuses: addStatus(combat.enemy.statuses, 'weak') },
    };
    const result = endTurn(weakEnemy);
    const liese = result.combat.heroes.find((hero) => hero.id === 'liese');

    expect(liese?.hp).toBe(27);
    expect(result.combat.enemy.statuses.weak).toBe(0);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 4,
      tags: ['physical', 'weak'],
    }));
  });

  it('spends Vulnerable on the target hero to amplify the next intent hit', () => {
    const combat = createCombat('test-seed');
    const vulnerableLiese = {
      ...combat,
      heroes: combat.heroes.map((hero) =>
        hero.id === 'liese' ? { ...hero, statuses: addStatus(hero.statuses, 'vulnerable') } : hero,
      ),
    };
    const result = endTurn(vulnerableLiese);
    const liese = result.combat.heroes.find((hero) => hero.id === 'liese');

    expect(liese?.hp).toBe(22);
    expect(liese?.statuses.vulnerable).toBe(0);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 9,
      tags: ['physical', 'vulnerable'],
    }));
  });

  it('spends Bleed on the target hero when intent damage gets through HP', () => {
    const combat = createCombat('test-seed');
    const bleedingLiese = {
      ...combat,
      heroes: combat.heroes.map((hero) =>
        hero.id === 'liese' ? { ...hero, statuses: addStatus(hero.statuses, 'bleed', 2) } : hero,
      ),
    };
    const result = endTurn(bleedingLiese);
    const liese = result.combat.heroes.find((hero) => hero.id === 'liese');

    expect(liese?.hp).toBe(23);
    expect(liese?.statuses.bleed).toBe(1);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      amount: 8,
      tags: ['physical', 'bleed'],
    }));
  });

  it('ticks Poison on the enemy before its intent and can win the fight', () => {
    const combat = createCombat('test-seed');
    const poisonedWolf = {
      ...combat,
      enemy: {
        ...combat.enemy,
        hp: 3,
        statuses: addStatus(combat.enemy.statuses, 'poison', 3),
      },
    };
    const result = endTurn(poisonedWolf);

    expect(result.combat.enemy.hp).toBe(0);
    expect(result.combat.enemy.statuses.poison).toBe(2);
    expect(result.events).toEqual([
      { type: 'ENEMY_TURN_STARTED' },
      expect.objectContaining({
        type: 'DAMAGE_DEALT',
        source: { kind: 'system' },
        target: { kind: 'enemy', id: 'root-wolf' },
        amount: 3,
        lethal: true,
        tags: ['poison'],
      }),
      { type: 'VICTORY' },
    ]);
  });

  it('ticks Poison on living heroes at the next player-turn boundary', () => {
    const combat = createCombat('test-seed');
    const poisonedEris = {
      ...combat,
      heroes: combat.heroes.map((hero) =>
        hero.id === 'eris' ? { ...hero, statuses: addStatus(hero.statuses, 'poison', 2) } : hero,
      ),
    };
    const result = endTurn(poisonedEris);
    const eris = result.combat.heroes.find((hero) => hero.id === 'eris');

    expect(eris?.hp).toBe(22);
    expect(eris?.statuses.poison).toBe(1);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      source: { kind: 'system' },
      target: { kind: 'hero', id: 'eris' },
      amount: 2,
      lethal: false,
      tags: ['poison'],
    }));
  });

  it('does not open or spend Bleed from Poison damage', () => {
    const combat = createCombat('test-seed');
    const poisonedBleeder = {
      ...combat,
      enemy: {
        ...combat.enemy,
        statuses: addStatus(addStatus(combat.enemy.statuses, 'poison', 2), 'bleed', 3),
      },
    };
    const result = endTurn(poisonedBleeder);

    expect(result.combat.enemy.hp).toBe(20);
    expect(result.combat.enemy.statuses.poison).toBe(1);
    expect(result.combat.enemy.statuses.bleed).toBe(3);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      source: { kind: 'system' },
      target: { kind: 'enemy', id: 'root-wolf' },
      amount: 2,
      tags: ['poison'],
    }));
  });

  it('can reach defeat when Poison finishes the remaining living heroes after the enemy acts', () => {
    const combat = createCombat('test-seed');
    const doomed = {
      ...combat,
      heroes: combat.heroes.map((hero) => ({
        ...hero,
        hp: hero.id === 'liese' ? 6 : 1,
        statuses: hero.id === 'liese' ? hero.statuses : addStatus(hero.statuses, 'poison'),
      })),
    };
    const result = endTurn(doomed);

    expect(result.combat.heroes.every((hero) => hero.hp === 0)).toBe(true);
    expect(result.events.at(-1)).toEqual({ type: 'DEFEAT' });
    expect(result.events.filter((event) => event.type === 'DAMAGE_DEALT' && event.source.kind === 'system')).toHaveLength(3);
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

  it('retargets intent after hero Poison kills the bitten target', () => {
    const combat = {
      ...createCombat('test-seed'),
      enemy: { ...createCombat('test-seed').enemy, intent: { type: 'attack' as const, target: 'eris' as const, amount: 6 } },
      heroes: createCombat('test-seed').heroes.map((hero) =>
        hero.id === 'eris'
          ? { ...hero, hp: 7, statuses: addStatus(hero.statuses, 'poison') }
          : hero,
      ),
    };
    const result = endTurn(combat);

    expect(result.combat.heroes.find((hero) => hero.id === 'eris')?.hp).toBe(0);
    expect(result.combat.heroes.find((hero) => hero.id === 'liese')?.hp).toBeGreaterThan(0);
    expect(result.combat.enemy.intent).toEqual({ type: 'attack', target: 'liese', amount: 6 });
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

  it('recycles the discard pile when an M1 hand refill exhausts the draw pile', () => {
    const combat = createCombatWithCards('m1-exhaustion', M1_STARTER_CARDS);
    const discardPile = [...combat.hand, ...combat.drawPile.slice(0, 2)];
    const exhausted: CombatState = {
      ...combat,
      hand: [],
      drawPile: [],
      discardPile,
    };

    const drawn = drawToHand(exhausted, 5);

    expect(drawn.hand).toEqual(discardPile.slice(0, 5));
    expect(drawn.drawPile).toEqual(discardPile.slice(5));
    expect(drawn.discardPile).toEqual([]);
  });
});

function card(combat: CombatState, defId: CardId) {
  const cardId = firstCardInstanceId(combat, defId);
  if (!cardId) throw new Error(`Missing test card ${defId}`);
  return cardId;
}

function playOnlyCard(defId: CardId) {
  const def = M1_STARTER_CARDS.find((candidate) => candidate.id === defId);
  if (!def) throw new Error(`Missing M1 card ${defId}`);
  const combat = createCombatWithCards(`test-${defId}`, [def]);
  return playCard(combat, card(combat, defId));
}

function countCardsByOwner(cards: readonly CardDef[]): Record<HeroId, number> {
  return cards.reduce<Record<HeroId, number>>(
    (counts, cardDef) => ({ ...counts, [cardDef.owner]: counts[cardDef.owner] + 1 }),
    { liese: 0, eris: 0, mia: 0, robin: 0 },
  );
}

function contract(id: CardId, owner: HeroId, cost: number, target: 'enemy' | 'owner', effects: CardDef['effects']) {
  return { id, owner, cost, target: { type: target }, effects };
}

function eventForEffect(effectType: CardDef['effects'][number]['type']) {
  if (effectType === 'damage') return { type: 'DAMAGE_DEALT' };
  if (effectType === 'gain-block') return { type: 'BLOCK_GAINED' };
  if (effectType === 'heal') return { type: 'HEAL_APPLIED' };
  if (effectType === 'apply-status') return { type: 'STATUS_APPLIED' };
  return { type: 'DEBT_GAINED' };
}
