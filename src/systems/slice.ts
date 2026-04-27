import type { CardInstanceId, CombatCommand, CombatState, ExploreCommand, GameEvent, SliceCommand, SliceState, TileInteraction, TownCommand } from '../game/types';
import { M1_STARTER_CARDS } from '../data/combat';
import { createCombat, createCombatWithCards, endTurn, holdCard, playCard } from './combat';
import { floorForId, START_FLOOR_ID, UNDERROOT_M2_FLOOR_ID } from '../data/floors';
import { START_FACING, START_POSITION, attemptStep, turnFacing } from './movement';
import { threatAt, tileAt } from './floor';

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
    townService: 'gate',
    townDebt: 0,
    threatClock: 0,
    completedInteractions: [],
    activeInteractionId: null,
    combatReturn: null,
  };
}

export function createTownState(seed = 'm2-underroot'): SliceState {
  const floor = floorForId(UNDERROOT_M2_FLOOR_ID);
  return {
    seed,
    floorId: UNDERROOT_M2_FLOOR_ID,
    mode: 'town',
    position: floor.start,
    facing: floor.startFacing,
    threat: 'calm',
    log: ['Marrowgate lanterns burn low. The Underroot gate waits.'],
    commandLog: [],
    combat: null,
    townService: 'gate',
    townDebt: 0,
    threatClock: 0,
    completedInteractions: [],
    activeInteractionId: null,
    combatReturn: null,
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
  if (isTownCommand(command)) return applyTownCommand(state, command);
  if (isExploreCommand(command)) return applyExploreCommand(state, command);
  return applyCombatCommand(state, command);
}

function applyTownCommand(state: SliceState, command: TownCommand): CommandResult {
  if (state.mode !== 'town') return rejectWrongMode(state, command);

  if (command.type === 'enter-underroot') {
    const floor = floorForId(UNDERROOT_M2_FLOOR_ID);
    return {
      state: {
        ...state,
        townService: 'gate',
        floorId: UNDERROOT_M2_FLOOR_ID,
        mode: 'explore',
        position: floor.start,
        facing: floor.startFacing,
        threat: threatAt(floor, floor.start),
        threatClock: 0,
        log: [...state.log, 'The gate opens. Wet stone swallows the torchlight.'],
      },
      events: [{ type: 'UNDERROOT_ENTERED' }],
    };
  }

  if (command.type === 'settle-debt') {
    if (state.townDebt === 0) {
      return {
        state: {
          ...state,
          townService: 'sanctuary',
          log: [...state.log, 'The Sanctuary finds no debt ready to settle.'],
        },
        events: [{ type: 'INTERACT_NONE' }],
      };
    }

    return {
      state: {
        ...state,
        townService: 'sanctuary',
        townDebt: 0,
        log: [...state.log, 'The Sanctuary tallies the debt and lets the party breathe.'],
      },
      events: [{ type: 'INTERACT_NONE' }],
    };
  }

  if (command.type === 'choose-town-service') {
    return {
      state: {
        ...state,
        townService: command.service,
        log: [...state.log, townServiceLog(command.service)],
      },
      events: [{ type: 'TOWN_SERVICE_SELECTED', service: command.service }],
    };
  }

  return assertNever(command);
}

function townServiceLog(service: SliceState['townService']): string {
  if (service === 'gate') return 'The Gate waits with its black stair.';
  if (service === 'vellum') return 'The Vellum lays the starter deck in a careful grid.';
  return 'The Sanctuary counts wounds and debt.';
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
    state: spendSafety(result.state),
    events: [{ type: 'STEP_MOVED', from: state.position, to: result.state.position, threat: result.state.threat }],
  };
}

function spendSafety(state: SliceState): SliceState {
  if (state.floorId !== UNDERROOT_M2_FLOOR_ID) return state;
  return {
    ...state,
    threatClock: state.threatClock + threatStepCost(state.threat),
  };
}

function threatStepCost(threat: SliceState['threat']): number {
  if (threat === 'hunted') return 3;
  if (threat === 'uneasy') return 2;
  return 1;
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
  const floor = floorForId(state.floorId);
  const tile = tileAt(floor, state.position);
  const interaction = tile?.interaction;
  if (!interaction || state.completedInteractions.includes(interaction.id)) {
    return {
      state: {
        ...state,
        log: [...state.log, 'Only damp stone answers.'],
      },
      events: [{ type: 'INTERACT_NONE' }],
    };
  }

  return resolveInteraction(state, interaction);
}

function resolveInteraction(state: SliceState, interaction: TileInteraction): CommandResult {
  if (interaction.type === 'combat') {
    if (interaction.id === 'underroot-boss-1' && !canOpenBoss(state)) {
      return {
        state: {
          ...state,
          log: [...state.log, 'The larger root arch stays shut. Bring back a spoil or break a hunter first.'],
        },
        events: [{ type: 'INTERACT_NONE' }],
      };
    }

    const combat = createCombatForState(state, interaction.id);
    return {
      state: {
        ...state,
        mode: 'combat',
        combat,
        activeInteractionId: interaction.id,
        combatReturn: interaction.returnTo,
        log: [...state.log, interaction.logLine, ...spoilCombatLog(state)],
      },
      events: [{ type: 'COMBAT_STARTED' }],
    };
  }

  if (interaction.type === 'rest') {
    return completeInteraction(state, interaction, { logLine: interaction.logLine });
  }

  if (interaction.type === 'reward') {
    return completeInteraction(state, interaction, {
      townDebt: state.townDebt + interaction.debt,
      logLine: interaction.logLine,
    });
  }

  if (interaction.type === 'shortcut') {
    const floor = floorForId(state.floorId);
    return completeInteraction(state, interaction, {
      position: interaction.to,
      threat: threatAt(floor, interaction.to),
      townDebt: state.townDebt + interaction.debt,
      logLine: interaction.logLine,
    });
  }

  if (interaction.type === 'return-town') {
    const completed = completeInteraction(state, interaction, {
      mode: 'town',
      logLine: interaction.logLine,
    });
    return {
      state: completed.state,
      events: [...completed.events, { type: 'MARROWGATE_RETURNED' }],
    };
  }

  return assertNever(interaction);
}

