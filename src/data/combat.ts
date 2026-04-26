import type { CardDef, EnemyState, HeroId, StatusStacks } from '../game/types';

export type HeroDef = Readonly<{
  id: HeroId;
  name: string;
  role: string;
  maxHp: number;
}>;

export const S0_HEROES: readonly HeroDef[] = [
  { id: 'liese', name: 'Liese', role: 'Warrior', maxHp: 31 },
  { id: 'eris', name: 'Eris', role: 'Priest', maxHp: 24 },
  { id: 'mia', name: 'Mia', role: 'Mage', maxHp: 20 },
  { id: 'robin', name: 'Robin', role: 'Ranger', maxHp: 23 },
];

export const S0_CARDS: readonly CardDef[] = [
  {
    id: 'iron-cut',
    name: 'Iron Cut',
    owner: 'liese',
    cost: 1,
    target: { type: 'enemy' },
    effects: [{ type: 'damage', amount: 6, tags: ['physical'] }],
    text: 'Deal 6.',
  },
  {
    id: 'hold-fast',
    name: 'Hold Fast',
    owner: 'liese',
    cost: 1,
    target: { type: 'owner' },
    effects: [{ type: 'gain-block', amount: 8 }],
    text: 'Gain 8 Block.',
  },
  {
    id: 'mend',
    name: 'Mend',
    owner: 'eris',
    cost: 1,
    target: { type: 'owner' },
    effects: [{ type: 'heal', amount: 6 }],
    text: 'Heal 6.',
  },
  {
    id: 'mark-prey',
    name: 'Mark Prey',
    owner: 'robin',
    cost: 1,
    target: { type: 'enemy' },
    effects: [{ type: 'apply-status', status: 'mark', amount: 1 }],
    text: 'Apply Mark.',
  },
  {
    id: 'blood-edge',
    name: 'Blood Edge',
    owner: 'mia',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'damage', amount: 12, tags: ['physical', 'debt'] },
      { type: 'gain-debt', amount: 4 },
    ],
    text: 'Deal 12.\nDebt 4.',
  },
];

