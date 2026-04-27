import { ALL_CARDS, ROOT_WOLF, S0_CARDS, S0_HEROES } from '../data/combat';
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
  type EnemyState,
  type HeroId,
  type HeroState,
  type TargetRef,
} from '../game/types';
import { addStatus, consumeStatus, emptyStatusStacks, hasStatus, spendStatus } from './status';

export function createCombat(seed: string): CombatState {
  return createCombatState(seed, S0_CARDS, false);
}

export function createCombatWithCards(seed: string, deck: readonly CardDef[]): CombatState {
  return createCombatState(seed, deck, true);
}

function createCombatState(seed: string, deck: readonly CardDef[], shuffle: boolean): CombatState {
  const cards = createCardInstances(seed, deck);
  const deckIds = Object.values(cards).map((card) => card.id);
  const orderedDeckIds = shuffle ? shuffleCardIds(deckIds, seed) : deckIds;
  return {
    turn: 0,
    seed,
    heroes: S0_HEROES.map((hero) => createHero(hero.id, hero.name, hero.role, hero.maxHp)),
    enemy: { ...ROOT_WOLF, statuses: { ...ROOT_WOLF.statuses } },
    cards,
    hand: orderedDeckIds.slice(0, 5),
    drawPile: orderedDeckIds.slice(5),
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

  if (heroById(combat.heroes, card.owner).hp <= 0) {
    return {
      combat,
      events: [{ type: 'CARD_REJECTED', cardId, reason: 'dead-owner' }],
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
    if (targetIsDead(next, target) && effect.type !== 'gain-debt') continue;
    const result = applyCardEffect(next, cardId, card, target, effect);
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
  target: TargetRef,
  effect: CardEffect,
): { combat: CombatState; events: CombatEvent[] } {
  if (effect.type === 'damage') return applyDamageEffect(combat, cardId, card, target, effect);
  if (effect.type === 'gain-block') return applyBlockEffect(combat, cardId, card, target, effect);
  if (effect.type === 'heal') return applyHealEffect(combat, cardId, card, target, effect);
  if (effect.type === 'apply-status') return applyStatusEffect(combat, cardId, card, target, effect);
  if (effect.type === 'gain-debt') return applyDebtEffect(combat, cardId, card, effect);
  return assertNever(effect);
}

function targetIsDead(combat: CombatState, target: TargetRef): boolean {
  if (target.kind === 'enemy') return combat.enemy.hp <= 0;
  return heroById(combat.heroes, target.id).hp <= 0;
}

function applyDamageEffect(
  combat: CombatState,
  cardId: CardInstanceId,
  card: CardDef,
  targetRef: TargetRef,
  effect: Extract<CardEffect, { type: 'damage' }>,
): { combat: CombatState; events: CombatEvent[] } {
  const targetEnemy = enemyTarget(combat, targetRef);
  const sourceHero = heroById(combat.heroes, card.owner);
  const weak = hasStatus(sourceHero.statuses, 'weak');
  const marked = hasStatus(targetEnemy.statuses, 'mark');
  const vulnerable = hasStatus(targetEnemy.statuses, 'vulnerable');
  const weakDamage = weak ? weakAmount(effect.amount) : effect.amount;
  const rawDamage = vulnerableAmount(weakDamage + (marked ? 4 : 0), vulnerable);
  const blocked = Math.min(rawDamage, targetEnemy.block);
  const hitDamage = rawDamage - blocked;
  const bleedDamage = hitDamage > 0 && effect.tags.includes('physical') ? targetEnemy.statuses.bleed : 0;
  const damage = hitDamage + bleedDamage;
  const source = heroRef(card.owner);
  const target = actorRefForTarget(targetRef);
  const enemy = {
    ...targetEnemy,
    hp: Math.max(0, targetEnemy.hp - damage),
    block: targetEnemy.block - blocked,
    statuses: spendIncomingDamageStatuses(targetEnemy.statuses, bleedDamage > 0),
  };
  const tags = [
    ...effect.tags,
    ...(weak ? ['weak' as const] : []),
    ...(marked ? ['mark' as const] : []),
    ...(vulnerable ? ['vulnerable' as const] : []),
    ...(bleedDamage > 0 ? ['bleed' as const] : []),
  ] as const;
  const heroes = weak
    ? combat.heroes.map((hero) => (hero.id === card.owner ? { ...hero, statuses: spendStatus(hero.statuses, 'weak') } : hero))
    : combat.heroes;

  return {
    combat: { ...combat, heroes, enemy },
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
  const enemyPoisoned = applyPoisonToEnemy(combat);
  events.push(...enemyPoisoned.events);
  if (enemyPoisoned.combat.enemy.hp === 0) {
    return {
      combat: enemyPoisoned.combat,
      events: [...events, { type: 'VICTORY' }],
    };
  }

  const bitten = applyEnemyIntent(enemyPoisoned.combat);
  const cleared = clearHeroBlocks(bitten.combat);
  const heroPoisoned = applyPoisonToHeroes(cleared);
  const retargeted = retargetEnemyIntent(heroPoisoned);

  if (retargeted.heroes.every((hero) => hero.hp === 0)) {
    return {
      combat: retargeted,
      events: [...events, ...bitten.events, ...poisonEventsForHeroes(cleared, retargeted), { type: 'DEFEAT' }],
    };
  }

  events.push(...bitten.events, { type: 'ENEMY_TURN_ENDED' }, { type: 'PLAYER_TURN_STARTED' });
  const heroPoisonEvents = poisonEventsForHeroes(cleared, retargeted);
  events.push(...heroPoisonEvents);
  const refilled = refillHand(discardHand(retargeted), 5);
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

  const weak = hasStatus(combat.enemy.statuses, 'weak');
  const warded = hasStatus(hero.statuses, 'ward');
  const attackAmount = weak ? weakAmount(amount) : amount;
  const vulnerable = !warded && hasStatus(hero.statuses, 'vulnerable');
  const incoming = warded ? 0 : vulnerableAmount(attackAmount, vulnerable);
  const prevented = warded ? attackAmount : 0;
  const blocked = Math.min(hero.block, incoming);
  const hitDamage = incoming - blocked;
  const bleedDamage = hitDamage > 0 ? hero.statuses.bleed : 0;
  const damage = hitDamage + bleedDamage;
  const targetHero = {
    ...hero,
    statuses: spendIncomingHeroStatuses(hero.statuses, warded, vulnerable, bleedDamage > 0),
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
      enemy: weak ? { ...combat.enemy, statuses: spendStatus(combat.enemy.statuses, 'weak') } : combat.enemy,
      heroes,
      log: [...combat.log, `${combat.enemy.name} bites ${hero.name}.`],
    },
    events: [
      ...(warded ? [{ type: 'STATUS_CONSUMED' as const, status: 'ward' as const, target: heroRef(hero.id), prevented }] : []),
      {
        type: 'DAMAGE_DEALT',
        source: enemyRef(combat),
        target: heroRef(hero.id),
        amount: damage,
        blocked,
        lethal: targetHero.hp === 0,
        tags: [
          'physical',
          ...(weak ? ['weak' as const] : []),
          ...(vulnerable ? ['vulnerable' as const] : []),
          ...(bleedDamage > 0 ? ['bleed' as const] : []),
        ],
      },
    ],
  };
}

function weakAmount(amount: number): number {
  return Math.floor(amount * 0.75);
}

function vulnerableAmount(amount: number, vulnerable: boolean): number {
  return vulnerable ? Math.floor(amount * 1.5) : amount;
}

function spendIncomingDamageStatuses(statuses: EnemyState['statuses'], bled: boolean): EnemyState['statuses'] {
  const afterBleed = bled ? spendStatus(statuses, 'bleed') : statuses;
  return consumeStatus(spendStatus(afterBleed, 'vulnerable'), 'mark');
}

function spendIncomingHeroStatuses(statuses: HeroState['statuses'], warded: boolean, vulnerable: boolean, bled: boolean): HeroState['statuses'] {
  if (warded) return spendStatus(statuses, 'ward');
  const afterBleed = bled ? spendStatus(statuses, 'bleed') : statuses;
  return vulnerable ? spendStatus(afterBleed, 'vulnerable') : afterBleed;
}

function applyPoisonToEnemy(combat: CombatState): { combat: CombatState; events: CombatEvent[] } {
  const poison = combat.enemy.statuses.poison;
  if (poison === 0) return { combat, events: [] };
  const enemy = {
    ...combat.enemy,
    hp: Math.max(0, combat.enemy.hp - poison),
    statuses: spendStatus(combat.enemy.statuses, 'poison'),
  };
  return {
    combat: { ...combat, enemy },
    events: [{
      type: 'DAMAGE_DEALT',
      source: { kind: 'system' },
      target: enemyRef(combat),
      amount: poison,
      blocked: 0,
      lethal: enemy.hp === 0,
      tags: ['poison'],
    }],
  };
}

function applyPoisonToHeroes(combat: CombatState): CombatState {
  return {
    ...combat,
    heroes: combat.heroes.map((hero) => {
      const poison = hero.statuses.poison;
      if (poison === 0 || hero.hp === 0) return hero;
      return {
        ...hero,
        hp: Math.max(0, hero.hp - poison),
        statuses: spendStatus(hero.statuses, 'poison'),
      };
    }),
  };
}

function poisonEventsForHeroes(before: CombatState, after: CombatState): CombatEvent[] {
  const events: CombatEvent[] = [];
  before.heroes.forEach((hero) => {
    const poison = hero.statuses.poison;
    if (poison === 0 || hero.hp === 0) return;
    const nextHero = heroById(after.heroes, hero.id);
    events.push({
      type: 'DAMAGE_DEALT',
      source: { kind: 'system' },
      target: heroRef(hero.id),
      amount: poison,
      blocked: 0,
      lethal: nextHero.hp === 0,
      tags: ['poison'],
    });
  });
  return events;
}

function clearHeroBlocks(combat: CombatState): CombatState {
  return {
    ...combat,
    heroes: combat.heroes.map((hero) => (hero.block === 0 ? hero : { ...hero, block: 0 })),
    enemy: { ...combat.enemy, intent: retargetIntent(combat.enemy.intent, combat.heroes) },
  };
}

function retargetEnemyIntent(combat: CombatState): CombatState {
  return {
    ...combat,
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
  target: TargetRef,
  effect: Extract<CardEffect, { type: 'gain-block' }>,
): { combat: CombatState; events: CombatEvent[] } {
  const heroId = heroTarget(target);
  return {
    combat: {
      ...combat,
      heroes: combat.heroes.map((hero) => (hero.id === heroId ? { ...hero, block: hero.block + effect.amount } : hero)),
    },
    events: [{ type: 'BLOCK_GAINED', heroId, amount: effect.amount, source: heroRef(card.owner), cardId, defId: card.id }],
  };
}

function applyHealEffect(
  combat: CombatState,
  cardId: CardInstanceId,
  card: CardDef,
  target: TargetRef,
  effect: Extract<CardEffect, { type: 'heal' }>,
): { combat: CombatState; events: CombatEvent[] } {
  const heroId = heroTarget(target);
  return {
    combat: {
      ...combat,
      heroes: combat.heroes.map((hero) =>
        hero.id === heroId ? { ...hero, hp: Math.min(hero.maxHp, hero.hp + effect.amount) } : hero,
      ),
    },
    events: [{ type: 'HEAL_APPLIED', heroId, amount: effect.amount, source: heroRef(card.owner), cardId, defId: card.id }],
  };
}

function applyStatusEffect(
  combat: CombatState,
  cardId: CardInstanceId,
  card: CardDef,
  target: TargetRef,
  effect: Extract<CardEffect, { type: 'apply-status' }>,
): { combat: CombatState; events: CombatEvent[] } {
  if (target.kind === 'hero') {
    const heroes = combat.heroes.map((hero) =>
      hero.id === target.id ? { ...hero, statuses: addStatus(hero.statuses, effect.status, effect.amount) } : hero,
    );
    return {
      combat: { ...combat, heroes },
      events: [{
        type: 'STATUS_APPLIED',
        status: effect.status,
        amount: effect.amount,
        total: heroById(heroes, target.id).statuses[effect.status],
        source: heroRef(card.owner),
        target: actorRefForTarget(target),
        cardId,
        defId: card.id,
      }],
    };
  }

  const targetEnemy = enemyTarget(combat, target);
  const enemy = { ...targetEnemy, statuses: addStatus(targetEnemy.statuses, effect.status, effect.amount) };
  return {
    combat: { ...combat, enemy },
    events: [{
      type: 'STATUS_APPLIED',
      status: effect.status,
      amount: effect.amount,
      total: enemy.statuses[effect.status],
      source: heroRef(card.owner),
      target: actorRefForTarget(target),
      cardId,
      defId: card.id,
    }],
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
    if (effect.type === 'apply-status' && effect.status === 'mark') lines.push(`${heroName(card.owner, before.heroes)} marks ${before.enemy.name}.`);
    if (effect.type === 'gain-debt') lines.push(`The Mark drinks from ${heroName(card.owner, before.heroes)}. +${effect.amount} debt.`);
  }
  if (after.enemy.hp === 0 && before.enemy.hp > 0) lines.push(`${before.enemy.name} falls into the roots.`);
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

function actorRefForTarget(target: TargetRef): ActorRef {
  if (target.kind === 'hero') return heroRef(target.id);
  return { kind: 'enemy', id: target.id };
}

function heroTarget(target: TargetRef): HeroId {
  if (target.kind !== 'hero') throw new Error(`Expected hero target, got ${target.kind}`);
  return target.id;
}

function enemyTarget(combat: CombatState, target: TargetRef): EnemyState {
  if (target.kind !== 'enemy' || target.id !== combat.enemy.id) throw new Error(`Expected enemy target, got ${target.kind}:${target.id}`);
  return combat.enemy;
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

function createCardInstances(seed: string, deck: readonly CardDef[]): CombatState['cards'] {
  const cards: CombatState['cards'] = {};
  deck.forEach((card, index) => {
    const id = cardInstanceId(`${seed}-${index}-${card.id}`);
    cards[id] = { id, defId: card.id };
  });
  return cards;
}

function shuffleCardIds(cardIds: readonly CardInstanceId[], seed: string): CardInstanceId[] {
  const shuffled = [...cardIds];
  const random = seededRandom(`${seed}:deck`);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

function seededRandom(seed: string): () => number {
  let state = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 0x01000193);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function cardDefById(cardId: CardId): CardDef {
  const card = ALL_CARDS.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`Missing card definition ${cardId}`);
  return card;
}

function createHero(id: HeroId, name: string, role: string, maxHp: number): HeroState {
  return { id, name, role, hp: maxHp, maxHp, block: 0, debt: 0, statuses: emptyStatusStacks() };
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
