import type { CardDef, EnemyState, HeroId } from '../game/types';

export type HeroDef = {
  id: HeroId;
  name: string;
  role: string;
  maxHp: number;
};

export const S0_HEROES: HeroDef[] = [
  { id: 'liese', name: 'Liese', role: 'Warrior', maxHp: 31 },
  { id: 'eris', name: 'Eris', role: 'Priest', maxHp: 24 },
  { id: 'mia', name: 'Mia', role: 'Mage', maxHp: 20 },
  { id: 'robin', name: 'Robin', role: 'Ranger', maxHp: 23 },
];

export const S0_CARDS: CardDef[] = [
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

export const ROOT_WOLF: EnemyState = {
  id: 'root-wolf',
  name: 'Rootbitten Wolf',
  hp: 22,
  maxHp: 22,
  block: 0,
  marked: false,
  intent: { type: 'attack', target: 'liese', amount: 6 },
};
