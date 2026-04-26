import {
  M1_STARTER_CARDS,
} from '../data/combat';
import {
  type CardId,
  type CombatEvent,
  type CombatState,
  type GameEvent,
  type HeroId,
  type SliceState,
} from '../game/types';
import { cardDefFor, createCombatWithCards, endTurn, firstCardInstanceId, playCard, renderIntentText } from './combat';
import { stageCardInHandForLab } from './labCombat';
import { applyCommand, createSliceState } from './slice';

export type ScenarioId =
  | 's0-one-hallway-fight'
  | 'energy-starved-hand'
  | 'held-card-payoff'
  | 'corruption-bargain'
  | 'bad-draw-recovery'
  | 'intent-preview'
  | 'm1-ward-save'
  | 'm1-poison-lethal'
  | 'm1-bleed-payoff'
  | 'm1-bad-shuffle-recovery';

export type ScenarioMetrics = Readonly<{
  commands: number;
  turns: number;
  outcome: SliceState['mode'];
  cardsDrawn: number;
  cardsPlayed: number;
  cardsHeld: number;
  energySpent: number;
  energyWasted: number;
  debtGained: number;
  damageTaken: number;
  noChoiceTurns: number;
  nearDeathTurns: number;
  enemyIntents: readonly string[];
  cardsPlayedByHero: Readonly<Record<HeroId, number>>;
}>;

export type ScenarioGate = Readonly<{
  label: string;
  passed: boolean;
}>;

export type ScenarioVerdict = Readonly<{
  status: 'pass' | 'review' | 'fail';
  kind: 'replay' | 'fixture';
  gates: readonly ScenarioGate[];
}>;

export type ScenarioReport = Readonly<{
  id: ScenarioId;
  name: string;
  seed: string;
  commands: readonly string[];
  state: SliceState;
  events: readonly GameEvent[];
  metrics: ScenarioMetrics;
  verdict: ScenarioVerdict;
}>;

type ScenarioDef = Readonly<{
  id: ScenarioId;
  name: string;
  seed: string;
  run: (seed: string) => ScenarioRun;
}>;

type ScenarioRun = Readonly<{
  commands: readonly string[];
  state: SliceState;
  events: readonly GameEvent[];
  snapshots: readonly SliceState[];
  kind: ScenarioVerdict['kind'];
}>;