function canOpenBoss(state: SliceState): boolean {
  return countCompleted(state, 'underroot-reward-') > 0 || countCompleted(state, 'underroot-normal-') > 0 || countCompleted(state, 'underroot-elite-') > 0;
}

function createCombatForState(state: SliceState, interactionId: string): CombatState {
  const combat = state.floorId === UNDERROOT_M2_FLOOR_ID ? tuneUnderrootEncounter(createCombatWithCards(state.seed, M1_STARTER_CARDS), interactionId) : createCombat(state.seed);
  const spoilCount = countCompleted(state, 'underroot-reward-');
  if (spoilCount === 0) return combat;

  return {
    ...combat,
    heroes: combat.heroes.map((hero) => ({
      ...hero,
      block: hero.block + spoilCount,
    })),
  };
}

function tuneUnderrootEncounter(combat: CombatState, interactionId: string): CombatState {
  if (interactionId === 'underroot-elite-1') {
    return {
      ...combat,
      enemy: {
        ...combat.enemy,
        id: 'root-knotted-brute',
        name: 'Root-Knotted Brute',
        hp: 32,
        maxHp: 32,
        intent: { type: 'attack', target: 'mia', amount: 8 },
      },
    };
  }

  if (interactionId === 'underroot-boss-1') {
    return {
      ...combat,
      enemy: {
        ...combat.enemy,
        id: 'underroot-alpha',
        name: 'Underroot Alpha',
        hp: 42,
        maxHp: 42,
        intent: { type: 'attack', target: 'liese', amount: 10 },
      },
    };
  }

  return combat;
}

function spoilCombatLog(state: SliceState): string[] {
  const spoilCount = countCompleted(state, 'underroot-reward-');
  if (spoilCount === 0) return [];
  if (spoilCount === 1) return ['An Underroot spoil hardens the party: +1 block.'];
  return [`Underroot spoils harden the party: +${spoilCount} block.`];
}

function countCompleted(state: SliceState, prefix: string): number {
  return state.completedInteractions.filter((id) => id.startsWith(prefix)).length;
}

function completeInteraction(
  state: SliceState,
  interaction: Exclude<TileInteraction, { type: 'combat' }>,
  patch: Partial<Pick<SliceState, 'mode' | 'position' | 'threat' | 'townDebt'>> & { logLine: string },
): CommandResult {
  const { logLine, ...statePatch } = patch;
  return {
    state: {
      ...state,
      ...statePatch,
      completedInteractions: [...state.completedInteractions, interaction.id],
      log: [...state.log, logLine],
    },
    events: [{ type: 'TILE_INTERACTION_COMPLETED', id: interaction.id, interaction: interaction.type }],
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
    return resolveCombatVictory(state, result.combat, result.events);
  }

  return { state: withCombat(state, result.combat), events: result.events };
}

function endCombatTurn(state: SliceState): CommandResult {
  const result = endTurn(assertCombat(state));
  if (result.events.some((event) => event.type === 'VICTORY')) {
    return resolveCombatVictory(state, result.combat, result.events);
  }
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

function resolveCombatVictory(state: SliceState, combat: NonNullable<SliceState['combat']>, events: GameEvent[]): CommandResult {
  if (!state.activeInteractionId || !state.combatReturn) {
    return {
      state: {
        ...state,
        mode: 'victory',
        combat,
        log: [...state.log, ...combat.log.slice(-3), 'Replay saved in the command log.'],
      },
      events,
    };
  }

  const completedEvent: GameEvent = {
    type: 'TILE_INTERACTION_COMPLETED',
    id: state.activeInteractionId,
    interaction: 'combat',
  };

  if (state.combatReturn === 'victory') {
    return {
      state: {
        ...state,
        mode: 'victory',
        combat,
        activeInteractionId: null,
        combatReturn: null,
        log: [...state.log, ...combat.log.slice(-3), 'Replay saved in the command log.'],
      },
      events,
    };
  }

  const returnedToTown = state.combatReturn === 'town';
  const returnLine = returnedToTown ? townReturnLine(state) : 'The Underroot path opens again.';
  return {
    state: {
      ...state,
      mode: state.combatReturn,
      combat: null,
      completedInteractions: [...state.completedInteractions, state.activeInteractionId],
      activeInteractionId: null,
      combatReturn: null,
      log: [...state.log, ...combat.log.slice(-3), returnLine],
    },
    events: returnedToTown ? [...events, completedEvent, { type: 'MARROWGATE_RETURNED' }] : [...events, completedEvent],
  };
}

function townReturnLine(state: SliceState): string {
  if (state.activeInteractionId === 'underroot-boss-1') return 'Marrowgate bells answer: the Underroot Alpha is sealed.';
  return 'Marrowgate takes the party back in.';
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

function isTownCommand(command: SliceCommand): command is TownCommand {
  return command.type === 'enter-underroot' || command.type === 'settle-debt' || command.type === 'choose-town-service';
}

function assertNever(value: never): never {
  throw new Error(`Unexpected command: ${JSON.stringify(value)}`);
}
