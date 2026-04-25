import type { CardId, SliceCommand, SliceState } from '../game/types';
import { createCombat, holdCard, playCard } from './combat';
import { START_FACING, START_POSITION, attemptStep, turnFacing } from './movement';

export function createSliceState(seed = 's0-root-wolf'): SliceState {
  return {
    seed,
    mode: 'explore',
    position: START_POSITION,
    facing: START_FACING,
    threat: 'calm',
    log: ['Marrowgate is behind you. The Underroot waits.'],
    commandLog: [],
    combat: null,
  };
}

export function applyCommand(state: SliceState, command: SliceCommand): SliceState {
  const next = applyCommandInner(state, command);
  return {
    ...next,
    commandLog: [...state.commandLog, command],
  };
}

export function runReplay(commands: SliceCommand[], seed = 's0-root-wolf'): SliceState {
  return commands.reduce((state, command) => applyCommand(state, command), createSliceState(seed));
}

function applyCommandInner(state: SliceState, command: SliceCommand): SliceState {
  if (command.type === 'step-forward') return attemptStep(state, 'forward').state;
  if (command.type === 'step-back') return attemptStep(state, 'back').state;
  if (command.type === 'turn-left') return turn(state, 'left');
  if (command.type === 'turn-right') return turn(state, 'right');
  if (command.type === 'interact') return interact(state);
  if (command.type === 'hold-card') return withCombat(state, holdCard(state.combat!, command.cardId));
  return playCombatCard(state, command.cardId);
}

function turn(state: SliceState, direction: 'left' | 'right'): SliceState {
  return {
    ...state,
    facing: turnFacing(state.facing, direction),
    log: [...state.log, direction === 'left' ? 'You turn left.' : 'You turn right.'],
  };
}

function interact(state: SliceState): SliceState {
  if (state.mode !== 'explore' || state.threat !== 'hunted') {
    return {
      ...state,
      log: [...state.log, 'Only damp stone answers.'],
    };
  }

  return {
    ...state,
    mode: 'combat',
    combat: createCombat(state.seed),
    log: [...state.log, 'The root arch opens into teeth.'],
  };
}

function playCombatCard(state: SliceState, cardId: CardId): SliceState {
  const result = playCard(assertCombat(state), cardId);
  if (result.events.some((event) => event.type === 'VICTORY')) {
    return {
      ...state,
      mode: 'victory',
      combat: result.combat,
      log: [...state.log, ...result.combat.log.slice(-3), 'Replay saved in the command log.'],
    };
  }

  return withCombat(state, result.combat);
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
