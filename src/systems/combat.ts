import { ROOT_WOLF, S0_CARDS, S0_HEROES } from '../data/combat';
import {
  cardInstanceId,
  type CardDef,
  type CardId,
  type CardInstanceId,
  type CombatEvent,
  type CombatState,
  type EnemyIntent,
  type HeroId,
  type HeroState,
} from '../game/types';

export function createCombat(seed: string): CombatState {
  const cards = createCardInstances(seed);
  const openingHand = Object.values(cards).map((card) => card.id);
  return {
    turn: 0,
    seed,
    heroes: S0_HEROES.map((hero) => createHero(hero.id, hero.name, hero.role, hero.maxHp)),
    enemy: { ...ROOT_WOLF },
    cards,
    drawPile: [],
    hand: openingHand,
    discardPile: [],
    held: null,
    energy: 3,
    log: ['A Rootbitten Wolf lowers its head.'],
  };
}

export function holdCard(combat: CombatState, cardId: CardInstanceId): { combat: CombatState; events: CombatEvent[] } {
  if (combat.held) {
    return {
      combat,
      events: [{ type: 'CARD_REJECTED', cardId, reason: 'hold-slot-full' }],
    };
  }

  const card = findCard(combat, cardId);
  if (!card) {
    return {
      combat,
      events: [{ type: 'CARD_REJECTED', cardId, reason: 'missing-card' }],
    };
  }

  return {
    combat: {
      ...combat,
      held: cardId,
      hand: combat.hand.filter((handCardId) => handCardId !== cardId),
      log: [...combat.log, `${card.name} is held for the next breath.`],
    },
    events: [{ type: 'CARD_HELD', cardId, defId: card.id }],
  };
}

export function playCard(combat: CombatState, cardId: CardInstanceId): { combat: CombatState; events: CombatEvent[] } {
  const card = findCard(combat, cardId);
  if (!card) {
    return {
      combat,
      events: [{ type: 'CARD_REJECTED', cardId, reason: 'missing-card' }],
    };
  }

  if (combat.energy < card.cost) {
    return {
      combat: { ...combat, log: [...combat.log, 'Not enough energy.'] },
      events: [{ type: 'CARD_REJECTED', cardId, reason: 'not-enough-energy' }],
    };
  }

  const afterCost = {
    ...combat,
    energy: combat.energy - card.cost,
    hand: combat.hand.filter((handCardId) => handCardId !== cardId),
    discardPile: [...combat.discardPile, cardId],
    held: combat.held === cardId ? null : combat.held,
  };

  if (card.kind === 'damage') return playDamage(afterCost, card);
  if (card.kind === 'block') return playBlock(afterCost, card);
  if (card.kind === 'heal') return playHeal(afterCost, card);
  return playMark(afterCost, card);
}

function playDamage(combat: CombatState, card: CardDef): { combat: CombatState; events: CombatEvent[] } {
  const markBonus = combat.enemy.marked ? 4 : 0;
  const rawDamage = card.amount + markBonus;
  const blocked = Math.min(rawDamage, combat.enemy.block);
  const damage = rawDamage - blocked;
  const enemy = {
    ...combat.enemy,
    hp: Math.max(0, combat.enemy.hp - damage),
    block: combat.enemy.block - blocked,
    marked: false,
  };
  const debtResult = card.debt > 0 ? addDebt(combat.heroes, card.owner, card.debt) : combat.heroes;
  const events: CombatEvent[] = [{ type: 'DAMAGE', amount: damage, blocked, target: 'enemy' }];

  if (card.debt > 0) events.push({ type: 'DEBT', heroId: card.owner, amount: card.debt });
  if (enemy.hp === 0) events.push({ type: 'VICTORY' });

  return {
    combat: {
      ...combat,
      heroes: debtResult,
      enemy,
      log: [
        ...combat.log,
        `${heroName(card.owner, combat.heroes)} plays ${card.name}.`,
        `${enemy.name} takes ${damage}.`,
        ...(card.debt > 0 ? [`The Mark drinks from ${heroName(card.owner, combat.heroes)}. +${card.debt} debt.`] : []),
        ...(enemy.hp === 0 ? ['The wolf falls into the roots.'] : []),
      ],
    },
    events,
  };
}

