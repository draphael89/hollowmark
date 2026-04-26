import type { CardInstanceId, CombatCommand, ExploreCommand, GameEvent, SliceCommand, SliceState } from '../game/types';
import { createCombat, endTurn, holdCard, playCard } from './combat';
import { START_FLOOR_ID } from '../data/floors';
import { START_FACING, START_POSITION, attemptStep, turnFacing } from './movement';

export type CommandResult = {
  state: SliceState;
  events: GameEvent[];
};

export function createSliceState(seed = 's0-root-wolf'): SliceState {
  return {
    seed,
    floorId: START_FLOOR_ID,
    mode: 'explore',
    position: START_POSITION,
    facing: START_FACING,
    threat: 'calm',
    log: ['Marrowgate is behind you. The Underroot waits.'],
    commandLog: [],
    combat: null,
  };
}

export function applyCommand(state: SliceState, command: SliceCommand): CommandResult {
  const result = applyCommandInner(state, command);

  return {
    state: {
      ...result.state,
      commandLog: [...state.commandLog, command],
    },
    events: result.events,
  };
}

export function runReplay(commands: SliceCommand[], seed = 's0-root-wolf'): CommandResult {
  let state = createSliceState(seed);
  const events: GameEvent[] = [];
  for (const command of commands) {
    const result = applyCommand(state, command);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

function applyCommandInner(state: SliceState, command: SliceCommand): CommandResult {
  if (isExploreCommand(command)) return applyExploreCommand(state, command);
  return applyCombatCommand(state, command);
}

function applyExploreCommand(state: SliceState, command: ExploreCommand): CommandResult {
  if (state.mode !== 'explore') return rejectWrongMode(state, command);

  if (command.type === 'step-forward') return step(state, 'forward');
  if (command.type === 'step-back') return step(state, 'back');
  if (command.type === 'turn-left') return turn(state, 'left');
  if (command.type === 'turn-right') return turn(state, 'right');
  if (command.type === 'interact') return interact(state);
  return assertNever(command);
}

function applyCombatCommand(state: SliceState, command: CombatCommand): CommandResult {
  if (state.mode !== 'combat' || !state.combat) return rejectWrongMode(state, command);

  if (command.type === 'end-turn') return endCombatTurn(state);
  if (command.type === 'hold-card') return holdCombatCard(state, command.cardId);
  if (command.type === 'play-card') return playCombatCard(state, command);
  return assertNever(command);
}

function step(state: SliceState, direction: 'forward' | 'back'): CommandResult {
  const result = attemptStep(state, direction);
  if (result.type === 'bumped') {
    return {
      state: result.state,
      events: [{ type: 'STEP_BUMPED', at: state.position, facing: state.facing }],
    };
  }

  return {
    state: result.state,
    events: [{ type: 'STEP_MOVED', from: state.position, to: result.state.position, threat: result.state.threat }],
  };
}

function turn(state: SliceState, direction: 'left' | 'right'): CommandResult {
  const facing = turnFacing(state.facing, direction);
  return {
    state: {
      ...state,
      facing,
      log: [...state.log, direction === 'left' ? 'You turn left.' : 'You turn right.'],
    },
    events: [{ type: 'FACING_CHANGED', from: state.facing, to: facing }],
  };
}

function interact(state: SliceState): CommandResult {
  if (state.threat !== 'hunted') {
    return {
      state: {
        ...state,
        log: [...state.log, 'Only damp stone answers.'],
      },
      events: [{ type: 'INTERACT_NONE' }],
    };
  }

  return {
    state: {
      ...state,
      mode: 'combat',
      combat: createCombat(state.seed),
      log: [...state.log, 'The root arch opens into teeth.'],
    },
    events: [{ type: 'COMBAT_STARTED' }],
  };
}

function holdCombatCard(state: SliceState, cardId: CardInstanceId): CommandResult {
  const result = holdCard(assertCombat(state), cardId);
  if (result.combat === state.combat) return { state, events: result.events };

  return {
    state: withCombat(state, result.combat),
    events: result.events,
  };
}

function playCombatCard(state: SliceState, command: Extract<CombatCommand, { type: 'play-card' }>): CommandResult {
  const result = playCard(assertCombat(state), command.cardId, command.target);
  if (result.combat === state.combat) return { state, events: result.events };
  if (result.events.some((event) => event.type === 'VICTORY')) {
    return {
      state: {
        ...state,
        mode: 'victory',
        combat: result.combat,
        log: [...state.log, ...result.combat.log.slice(-3), 'Replay saved in the command log.'],
      },
      events: result.events,
    };
  }

  return { state: withCombat(state, result.combat), events: result.events };
}

function endCombatTurn(state: SliceState): CommandResult {
  const result = endTurn(assertCombat(state));
  if (result.events.some((event) => event.type === 'DEFEAT')) {
    return {
      state: {
        ...state,
        mode: 'defeat',
        combat: result.combat,
        log: [...state.log, ...result.combat.log.slice(-2), 'The Underroot closes over the party.'],
      },
      events: result.events,
    };
  }

  return { state: withCombat(state, result.combat), events: result.events };
}

function withCombat(state: SliceState, combat: NonNullable<SliceState['combat']>): SliceState {
  return {
    ...state,
    combat,
    log: [...state.log, combat.log.at(-1)!],
  };
}

function assertCombat(state: SliceState): NonNullable<SliceState['combat']> {
  if (!state.combat) throw new Error('Combat command requires combat state');
  return state.combat;
}

function rejectWrongMode(state: SliceState, command: SliceCommand): CommandResult {
  return {
    state,
    events: [{ type: 'COMMAND_REJECTED', reason: 'wrong-mode', commandType: command.type, mode: state.mode }],
  };
}

function isExploreCommand(command: SliceCommand): command is ExploreCommand {
  return (
    command.type === 'step-forward' ||
    command.type === 'step-back' ||
    command.type === 'turn-left' ||
    command.type === 'turn-right' ||
    command.type === 'interact'
  );
}

function assertNever(value: never): never {
  throw new Error(`Unexpected command: ${JSON.stringify(value)}`);
}