const scenarioDefs: readonly ScenarioDef[] = [
  {
    id: 's0-one-hallway-fight',
    name: 'S0 one-hallway fight',
    seed: 'scenario-s0',
    run: (seed) => {
      const combat = enterCombat(seed).state.combat!;
      return runSliceScenario(seed, [
        ...enterCombatCommands,
        { type: 'hold-card', cardId: card(combat, 'mark-prey') },
        { type: 'play-card', cardId: card(combat, 'mark-prey') },
        { type: 'play-card', cardId: card(combat, 'blood-edge') },
        { type: 'play-card', cardId: card(combat, 'iron-cut') },
      ]);
    },
  },
  {
    id: 'energy-starved-hand',
    name: 'Energy-starved hand',
    seed: 'scenario-energy',
    run: (seed) => {
      const combat = enterCombat(seed).state.combat!;
      return runSliceScenario(seed, [
        ...enterCombatCommands,
        { type: 'play-card', cardId: card(combat, 'iron-cut') },
        { type: 'play-card', cardId: card(combat, 'hold-fast') },
        { type: 'play-card', cardId: card(combat, 'mend') },
        { type: 'play-card', cardId: card(combat, 'blood-edge') },
        { type: 'end-turn' },
      ]);
    },
  },
  {
    id: 'held-card-payoff',
    name: 'Held-card payoff',
    seed: 'scenario-held',
    run: (seed) => {
      const combat = enterCombat(seed).state.combat!;
      return runSliceScenario(seed, [
        ...enterCombatCommands,
        { type: 'hold-card', cardId: card(combat, 'mark-prey') },
        { type: 'end-turn' },
        { type: 'play-card', cardId: card(combat, 'mark-prey') },
        { type: 'play-card', cardId: card(combat, 'blood-edge') },
      ]);
    },
  },
  {
    id: 'corruption-bargain',
    name: 'Corruption bargain',
    seed: 'scenario-debt',
    run: (seed) => {
      const combat = enterCombat(seed).state.combat!;
      return runSliceScenario(seed, [
        ...enterCombatCommands,
        { type: 'play-card', cardId: card(combat, 'mark-prey') },
        { type: 'play-card', cardId: card(combat, 'blood-edge') },
      ]);
    },
  },
  {
    id: 'bad-draw-recovery',
    name: 'Bad draw recovery',
    seed: 'scenario-recovery',
    run: (seed) => {
      const combat = enterCombat(seed).state.combat!;
      return runSliceScenario(seed, [
        ...enterCombatCommands,
        { type: 'play-card', cardId: card(combat, 'iron-cut') },
        { type: 'play-card', cardId: card(combat, 'hold-fast') },
        { type: 'play-card', cardId: card(combat, 'mend') },
        { type: 'end-turn' },
        { type: 'play-card', cardId: card(combat, 'blood-edge') },
      ]);
    },
  },
  {
    id: 'intent-preview',
    name: 'Intent preview into combat',
    seed: 'scenario-intent',
    run: (seed) => runSliceScenario(seed, [
      ...enterCombat(seed).commands,
      { type: 'end-turn' },
    ]),
  },
  {
    id: 'm1-ward-save',
    name: 'M1 Ward save',
    seed: 'scenario-m1-ward',
    run: (seed) => runM1Scenario(seed, [
      { type: 'play', defId: 'oath-ward' },
      { type: 'end-turn' },
    ]),
  },
  {
    id: 'm1-poison-lethal',
    name: 'M1 poison lethal',
    seed: 'scenario-m1-poison',
    run: (seed) => runM1Scenario(seed, [
      { type: 'set-enemy-hp', hp: 2 },
      { type: 'play', defId: 'rootfire' },
      { type: 'end-turn' },
    ]),
  },
  {
    id: 'm1-bleed-payoff',
    name: 'M1 bleed payoff',
    seed: 'scenario-m1-bleed',
    run: (seed) => runM1Scenario(seed, [
      { type: 'play', defId: 'barbed-shot' },
      { type: 'play', defId: 'iron-cut' },
    ]),
  },
  {
    id: 'm1-bad-shuffle-recovery',
    name: 'M1 bad-shuffle recovery',
    seed: 'scenario-m1-recovery',
    run: () => runM1NaturalScenario('m1-natural-19', [
      { type: 'play-available', defId: 'shadow-mark' },
      { type: 'play-available', defId: 'blood-edge' },
      { type: 'play-available', defId: 'iron-cut' },
    ]),
  },
];

const enterCombatCommands = [
  { type: 'step-forward' },
  { type: 'step-forward' },
  { type: 'interact' },
] as const satisfies readonly SliceCommand[];

export function scenarioCatalog(): readonly Pick<ScenarioDef, 'id' | 'name' | 'seed'>[] {
  return scenarioDefs.map(({ id, name, seed }) => ({ id, name, seed }));
}

export function runScenario(id: ScenarioId): ScenarioReport {
  const def = scenarioDefs.find((scenario) => scenario.id === id);
  if (!def) throw new Error(`Missing scenario ${id}`);
  const run = def.run(def.seed);
  const metrics = measureScenario(run.commands, run.snapshots, run.events);
  return {
    id: def.id,
    name: def.name,
    seed: def.seed,
    commands: run.commands,
    state: run.state,
    events: run.events,
    metrics,
    verdict: scenarioVerdict(def.id, run.kind, metrics),
  };
}

export function runAllScenarios(): readonly ScenarioReport[] {
  return scenarioDefs.map((scenario) => runScenario(scenario.id));
}

function runSliceScenario(seed: string, commands: readonly Parameters<typeof applyCommand>[1][]): ScenarioRun {
  let state = createSliceState(seed);
  const events: GameEvent[] = [];
  const snapshots: SliceState[] = [state];
  for (const command of commands) {
    const result = applyCommand(state, command);
    state = result.state;
    events.push(...result.events);
    snapshots.push(state);
  }
  return { state, events, snapshots, commands: commands.map(commandLabel), kind: 'replay' };
}

