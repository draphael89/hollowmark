import type { Facing, SliceState, ThreatBand, TileCoord } from '../game/types';

export const START_POSITION: TileCoord = { x: 1, y: 3 };
export const START_FACING: Facing = 'north';

const walkableTiles = new Set(['1,3', '1,2', '1,1', '2,1']);

const vectors: Record<Facing, TileCoord> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

export type MoveResult =
  | { type: 'moved'; state: SliceState }
  | { type: 'bumped'; state: SliceState };

export function turnFacing(facing: Facing, direction: 'left' | 'right'): Facing {
  const facings: Facing[] = ['north', 'east', 'south', 'west'];
  const index = facings.indexOf(facing);
  const next = direction === 'left' ? index + 3 : index + 1;
  return facings[next % facings.length];
}

export function attemptStep(state: SliceState, direction: 'forward' | 'back'): MoveResult {
  const facingVector = vectors[state.facing];
  const sign = direction === 'forward' ? 1 : -1;
  const next = {
    x: state.position.x + facingVector.x * sign,
    y: state.position.y + facingVector.y * sign,
  };

  if (!isWalkable(next)) {
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
      threat: threatForPosition(next),
      log: [...state.log, threatLog(next)],
    },
  };
}

export function frontTile(state: SliceState): TileCoord {
  const vector = vectors[state.facing];
  return {
    x: state.position.x + vector.x,
    y: state.position.y + vector.y,
  };
}

export function isWalkable(coord: TileCoord): boolean {
  return walkableTiles.has(`${coord.x},${coord.y}`);
}

function threatForPosition(coord: TileCoord): ThreatBand {
  if (coord.x === 1 && coord.y === 1) return 'hunted';
  if (coord.x === 1 && coord.y === 2) return 'uneasy';
  return 'calm';
}

function threatLog(coord: TileCoord): string {
  if (coord.x === 1 && coord.y === 1) return 'The wolf watches from the root arch.';
  if (coord.x === 1 && coord.y === 2) return 'The torch bends toward something ahead.';
  return 'Your boots find wet stone.';
}

function withLog(state: SliceState, line: string): SliceState {
  return {
    ...state,
    log: [...state.log, line],
  };
}
