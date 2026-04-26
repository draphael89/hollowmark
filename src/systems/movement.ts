import { floorForId, START_FLOOR_ID } from '../data/floors';
import type { Facing, SliceState, TileCoord } from '../game/types';
import { vectorForFacing } from './direction';
import { isFloorWalkable, logLineAt, threatAt } from './floor';
export { turnFacing, vectorForFacing } from './direction';

const START_FLOOR = floorForId(START_FLOOR_ID);

export const START_POSITION: TileCoord = START_FLOOR.start;
export const START_FACING: Facing = START_FLOOR.startFacing;

export type MoveResult =
  | { type: 'moved'; state: SliceState }
  | { type: 'bumped'; state: SliceState };

export function attemptStep(state: SliceState, direction: 'forward' | 'back'): MoveResult {
  const floor = floorForId(state.floorId);
  const facingVector = vectorForFacing(state.facing);
  const sign = direction === 'forward' ? 1 : -1;
  const next = {
    x: state.position.x + facingVector.x * sign,
    y: state.position.y + facingVector.y * sign,
  };

  if (!isFloorWalkable(floor, next)) {
    return {
      type: 'bumped',
      state: withLog(state, 'Stone refuses the step.'),
    };
  }

  return {
    type: 'moved',
      state: {
        ...state,
        position: next,
        threat: threatAt(floor, next),
        log: [...state.log, logLineAt(floor, next)],
      },
  };
}

export function frontTile(state: SliceState): TileCoord {
  const vector = vectorForFacing(state.facing);
  return {
    x: state.position.x + vector.x,
    y: state.position.y + vector.y,
  };
}

export function isWalkable(coord: TileCoord): boolean {
  return isFloorWalkable(START_FLOOR, coord);
}

function withLog(state: SliceState, line: string): SliceState {
  return {
    ...state,
    log: [...state.log, line],
  };
}
