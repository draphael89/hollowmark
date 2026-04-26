import type { FloorDef, FloorId } from '../../game/types';
import { S0_FLOOR } from './s0';

const floors = {
  [S0_FLOOR.id]: S0_FLOOR,
} as const satisfies Record<FloorId, FloorDef>;

export const START_FLOOR_ID = S0_FLOOR.id;

export function floorForId(id: FloorId): FloorDef {
  return floors[id];
}

export function isFloorId(value: string): value is FloorId {
  return Object.hasOwn(floors, value);
}
