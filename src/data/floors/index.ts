import type { FloorDef, FloorId } from '../../game/types';
import { S0_FLOOR } from './s0';
import { UNDERROOT_M2_FLOOR } from './underroot';

const floors = {
  's0-root-wolf-hallway': S0_FLOOR,
  'underroot-m2-placeholder': UNDERROOT_M2_FLOOR,
} as const satisfies Record<FloorId, FloorDef>;

export const START_FLOOR_ID = S0_FLOOR.id;
export const UNDERROOT_M2_FLOOR_ID = UNDERROOT_M2_FLOOR.id;

export function floorForId(id: FloorId): FloorDef {
  return floors[id];
}

export function isFloorId(value: string): value is FloorId {
  return Object.hasOwn(floors, value);
}
