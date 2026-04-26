import { describe, expect, it } from 'vitest';
import { M1_STARTER_CARDS } from '../src/data/combat';
import type { CardId, CombatState } from '../src/game/types';
import { createCombatWithCards, firstCardInstanceId } from '../src/systems/combat';
import { stageCardInHandForLab } from '../src/systems/labCombat';

describe('lab combat helpers', () => {
  it('stages one missing card instance into hand without duplicating zone references', () => {
    const combat = createCombatWithCards('lab-stage-from-draw', M1_STARTER_CARDS);
    const defId = firstDefIdOutsidePlayableSurface(combat);
    const staged = stageCardInHandForLab(combat, defId);
    const cardId = firstCardInstanceId(staged, defId);

    expect(cardId).not.toBeNull();
    expect(staged.hand[0]).toBe(cardId);
    expect(zoneCardIds(staged)).toHaveLength(Object.keys(staged.cards).length);
    expect(new Set(zoneCardIds(staged)).size).toBe(zoneCardIds(staged).length);
  });

  it('can stage a fixture card back out of discard', () => {
    const combat = createCombatWithCards('lab-stage-from-discard', M1_STARTER_CARDS);
    const discarded = combat.drawPile[0];
    if (!discarded) throw new Error('Expected draw-pile card');
    const defId = combat.cards[discarded]?.defId;
    if (!defId) throw new Error('Expected discarded card definition');
    const withDiscard: CombatState = {
      ...combat,
      drawPile: combat.drawPile.filter((id) => id !== discarded),
      discardPile: [discarded],
    };

    const staged = stageCardInHandForLab(withDiscard, defId);

    expect(staged.hand[0]).toBe(discarded);
    expect(staged.discardPile).not.toContain(discarded);
    expect(new Set(zoneCardIds(staged)).size).toBe(zoneCardIds(staged).length);
  });

  it('keeps already playable hand and held cards untouched', () => {
    const combat = createCombatWithCards('lab-stage-playable', M1_STARTER_CARDS);
    const handDefId = combat.cards[combat.hand[0]!]?.defId;
    if (!handDefId) throw new Error('Expected opening hand card');

    expect(stageCardInHandForLab(combat, handDefId)).toBe(combat);

    const held = combat.hand[1];
    if (!held) throw new Error('Expected second opening hand card');
    const heldCombat: CombatState = {
      ...combat,
      held,
      hand: combat.hand.filter((id) => id !== held),
    };
    const heldDefId = heldCombat.cards[held]?.defId;
    if (!heldDefId) throw new Error('Expected held card definition');

    expect(stageCardInHandForLab(heldCombat, heldDefId)).toBe(heldCombat);
  });

  it('fails loudly when a lab fixture asks for a card outside the deck', () => {
    const combat = createCombatWithCards('lab-stage-missing', [M1_STARTER_CARDS[0]!]);

    expect(() => stageCardInHandForLab(combat, 'rootfire')).toThrow('Missing lab card rootfire');
  });
});

function firstDefIdOutsidePlayableSurface(combat: CombatState): CardId {
  const playable = new Set([...combat.hand, ...(combat.held ? [combat.held] : [])]);
  const card = [...combat.drawPile, ...combat.discardPile]
    .map((id) => combat.cards[id])
    .find((candidate) => candidate && !playable.has(candidate.id));
  if (!card) throw new Error('Expected at least one non-playable card');
  return card.defId;
}

function zoneCardIds(combat: CombatState) {
  return [
    ...combat.hand,
    ...combat.drawPile,
    ...combat.discardPile,
    ...(combat.held ? [combat.held] : []),
  ];
}