export function endTurn(combat: CombatState): { combat: CombatState; events: CombatEvent[] } {
  const events: CombatEvent[] = [{ type: 'ENEMY_TURN_STARTED' }];
  const bitten = applyEnemyIntent(combat);
  const cleared = clearHeroBlocks(bitten.combat);

  if (cleared.heroes.every((hero) => hero.hp === 0)) {
    return {
      combat: cleared,
      events: [...events, ...bitten.events, { type: 'DEFEAT' }],
    };
  }

  events.push(...bitten.events, { type: 'ENEMY_TURN_ENDED' }, { type: 'PLAYER_TURN_STARTED' });
  const refilled = refillHand(discardHand(cleared), 5);
  events.push(...refilled.events);

  return {
    combat: {
      ...refilled.combat,
      turn: combat.turn + 1,
      energy: 3,
    },
    events,
  };
}

function applyEnemyIntent(combat: CombatState): { combat: CombatState; events: CombatEvent[] } {
  return intentResolvers[combat.enemy.intent.type](combat, combat.enemy.intent);
}

function enemyAttack(combat: CombatState, heroId: HeroId, amount: number): { combat: CombatState; events: CombatEvent[] } {
  const intended = heroById(combat.heroes, heroId);
  const hero = intended.hp > 0 ? intended : combat.heroes.find((candidate) => candidate.hp > 0);
  if (!hero) return { combat, events: [] };

  const blocked = Math.min(hero.block, amount);
  const damage = amount - blocked;
  const heroes = combat.heroes.map((candidate) =>
    candidate.id === hero.id
      ? {
          ...candidate,
          block: candidate.block - blocked,
          hp: Math.max(0, candidate.hp - damage),
        }
      : candidate,
  );

  return {
    combat: {
      ...combat,
      heroes,
      log: [...combat.log, `${combat.enemy.name} bites ${hero.name}.`],
    },
    events: [{ type: 'DAMAGE', amount: damage, blocked, target: hero.id }],
  };
}

function clearHeroBlocks(combat: CombatState): CombatState {
  return {
    ...combat,
    heroes: combat.heroes.map((hero) => (hero.block === 0 ? hero : { ...hero, block: 0 })),
    enemy: { ...combat.enemy, intent: retargetIntent(combat.enemy.intent, combat.heroes) },
  };
}

function retargetIntent(intent: EnemyIntent, heroes: HeroState[]): EnemyIntent {
  if (intent.type === 'attack' && heroById(heroes, intent.target).hp === 0) {
    const nextTarget = heroes.find((hero) => hero.hp > 0)?.id ?? intent.target;
    return { ...intent, target: nextTarget };
  }

  return intent;
}

function playBlock(combat: CombatState, card: CardDef): { combat: CombatState; events: CombatEvent[] } {
  return {
    combat: {
      ...combat,
      heroes: combat.heroes.map((hero) => (hero.id === card.owner ? { ...hero, block: hero.block + card.amount } : hero)),
      log: [...combat.log, `${heroName(card.owner, combat.heroes)} braces. +${card.amount} Block.`],
    },
    events: [{ type: 'BLOCK', heroId: card.owner, amount: card.amount }],
  };
}

function playHeal(combat: CombatState, card: CardDef): { combat: CombatState; events: CombatEvent[] } {
  return {
    combat: {
      ...combat,
      heroes: combat.heroes.map((hero) =>
        hero.id === card.owner ? { ...hero, hp: Math.min(hero.maxHp, hero.hp + card.amount) } : hero,
      ),
      log: [...combat.log, `${heroName(card.owner, combat.heroes)} mends the party light.`],
    },
    events: [{ type: 'HEAL', heroId: card.owner, amount: card.amount }],
  };
}

function playMark(combat: CombatState, card: CardDef): { combat: CombatState; events: CombatEvent[] } {
  return {
    combat: {
      ...combat,
      enemy: { ...combat.enemy, marked: true },
      log: [...combat.log, `${heroName(card.owner, combat.heroes)} marks the wolf.`],
    },
    events: [{ type: 'MARK' }],
  };
}

