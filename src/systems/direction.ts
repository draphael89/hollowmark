import type { Facing, TileCoord } from '../game/types';

export const FACINGS = ['north', 'east', 'south', 'west'] as const satisfies readonly Facing[];

const vectors = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
} as const satisfies Record<Facing, TileCoord>;

export function vectorForFacing(facing: Facing): TileCoord {
  return vectors[facing];
}

export function turnFacing(facing: Facing, direction: 'left' | 'right'): Facing {
  const index = FACINGS.indexOf(facing);
  const next = direction === 'left' ? index + 3 : index + 1;
  return FACINGS[next % FACINGS.length];
}

export function addCoord(a: TileCoord, b: TileCoord): TileCoord {
  return { x: a.x + b.x, y: a.y + b.y };
}
