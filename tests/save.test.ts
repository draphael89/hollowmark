import { describe, expect, it } from 'vitest';
import { M1_STARTER_CARDS } from '../src/data/combat';
import { cardInstanceId, type SliceCommand, type SliceState } from '../src/game/types';
import { createCombatWithCards } from '../src/systems/combat';
import { deserializeSave, migrateSave, serializeSave } from '../src/systems/save';
import { applyCommand, createSliceState } from '../src/systems/slice';

describe('versioned saves', () => {
  it('round-trips S0 explore state through JSON', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'turn-right' },
    ]);
    const result = deserializeSave(JSON.parse(JSON.stringify(serializeSave(state))));

    expect(result).toEqual({ ok: true, state });
  });

  it('round-trips active combat, zones, debt, and held cards', () => {
    const combat = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
      { type: 'hold-card', cardId: cardInstanceId('s0-root-wolf-3-mark-prey') },
      { type: 'play-card', cardId: cardInstanceId('s0-root-wolf-3-mark-prey') },
      { type: 'play-card', cardId: cardInstanceId('s0-root-wolf-4-blood-edge') },
    ]);
    const result = deserializeSave(JSON.parse(JSON.stringify(serializeSave(combat))));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toEqual(combat);
    expect(result.state.floorId).toBe('s0-root-wolf-hallway');
    expect(result.state.combat?.enemy.hp).toBe(6);
    expect(result.state.combat?.enemy.statuses.mark).toBe(0);
    expect(result.state.combat?.heroes.find((hero) => hero.id === 'mia')?.debt).toBe(4);
    expect(result.state.combat?.held).toBeNull();
    expect(result.state.combat?.discardPile).toEqual([
      's0-root-wolf-3-mark-prey',
      's0-root-wolf-4-blood-edge',
    ]);
  });

  it('round-trips target-bearing command logs', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
      { type: 'play-card', cardId: cardInstanceId('s0-root-wolf-0-iron-cut'), target: { kind: 'enemy', id: 'root-wolf' } },
    ]);
    const result = deserializeSave(JSON.parse(JSON.stringify(serializeSave(state))));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.commandLog.at(-1)).toEqual({
      type: 'play-card',
      cardId: 's0-root-wolf-0-iron-cut',
      target: { kind: 'enemy', id: 'root-wolf' },
    });
  });

  it('rejects combat saves whose command log references missing card instances', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const badLog = serializeSave({
      ...state,
      commandLog: [
        ...state.commandLog,
        { type: 'play-card', cardId: cardInstanceId('missing-card') },
      ],
    });

    expect(deserializeSave(JSON.parse(JSON.stringify(badLog)))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects combat saves whose command log targets a missing enemy', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const badTarget = serializeSave({
      ...state,
      commandLog: [
        ...state.commandLog,
        {
          type: 'play-card',
          cardId: cardInstanceId('s0-root-wolf-0-iron-cut'),
          target: { kind: 'enemy', id: 'phantom-wolf' },
        },
      ],
    });

    expect(deserializeSave(JSON.parse(JSON.stringify(badTarget)))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects malformed or unsupported saves without throwing', () => {
    expect(deserializeSave(null)).toEqual({ ok: false, error: 'Save must be an object.' });
    expect(deserializeSave({ version: 2, state: createSliceState() })).toEqual({ ok: false, error: 'Unsupported save version.' });
    expect(deserializeSave({ version: 1, state: { ...createSliceState(), floorId: 'unknown-floor' } })).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects saves with impossible floor positions or threat bands', () => {
    const state = createSliceState();

    expect(deserializeSave(serializeSave({ ...state, position: { x: 99, y: 99 } }))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
    expect(deserializeSave(serializeSave({ ...state, threat: 'hunted' }))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects combat saves with card-zone references that do not exist', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const broken = serializeSave({
      ...state,
      combat: state.combat ? { ...state.combat, hand: [cardInstanceId('missing-card')] } : null,
    });

    expect(deserializeSave(JSON.parse(JSON.stringify(broken)))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects combat saves with one card duplicated across zones', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const duplicated = serializeSave({
      ...state,
      combat: state.combat
        ? {
            ...state.combat,
            discardPile: [state.combat.hand[0]!],
          }
        : null,
    });

    expect(deserializeSave(JSON.parse(JSON.stringify(duplicated)))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects combat saves with one card missing from every zone', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const missing = serializeSave({
      ...state,
      combat: state.combat
        ? {
            ...state.combat,
            hand: state.combat.hand.slice(1),
          }
        : null,
    });

    expect(deserializeSave(JSON.parse(JSON.stringify(missing)))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects combat saves with an empty deck', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const emptyDeck = serializeSave({
      ...state,
      combat: state.combat
        ? {
            ...state.combat,
            cards: {},
            hand: [],
            drawPile: [],
            discardPile: [],
            held: null,
          }
        : null,
    });

    expect(deserializeSave(JSON.parse(JSON.stringify(emptyDeck)))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects fractional status stacks at the save boundary', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const fractional = serializeSave({
      ...state,
      combat: state.combat
        ? {
            ...state.combat,
            enemy: {
              ...state.combat.enemy,
              statuses: { ...state.combat.enemy.statuses, ward: 0.5 },
            },
          }
        : null,
    });

    expect(deserializeSave(JSON.parse(JSON.stringify(fractional)))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('round-trips an M1 lab combat with larger zones and multiple statuses', () => {
    const combat = createCombatWithCards('m1-save', M1_STARTER_CARDS);
    const [held, discarded, ...hand] = combat.hand;
    if (!held || !discarded) throw new Error('M1 save fixture needs at least two hand cards');
    const state: SliceState = {
      ...createSliceState('m1-save'),
      mode: 'combat',
      log: ['M1 save lab.'],
      combat: {
        ...combat,
        held,
        hand,
        discardPile: [discarded],
        enemy: {
          ...combat.enemy,
          statuses: { ...combat.enemy.statuses, poison: 2, bleed: 1, vulnerable: 1 },
        },
        heroes: combat.heroes.map((hero) =>
          hero.id === 'liese'
            ? { ...hero, statuses: { ...hero.statuses, ward: 1 } }
            : hero.id === 'mia'
              ? { ...hero, debt: 2 }
              : hero,
        ),
      },
    };

    const result = deserializeSave(JSON.parse(JSON.stringify(serializeSave(state))));

    expect(result).toEqual({ ok: true, state });
  });

  it('rejects combat saves that omit or duplicate canonical heroes', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const missing = JSON.parse(JSON.stringify(serializeSave(state)));
    missing.state.combat.heroes = missing.state.combat.heroes.filter((hero: { id: string }) => hero.id !== 'liese');
    const duplicated = JSON.parse(JSON.stringify(serializeSave(state)));
    duplicated.state.combat.heroes[1] = { ...duplicated.state.combat.heroes[0] };

    expect(deserializeSave(missing)).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
    expect(deserializeSave(duplicated)).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects impossible numeric combat values at the save boundary', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const badSaves = [
      withCombatValue(state, 'turn', -1),
      withCombatValue(state, 'energy', 1.5),
      withCombatValue(state, 'energy', 999),
      withHeroValue(state, 'liese', 'hp', -1),
      withHeroValue(state, 'liese', 'hp', 32),
      withHeroValue(state, 'liese', 'maxHp', 0),
      withHeroValue(state, 'liese', 'block', -1),
      withHeroValue(state, 'mia', 'debt', 0.5),
      withEnemyValue(state, 'hp', -1),
      withEnemyValue(state, 'block', -1),
      withEnemyIntentAmount(state, 0),
    ];

    for (const save of badSaves) {
      expect(deserializeSave(save)).toEqual({
        ok: false,
        error: 'Save state is invalid.',
      });
    }
  });

  it('rejects active combat saves whose enemy intent targets a downed hero', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    const badIntent = serializeSave({
      ...state,
      combat: state.combat
        ? {
            ...state.combat,
            heroes: state.combat.heroes.map((hero) =>
              hero.id === 'liese' ? { ...hero, hp: 0 } : hero,
            ),
            enemy: {
              ...state.combat.enemy,
              intent: { type: 'attack', target: 'liese', amount: 6 },
            },
          }
        : null,
    });

    expect(deserializeSave(JSON.parse(JSON.stringify(badIntent)))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects outcome saves without combat state', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);

    expect(deserializeSave(serializeSave({ ...state, mode: 'victory', combat: null }))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
    expect(deserializeSave(serializeSave({ ...state, mode: 'defeat', combat: null }))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('rejects saves whose mode disagrees with terminal combat facts', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);
    if (!state.combat) throw new Error('Expected combat fixture');
    const livingVictory = serializeSave({
      ...state,
      mode: 'victory',
    });
    const deadEnemyCombat = serializeSave({
      ...state,
      combat: {
        ...state.combat,
        enemy: { ...state.combat.enemy, hp: 0 },
      },
    });
    const livingDefeat = serializeSave({
      ...state,
      mode: 'defeat',
    });
    const deadPartyCombat = serializeSave({
      ...state,
      combat: {
        ...state.combat,
        heroes: state.combat.heroes.map((hero) => ({ ...hero, hp: 0 })),
      },
    });

    for (const save of [livingVictory, deadEnemyCombat, livingDefeat, deadPartyCombat]) {
      expect(deserializeSave(save)).toEqual({
        ok: false,
        error: 'Save state is invalid.',
      });
    }
  });

  it('loads legacy enemy Mark flags into status stacks', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
      { type: 'play-card', cardId: cardInstanceId('s0-root-wolf-3-mark-prey') },
    ]);
    const serialized = JSON.parse(JSON.stringify(serializeSave(state)));
    serialized.state.combat.enemy.marked = true;
    delete serialized.state.combat.enemy.statuses;

    const result = deserializeSave(serialized);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.combat?.enemy.statuses.mark).toBe(1);
  });

  it('rejects explore saves with combat state attached', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);

    expect(deserializeSave(serializeSave({ ...state, mode: 'explore' }))).toEqual({
      ok: false,
      error: 'Save state is invalid.',
    });
  });

  it('migrates current saves through the migration entrypoint', () => {
    const state = run([
      { type: 'step-forward' },
      { type: 'step-forward' },
      { type: 'interact' },
    ]);

    expect(migrateSave(JSON.parse(JSON.stringify(serializeSave(state))))).toEqual({ ok: true, state });
  });
});

function run(commands: SliceCommand[], seed = 's0-root-wolf'): SliceState {
  let state = createSliceState(seed);
  for (const command of commands) state = applyCommand(state, command).state;
  return state;
}

function withCombatValue(state: SliceState, key: string, value: unknown) {
  const save = JSON.parse(JSON.stringify(serializeSave(state)));
  save.state.combat[key] = value;
  return save;
}

function withHeroValue(state: SliceState, heroId: string, key: string, value: unknown) {
  const save = JSON.parse(JSON.stringify(serializeSave(state)));
  const hero = save.state.combat.heroes.find((candidate: { id: string }) => candidate.id === heroId);
  hero[key] = value;
  return save;
}

function withEnemyValue(state: SliceState, key: string, value: unknown) {
  const save = JSON.parse(JSON.stringify(serializeSave(state)));
  save.state.combat.enemy[key] = value;
  return save;
}

function withEnemyIntentAmount(state: SliceState, amount: number) {
  const save = JSON.parse(JSON.stringify(serializeSave(state)));
  save.state.combat.enemy.intent.amount = amount;
  return save;
}
