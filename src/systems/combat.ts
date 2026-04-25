import type { CardDef, CardId, CombatEvent, CombatState, HeroId, HeroState } from '../game/types';

export const s0Cards: CardDef[] = [
  {
    id: 'iron-cut',
    name: 'Iron Cut',
    owner: 'liese',
    cost: 1,
    kind: 'damage',
    amount: 6,
    debt: 0,
    text: 'Deal 6.',
  },
  {
    id: 'hold-fast',
    name: 'Hold Fast',
    owner: 'liese',
    cost: 1,
    kind: 'block',
    amount: 8,
    debt: 0,
    text: 'Gain 8 Block.',
  },
  {
    id: 'mend',
    name: 'Mend',
    owner: 'eris',
    cost: 1,
    kind: 'heal',
    amount: 6,
    debt: 0,
    text: 'Heal 6.',
  },
  {
    id: 'mark-prey',
    name: 'Mark Prey',
    owner: 'robin',
    cost: 1,
    kind: 'mark',
    amount: 0,
    debt: 0,
    text: 'Apply Mark.',
  },
  {
    id: 'blood-edge',
    name: 'Blood Edge',
    owner: 'mia',
    cost: 1,
    kind: 'damage',
    amount: 12,
    debt: 4,
    text: 'Deal 12.\nDebt 4.',
  },
];

export function createCombat(seed: string): CombatState {
  return {
    seed,
    heroes: [
      createHero('liese', 'Liese', 'Warrior', 31),
      createHero('eris', 'Eris', 'Priest', 24),
      createHero('mia', 'Mia', 'Mage', 20),
      createHero('robin', 'Robin', 'Ranger', 23),
    ],
    enemy: {
      id: 'root-wolf',
      name: 'Rootbitten Wolf',
      hp: 24,
      maxHp: 24,
      block: 0,
      marked: false,
      intent: 'Bite Liese for 6',
    },
    hand: s0Cards,
    held: null,
    energy: 3,
    log: ['A Rootbitten Wolf lowers its head.'],
  };
}

export function holdCard(combat: CombatState, cardId: CardId): CombatState {
  if (combat.held) return combat;
  const card = findCard(combat, cardId);
  return {
    ...combat,
    held: card,
    hand: combat.hand.filter((handCard) => handCard.id !== cardId),
    log: [...combat.log, `${card.name} is held for the next breath.`],
  };
}

export function playCard(combat: CombatState, cardId: CardId): { combat: CombatState; events: CombatEvent[] } {
  const card = findCard(combat, cardId);
  if (combat.energy < card.cost) {
    return { combat: { ...combat, log: [...combat.log, 'Not enough energy.'] }, events: [] };
  }

  const afterCost = {
    ...combat,
    energy: combat.energy - card.cost,
    hand: combat.hand.filter((handCard) => handCard.id !== cardId),
    held: combat.held?.id === cardId ? null : combat.held,
  };

  if (card.kind === 'damage') return playDamage(afterCost, card);
  if (card.kind === 'block') return playBlock(afterCost, card);
  if (card.kind === 'heal') return playHeal(afterCost, card);
  return playMark(afterCost, card);
}

function playDamage(combat: CombatState, card: CardDef): { combat: CombatState; events: CombatEvent[] } {
  const markBonus = combat.enemy.marked ? 4 : 0;
  const damage = Math.max(0, card.amount + markBonus - combat.enemy.block);
  const enemy = {
    ...combat.enemy,
    hp: Math.max(0, combat.enemy.hp - damage),
    block: Math.max(0, combat.enemy.block - card.amount - markBonus),
    marked: false,
  };
  const debtResult = card.debt > 0 ? addDebt(combat.heroes, card.owner, card.debt) : combat.heroes;
  const events: CombatEvent[] = [{ type: 'DAMAGE', amount: damage }];

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

function findCard(combat: CombatState, cardId: CardId): CardDef {
  const card = [...combat.hand, ...(combat.held ? [combat.held] : [])].find((candidate) => candidate.id === cardId);
  assertCard(card, cardId);
  return card;
}

function assertCard(card: CardDef | undefined, cardId: CardId): asserts card is CardDef {
  if (!card) throw new Error(`Missing card ${cardId}`);
}

function createHero(id: HeroId, name: string, role: string, maxHp: number): HeroState {
  return { id, name, role, hp: maxHp, maxHp, block: 0, debt: 0 };
}

function heroName(heroId: HeroId, heroes: HeroState[]): string {
  const hero = heroes.find((candidate) => candidate.id === heroId);
  if (!hero) throw new Error(`Missing hero ${heroId}`);
  return hero.name;
}