function measureScenario(
  commands: readonly string[],
  snapshots: readonly SliceState[],
  events: readonly GameEvent[],
): ScenarioMetrics {
  const cardsPlayedByHero: Record<HeroId, number> = { liese: 0, eris: 0, mia: 0, robin: 0 };
  const enemyIntents: string[] = [];
  let energyWasted = 0;
  let noChoiceTurns = 0;
  let nearDeathTurns = 0;

  for (let index = 0; index < commands.length; index += 1) {
    const before = snapshots[index]!;
    const after = snapshots[index + 1]!;
    if (before.mode === 'explore' && after.mode === 'combat' && after.combat) {
      enemyIntents.push(renderIntentText(after.combat.enemy.intent));
    }
    if (commands[index] === 'end-turn' && before.combat) {
      energyWasted += before.combat.energy;
      if (!hasPlayableCard(before.combat)) noChoiceTurns += 1;
      enemyIntents.push(renderIntentText(before.combat.enemy.intent));
    }
    if (after.combat?.heroes.some((hero) => hero.hp > 0 && hero.hp <= 6)) nearDeathTurns += 1;
  }

  for (const event of events) {
    if (event.type === 'CARD_PLAYED') cardsPlayedByHero[event.owner] += 1;
  }

  const finalState = snapshots.at(-1)!;
  return {
    commands: commands.length,
    turns: finalState.combat?.turn ?? 0,
    outcome: finalState.mode,
    cardsDrawn: events.filter((event) => event.type === 'CARD_DRAWN').length,
    cardsPlayed: events.filter((event) => event.type === 'CARD_PLAYED').length,
    cardsHeld: events.filter((event) => event.type === 'CARD_HELD').length,
    energySpent: events
      .filter((event): event is Extract<CombatEvent, { type: 'CARD_PLAYED' }> => event.type === 'CARD_PLAYED')
      .reduce((sum, event) => sum + event.cost, 0),
    energyWasted,
    debtGained: events
      .filter((event): event is Extract<CombatEvent, { type: 'DEBT_GAINED' }> => event.type === 'DEBT_GAINED')
      .reduce((sum, event) => sum + event.amount, 0),
    damageTaken: events
      .filter((event): event is Extract<CombatEvent, { type: 'DAMAGE_DEALT' }> => event.type === 'DAMAGE_DEALT' && event.target.kind === 'hero')
      .reduce((sum, event) => sum + event.amount, 0),
    noChoiceTurns,
    nearDeathTurns,
    enemyIntents,
    cardsPlayedByHero,
  };
}

function hasPlayableCard(combat: CombatState): boolean {
  return [...combat.hand, ...(combat.held ? [combat.held] : [])].some((cardId) => cardDefFor(combat, cardId).cost <= combat.energy);
}

function enterCombat(seed: string): { state: SliceState; commands: readonly SliceCommand[] } {
  let state = createSliceState(seed);
  for (const command of enterCombatCommands) state = applyCommand(state, command).state;
  return { state, commands: enterCombatCommands };
}

type SliceCommand = Parameters<typeof applyCommand>[1];

type M1Step =
  | Readonly<{ type: 'play'; defId: CardId }>
  | Readonly<{ type: 'end-turn' }>
  | Readonly<{ type: 'set-enemy-hp'; hp: number }>;

type M1NaturalStep =
  | Readonly<{ type: 'play-available'; defId: CardId }>
  | Readonly<{ type: 'end-turn' }>;

function runM1Scenario(seed: string, steps: readonly M1Step[]): ScenarioRun {
  let combat = createCombatWithCards(seed, M1_STARTER_CARDS);
  const events: GameEvent[] = [];
  const snapshots: SliceState[] = [stateForCombat(seed, combat)];
  const commands: string[] = [];

  for (const step of steps) {
    if (step.type === 'set-enemy-hp') {
      combat = { ...combat, enemy: { ...combat.enemy, hp: step.hp } };
      commands.push(`set-enemy-hp:${step.hp}`);
      snapshots.push(stateForCombat(seed, combat));
      continue;
    }

    if (step.type === 'end-turn') {
      const result = endTurn(combat);
      combat = result.combat;
      events.push(...result.events);
      commands.push('end-turn');
      snapshots.push(stateForCombat(seed, combat, outcomeForCombat(combat)));
      continue;
    }

    combat = stageCardInHandForLab(combat, step.defId);
    const cardId = firstCardInstanceId(combat, step.defId);
    if (!cardId) throw new Error(`Missing M1 scenario card ${step.defId}`);
    const result = playCard(combat, cardId);
    combat = result.combat;
    events.push(...result.events);
    commands.push(`play-card:${step.defId}`);
    snapshots.push(stateForCombat(seed, combat, outcomeForCombat(combat)));
  }

  return {
    commands,
    state: snapshots.at(-1)!,
    events,
    snapshots,
    kind: 'fixture',
  };
}

