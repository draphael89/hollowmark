import { ROOT_WOLF, S0_CARDS, S0_HEROES } from '../data/combat';
import {
  cardInstanceId,
  type ActorRef,
  type CardDef,
  type CardEffect,
  type CardId,
  type CardInstanceId,
  type CombatEvent,
  type CombatState,
  type EnemyIntent,
  type HeroId,
  type HeroState,
  type TargetRef,
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

export function playCard(combat: CombatState, cardId: CardInstanceId, target?: TargetRef): { combat: CombatState; events: CombatEvent[] } {
  const card = findCard(combat, cardId);
  if (!card) {
    return {
      combat,
      events: [{ type: 'CARD_REJECTED', cardId, reason: 'missing-card' }],
    };
  }

  const resolvedTarget = target ?? defaultTargetFor(combat, card);
  const targetResult = validateTarget(combat, card, resolvedTarget);
  if (!targetResult.ok) {
    return {
      combat,
      events: [{ type: 'CARD_REJECTED', cardId, reason: targetResult.reason, target: resolvedTarget }],
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

  return resolveCardEffects(afterCost, cardId, card, resolvedTarget);
}

function defaultTargetFor(combat: CombatState, card: CardDef): TargetRef {
  if (card.target.type === 'enemy') return { kind: 'enemy', id: combat.enemy.id };
  return { kind: 'hero', id: card.owner };
}

type TargetValidation =
  | { ok: true }
  | { ok: false; reason: 'invalid-target' | 'dead-target' };

function validateTarget(combat: CombatState, card: CardDef, target: TargetRef): TargetValidation {
  if (card.target.type === 'enemy') {
    if (target.kind !== 'enemy' || target.id !== combat.enemy.id) return { ok: false, reason: 'invalid-target' };
    if (combat.enemy.hp <= 0) return { ok: false, reason: 'dead-target' };
    return { ok: true };
  }

  if (target.kind !== 'hero' || target.id !== card.owner) return { ok: false, reason: 'invalid-target' };
  if (heroById(combat.heroes, card.owner).hp <= 0) return { ok: false, reason: 'dead-target' };
  return { ok: true };
}

function resolveCardEffects(combat: CombatState, cardId: CardInstanceId, card: CardDef, target: TargetRef): { combat: CombatState; events: CombatEvent[] } {
  let next = combat;
  const events: CombatEvent[] = [cardPlayed(cardId, card, target)];

  for (const effect of card.effects) {
    const result = applyCardEffect(next, cardId, card, effect);
    next = result.combat;
    events.push(...result.events);
  }

  if (next.enemy.hp === 0 && !events.some((event) => event.type === 'VICTORY')) events.push({ type: 'VICTORY' });

  return {
    combat: {
      ...next,
      log: [
        ...combat.log,
        `${heroName(card.owner, combat.heroes)} plays ${card.name}.`,
        ...effectLogLines(combat, next, card),
      ],
    },
    events,
  };
}

function applyCardEffect(
  combat: CombatState,
  cardId: CardInstanceId,
  card: CardDef,
  effect: CardEffect,
): { combat: CombatState; events: CombatEvent[] } {
  if (effect.type === 'damage') return applyDamageEffect(combat, cardId, card, effect);
  if (effect.type === 'gain-block') return applyBlockEffect(combat, cardId, card, effect);
  if (effect.type === 'heal') return applyHealEffect(combat, cardId, card, effect);
  if (effect.type === 'apply-status') return applyStatusEffect(combat, cardId, card, effect);
  if (effect.type === 'gain-debt') return applyDebtEffect(combat, cardId, card, effect);
  return assertNever(effect);
}

function applyDamageEffect(
  combat: CombatState,
  cardId: CardInstanceId,
  card: CardDef,
  effect: Extract<CardEffect, { type: 'damage' }>,
): { combat: CombatState; events: CombatEvent[] } {
  const markBonus = combat.enemy.marked ? 4 : 0;
  const rawDamage = effect.amount + markBonus;
  const blocked = Math.min(rawDamage, combat.enemy.block);
  const damage = rawDamage - blocked;
  const source = heroRef(card.owner);
  const target = enemyRef(combat);
  const enemy = {
    ...combat.enemy,
    hp: Math.max(0, combat.enemy.hp - damage),
    block: combat.enemy.block - blocked,
    marked: false,
  };
  const tags = [...effect.tags, ...(markBonus > 0 ? ['mark' as const] : [])] as const;

  return {
    combat: { ...combat, enemy },
    events: [{
      type: 'DAMAGE_DEALT',
      source,
      target,
      amount: damage,
      blocked,
      lethal: enemy.hp === 0,
      tags,
      cardId,
      defId: card.id,
    }],
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
  const targetHero = {
    ...hero,
    block: hero.block - blocked,
    hp: Math.max(0, hero.hp - damage),
  };
  const heroes = combat.heroes.map((candidate) =>
    candidate.id === hero.id
      ? targetHero
      : candidate,
  );

  return {
    combat: {
      ...combat,
      heroes,
      log: [...combat.log, `${combat.enemy.name} bites ${hero.name}.`],
    },
    events: [{
      type: 'DAMAGE_DEALT',
      source: enemyRef(combat),
      target: heroRef(hero.id),
      amount: damage,
      blocked,
      lethal: targetHero.hp === 0,
      tags: ['physical'],
    }],
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

function applyBlockEffect(
  combat: CombatState,
  cardId: CardInstanceId,
  card: CardDef,
  effect: Extract<CardEffect, { type: 'gain-block' }>,
): { combat: CombatState; events: CombatEvent[] } {
  return {
    combat: {
      ...combat,
      heroes: combat.heroes.map((hero) => (hero.id === card.owner ? { ...hero, block: hero.block + effect.amount } : hero)),
    },
    events: [{ type: 'BLOCK_GAINED', heroId: card.owner, amount: effect.amount, source: heroRef(card.owner), cardId, defId: card.id }],
  };
}

function applyHealEffect(
  combat: CombatState,
  cardId: CardInstanceId,
  card: CardDef,
  effect: Extract<CardEffect, { type: 'heal' }>,
): { combat: CombatState; events: CombatEvent[] } {
  return {
    combat: {
      ...combat,
      heroes: combat.heroes.map((hero) =>
        hero.id === card.owner ? { ...hero, hp: Math.min(hero.maxHp, hero.hp + effect.amount) } : hero,
      ),
    },
    events: [{ type: 'HEAL_APPLIED', heroId: card.owner, amount: effect.amount, source: heroRef(card.owner), cardId, defId: card.id }],
  };
}

function applyStatusEffect(
  combat: CombatState,
  cardId: CardInstanceId,
  card: CardDef,
  effect: Extract<CardEffect, { type: 'apply-status' }>,
): { combat: CombatState; events: CombatEvent[] } {
  return {
    combat: {
      ...combat,
      enemy: effect.status === 'mark' ? { ...combat.enemy, marked: true } : combat.enemy,
    },
    events: [{ type: 'STATUS_APPLIED', status: effect.status, source: heroRef(card.owner), target: enemyRef(combat), cardId, defId: card.id }],
  };
}

function applyDebtEffect(
  combat: CombatState,
  cardId: CardInstanceId,
  card: CardDef,
  effect: Extract<CardEffect, { type: 'gain-debt' }>,
): { combat: CombatState; events: CombatEvent[] } {
  const heroes = addDebt(combat.heroes, card.owner, effect.amount);
  return {
    combat: { ...combat, heroes },
    events: [{
      type: 'DEBT_GAINED',
      heroId: card.owner,
      amount: effect.amount,
      total: heroById(heroes, card.owner).debt,
      source: heroRef(card.owner),
      cardId,
      defId: card.id,
    }],
  };
}

function effectLogLines(before: CombatState, after: CombatState, card: CardDef): string[] {
  const lines: string[] = [];
  for (const effect of card.effects) {
    if (effect.type === 'damage') lines.push(`${after.enemy.name} takes ${Math.max(0, before.enemy.hp - after.enemy.hp)}.`);
    if (effect.type === 'gain-block') lines.push(`${heroName(card.owner, before.heroes)} braces. +${effect.amount} Block.`);
    if (effect.type === 'heal') lines.push(`${heroName(card.owner, before.heroes)} mends the party light.`);
    if (effect.type === 'apply-status' && effect.status === 'mark') lines.push(`${heroName(card.owner, before.heroes)} marks the wolf.`);
    if (effect.type === 'gain-debt') lines.push(`The Mark drinks from ${heroName(card.owner, before.heroes)}. +${effect.amount} debt.`);
  }
  if (after.enemy.hp === 0 && before.enemy.hp > 0) lines.push('The wolf falls into the roots.');
  return lines;
}

function cardPlayed(cardId: CardInstanceId, card: CardDef, target: TargetRef): CombatEvent {
  return { type: 'CARD_PLAYED', cardId, defId: card.id, owner: card.owner, cost: card.cost, target };
}

function heroRef(heroId: HeroId): ActorRef {
  return { kind: 'hero', id: heroId };
}

function enemyRef(combat: CombatState): ActorRef {
  return { kind: 'enemy', id: combat.enemy.id };
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

function assertNever(value: never): never {
  throw new Error(`Unexpected card effect: ${JSON.stringify(value)}`);
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