function addDebt(heroes: HeroState[], heroId: HeroId, amount: number): HeroState[] {
  return heroes.map((hero) => (hero.id === heroId ? { ...hero, debt: hero.debt + amount } : hero));
}

export function renderIntentText(intent: EnemyIntent): string {
  return intentRenderers[intent.type](intent);
}

export function cardDefFor(combat: CombatState, cardId: CardInstanceId): CardDef {
  const instance = combat.cards[cardId];
  if (!instance) throw new Error(`Missing card instance ${cardId}`);
  return cardDefById(instance.defId);
}

export function firstCardInstanceId(combat: CombatState, defId: CardId): CardInstanceId | null {
  return [...combat.hand, ...(combat.held ? [combat.held] : [])].find((cardId) => combat.cards[cardId]?.defId === defId) ?? null;
}

export function drawToHand(combat: CombatState, targetHandSize: number): CombatState {
  return drawToHandWithEvents(combat, targetHandSize).combat;
}

function discardHand(combat: CombatState): CombatState {
  if (combat.hand.length === 0) return combat;
  return {
    ...combat,
    discardPile: [...combat.discardPile, ...combat.hand],
    hand: [],
  };
}

function refillHand(combat: CombatState, targetHandSize: number): { combat: CombatState; events: CombatEvent[] } {
  return drawToHandWithEvents(combat, targetHandSize);
}

function drawToHandWithEvents(combat: CombatState, targetHandSize: number): { combat: CombatState; events: CombatEvent[] } {
  let next = combat;
  const events: CombatEvent[] = [];

  while (next.hand.length < targetHandSize) {
    if (next.drawPile.length === 0) {
      if (next.discardPile.length === 0) break;
      next = { ...next, drawPile: next.discardPile, discardPile: [] };
    }

    const cardId = next.drawPile[0];
    if (!cardId) break;
    next = { ...next, drawPile: next.drawPile.slice(1), hand: [...next.hand, cardId] };
    events.push({ type: 'CARD_DRAWN', cardId, defId: cardDefFor(next, cardId).id });
  }

  if (events.length > 0) events.push({ type: 'HAND_REFILLED', count: events.length });
  return { combat: next, events };
}

function findCard(combat: CombatState, cardId: CardInstanceId): CardDef | undefined {
  if (!combat.hand.includes(cardId) && combat.held !== cardId) return undefined;
  return cardDefFor(combat, cardId);
}

function createCardInstances(seed: string): CombatState['cards'] {
  const cards: CombatState['cards'] = {};
  S0_CARDS.forEach((card, index) => {
    const id = cardInstanceId(`${seed}-${index}-${card.id}`);
    cards[id] = { id, defId: card.id };
  });
  return cards;
}

function cardDefById(cardId: CardId): CardDef {
  const card = S0_CARDS.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`Missing card definition ${cardId}`);
  return card;
}

function createHero(id: HeroId, name: string, role: string, maxHp: number): HeroState {
  return { id, name, role, hp: maxHp, maxHp, block: 0, debt: 0 };
}

function heroName(heroId: HeroId, heroes: HeroState[]): string {
  return heroById(heroes, heroId).name;
}

function heroById(heroes: HeroState[], heroId: HeroId): HeroState {
  const hero = heroes.find((candidate) => candidate.id === heroId);
  if (!hero) throw new Error(`Missing hero ${heroId}`);
  return hero;
}

function heroLabel(heroId: HeroId): string {
  if (heroId === 'liese') return 'Liese';
  if (heroId === 'eris') return 'Eris';
  if (heroId === 'mia') return 'Mia';
  return 'Robin';
}

const intentRenderers = {
  attack: (intent: Extract<EnemyIntent, { type: 'attack' }>) => `Bite ${heroLabel(intent.target)} for ${intent.amount}`,
} satisfies Record<EnemyIntent['type'], (intent: EnemyIntent) => string>;

const intentResolvers = {
  attack: (combat: CombatState, intent: Extract<EnemyIntent, { type: 'attack' }>) => enemyAttack(combat, intent.target, intent.amount),
} satisfies Record<EnemyIntent['type'], (combat: CombatState, intent: EnemyIntent) => { combat: CombatState; events: CombatEvent[] }>;
