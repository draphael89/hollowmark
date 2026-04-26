import type { CardId, CombatState } from '../game/types';
import { firstCardInstanceId } from './combat';

export function stageCardInHandForLab(combat: CombatState, defId: CardId): CombatState {
  if (firstCardInstanceId(combat, defId)) return combat;
  const cardId = Object.values(combat.cards).find((instance) => instance.defId === defId)?.id;
  if (!cardId) throw new Error(`Missing lab card ${defId}`);
  return {
    ...combat,
    hand: [cardId, ...combat.hand.filter((id) => id !== cardId)],
    drawPile: combat.drawPile.filter((id) => id !== cardId),
    discardPile: combat.discardPile.filter((id) => id !== cardId),
  };
}