export const M1_CARDS: readonly CardDef[] = [
  {
    id: 'oath-ward',
    name: 'Oath Ward',
    owner: 'liese',
    cost: 1,
    target: { type: 'owner' },
    effects: [
      { type: 'gain-block', amount: 4 },
      { type: 'apply-status', status: 'ward', amount: 1 },
    ],
    text: 'Gain 4 Block.\nWard 1.',
  },
  {
    id: 'sundering-cut',
    name: 'Sundering Cut',
    owner: 'liese',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'damage', amount: 4, tags: ['physical'] },
      { type: 'apply-status', status: 'vulnerable', amount: 1 },
    ],
    text: 'Deal 4.\nVulnerable 1.',
  },
  {
    id: 'stone-guard',
    name: 'Stone Guard',
    owner: 'liese',
    cost: 1,
    target: { type: 'owner' },
    effects: [
      { type: 'gain-block', amount: 6 },
      { type: 'apply-status', status: 'ward', amount: 1 },
    ],
    text: 'Gain 6 Block.\nWard 1.',
  },
  {
    id: 'ringing-blow',
    name: 'Ringing Blow',
    owner: 'liese',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'damage', amount: 4, tags: ['physical'] },
      { type: 'apply-status', status: 'weak', amount: 1 },
    ],
    text: 'Deal 4.\nWeak 1.',
  },
  {
    id: 'sanctuary-veil',
    name: 'Sanctuary Veil',
    owner: 'eris',
    cost: 1,
    target: { type: 'owner' },
    effects: [
      { type: 'heal', amount: 3 },
      { type: 'apply-status', status: 'ward', amount: 1 },
    ],
    text: 'Heal 3.\nWard 1.',
  },
  {
    id: 'quiet-rebuke',
    name: 'Quiet Rebuke',
    owner: 'eris',
    cost: 1,
    target: { type: 'enemy' },
    effects: [{ type: 'apply-status', status: 'weak', amount: 1 }],
    text: 'Weak 1.',
  },
  {
    id: 'white-thread',
    name: 'White Thread',
    owner: 'eris',
    cost: 1,
    target: { type: 'owner' },
    effects: [
      { type: 'heal', amount: 4 },
      { type: 'apply-status', status: 'ward', amount: 1 },
    ],
    text: 'Heal 4.\nWard 1.',
  },
  {
    id: 'mercy-cut',
    name: 'Mercy Cut',
    owner: 'eris',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'damage', amount: 4, tags: ['physical'] },
      { type: 'apply-status', status: 'weak', amount: 1 },
    ],
    text: 'Deal 4.\nWeak 1.',
  },
  {
    id: 'prayer-knot',
    name: 'Prayer Knot',
    owner: 'eris',
    cost: 0,
    target: { type: 'owner' },
    effects: [
      { type: 'heal', amount: 3 },
      { type: 'gain-debt', amount: 1 },
    ],
    text: 'Heal 3.\nDebt 1.',
  },
  {
    id: 'glass-hex',
    name: 'Glass Hex',
    owner: 'mia',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'apply-status', status: 'vulnerable', amount: 2 },
      { type: 'gain-debt', amount: 2 },
    ],
    text: 'Vulnerable 2.\nDebt 2.',
  },
  {
    id: 'rootfire',
    name: 'Rootfire',
    owner: 'mia',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'apply-status', status: 'poison', amount: 2 },
      { type: 'gain-debt', amount: 1 },
    ],
    text: 'Poison 2.\nDebt 1.',
  },
  {
    id: 'black-spark',
    name: 'Black Spark',
    owner: 'mia',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'damage', amount: 7, tags: ['physical', 'debt'] },
      { type: 'gain-debt', amount: 2 },
    ],
    text: 'Deal 7.\nDebt 2.',
  },
  {
    id: 'venom-script',
    name: 'Venom Script',
    owner: 'mia',
    cost: 1,
    target: { type: 'enemy' },
    effects: [{ type: 'apply-status', status: 'poison', amount: 3 }],
    text: 'Poison 3.',
  },
  {
    id: 'glass-pulse',
    name: 'Glass Pulse',
    owner: 'mia',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'apply-status', status: 'vulnerable', amount: 1 },
      { type: 'damage', amount: 4, tags: ['physical'] },
    ],
    text: 'Vulnerable 1.\nDeal 4.',
  },
  {
    id: 'barbed-shot',
    name: 'Barbed Shot',
    owner: 'robin',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'damage', amount: 3, tags: ['physical'] },
      { type: 'apply-status', status: 'bleed', amount: 2 },
    ],
    text: 'Deal 3.\nBleed 2.',
  },
  {
    id: 'shadow-mark',
    name: 'Shadow Mark',
    owner: 'robin',
    cost: 0,
    target: { type: 'enemy' },
    effects: [
      { type: 'apply-status', status: 'mark', amount: 1 },
      { type: 'gain-debt', amount: 1 },
    ],
    text: 'Mark 1.\nDebt 1.',
  },
  {
    id: 'needle-rain',
    name: 'Needle Rain',
    owner: 'robin',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'damage', amount: 4, tags: ['physical'] },
      { type: 'apply-status', status: 'bleed', amount: 1 },
    ],
    text: 'Deal 4.\nBleed 1.',
  },
  {
    id: 'marked-step',
    name: 'Marked Step',
    owner: 'robin',
    cost: 0,
    target: { type: 'enemy' },
    effects: [{ type: 'apply-status', status: 'mark', amount: 1 }],
    text: 'Mark 1.',
  },
  {
    id: 'tripwire',
    name: 'Tripwire',
    owner: 'robin',
    cost: 1,
    target: { type: 'enemy' },
    effects: [
      { type: 'apply-status', status: 'weak', amount: 1 },
      { type: 'apply-status', status: 'bleed', amount: 1 },
    ],
    text: 'Weak 1.\nBleed 1.',
  },
];

export const M1_STARTER_CARDS: readonly CardDef[] = [...S0_CARDS, ...M1_CARDS];
export const ALL_CARDS: readonly CardDef[] = M1_STARTER_CARDS;

const NO_STATUSES: StatusStacks = {
  poison: 0,
  bleed: 0,
  weak: 0,
  vulnerable: 0,
  mark: 0,
  ward: 0,
};

export const ROOT_WOLF: Readonly<EnemyState> = {
  id: 'root-wolf',
  name: 'Rootbitten Wolf',
  hp: 22,
  maxHp: 22,
  block: 0,
  statuses: NO_STATUSES,
  intent: { type: 'attack', target: 'liese', amount: 6 },
};
