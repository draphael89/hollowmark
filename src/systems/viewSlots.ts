import type { Facing, ThreatBand, TileCoord } from '../game/types';
import { addCoord, turnFacing, vectorForFacing } from './direction';
import type { FloorDef, FloorTile } from './floor';
import { tileAt } from './floor';

export type ViewSlotId = 'current' | 'front' | 'left' | 'right';

export type ViewSlot = Readonly<{
  id: ViewSlotId;
  coord: TileCoord;
  tile: FloorTile | null;
  walkable: boolean;
  threat: ThreatBand;
}>;

export function computeViewSlots(floor: FloorDef, position: TileCoord, facing: Facing): readonly ViewSlot[] {
  const forward = vectorForFacing(facing);
  const left = vectorForFacing(turnFacing(facing, 'left'));
  const right = vectorForFacing(turnFacing(facing, 'right'));
  const front = addCoord(position, forward);

  return [
    slot(floor, 'current', position),
    slot(floor, 'front', front),
    slot(floor, 'left', addCoord(front, left)),
    slot(floor, 'right', addCoord(front, right)),
  ];
}

export function viewSlot(slots: readonly ViewSlot[], id: ViewSlotId): ViewSlot {
  const found = slots.find((slot) => slot.id === id);
  if (!found) throw new Error(`Missing view slot ${id}`);
  return found;
}

function slot(floor: FloorDef, id: ViewSlotId, coord: TileCoord): ViewSlot {
  const tile = tileAt(floor, coord);
  return {
    id,
    coord,
    tile,
    walkable: tile?.walkable ?? false,
    threat: tile?.threat ?? 'calm',
  };
}