function runM1NaturalScenario(seed: string, steps: readonly M1NaturalStep[]): ScenarioRun {
  let combat = createCombatWithCards(seed, M1_STARTER_CARDS);
  const events: GameEvent[] = [];
  const snapshots: SliceState[] = [stateForCombat(seed, combat)];
  const commands: string[] = [];

  for (const step of steps) {
    if (step.type === 'end-turn') {
      const result = endTurn(combat);
      combat = result.combat;
      events.push(...result.events);
      commands.push('end-turn');
      snapshots.push(stateForCombat(seed, combat, outcomeForCombat(combat)));
      continue;
    }

    const cardId = firstCardInstanceId(combat, step.defId);
    if (!cardId) throw new Error(`M1 natural scenario card is unavailable: ${step.defId}`);
    const result = playCard(combat, cardId);
    combat = result.combat;
    events.push(...result.events);
    commands.push(`play-card:${step.defId}`);
    snapshots.push(stateForCombat(seed, combat, outcomeForCombat(combat)));
  }

  return {
    commands,
    state: snapshots.at(-1)!,
    events,
    snapshots,
    kind: 'replay',
  };
}

function stateForCombat(seed: string, combat: CombatState, mode: SliceState['mode'] = 'combat'): SliceState {
  const base = createSliceState(seed);
  return {
    ...base,
    mode,
    combat,
    log: ['M1 scenario lab.'],
  };
}

function outcomeForCombat(combat: CombatState): SliceState['mode'] {
  if (combat.enemy.hp === 0) return 'victory';
  if (combat.heroes.every((hero) => hero.hp === 0)) return 'defeat';
  return 'combat';
}

function commandLabel(command: SliceCommand): string {
  if (command.type === 'play-card') return `play-card:${command.cardId}`;
  if (command.type === 'hold-card') return `hold-card:${command.cardId}`;
  return command.type;
}

function card(combat: CombatState, defId: CardId) {
  const cardId = firstCardInstanceId(combat, defId);
  if (!cardId) throw new Error(`Missing scenario card ${defId}`);
  return cardId;
}

function scenarioVerdict(id: ScenarioId, kind: ScenarioVerdict['kind'], metrics: ScenarioMetrics): ScenarioVerdict {
  const gates = scenarioGates(id, kind, metrics);
  const failed = gates.filter((gate) => !gate.passed).length;
  return {
    kind,
    gates,
    status: failed === 0 ? 'pass' : failed === gates.length ? 'fail' : 'review',
  };
}

function scenarioGates(id: ScenarioId, kind: ScenarioVerdict['kind'], metrics: ScenarioMetrics): readonly ScenarioGate[] {
  const basic = [
    gate('has commands', metrics.commands > 0),
    gate('has plays', metrics.cardsPlayed > 0),
  ];
  if (kind === 'fixture') return [...basic, gate('fixture, not shuffle proof', true)];

  if (id === 'm1-bad-shuffle-recovery') {
    return [
      ...basic,
      gate('natural M1 replay', kind === 'replay'),
      gate('wins with real opening hand', metrics.outcome === 'victory'),
      gate('uses debt temptation', metrics.debtGained > 0),
      gate('no wasted turn', metrics.noChoiceTurns === 0),
      gate('Robin and Mia both matter', metrics.cardsPlayedByHero.robin > 0 && metrics.cardsPlayedByHero.mia > 0),
    ];
  }

  return [
    ...basic,
    gate('stays readable', metrics.noChoiceTurns <= 1),
  ];
}

function gate(label: string, passed: boolean): ScenarioGate {
  return { label, passed };
}
