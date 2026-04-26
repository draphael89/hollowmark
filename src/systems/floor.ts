import type { Facing, FloorId, ThreatBand, TileCoord } from '../game/types';

export type TilePurpose = 'start' | 'approach' | 'encounter' | 'side-path';

export type FloorTile = Readonly<{
  coord: TileCoord;
  walkable: boolean;
  threat: ThreatBand;
  purpose: TilePurpose;
  logLine: string;
  visual: 'stone-hall' | 'root-arch' | 'side-passage';
}>;

export type FloorDef = Readonly<{
  id: FloorId;
  start: TileCoord;
  startFacing: Facing;
  tiles: readonly FloorTile[];
}>;

export function tileKey(coord: TileCoord): string {
  return `${coord.x},${coord.y}`;
}

export function tileAt(floor: FloorDef, coord: TileCoord): FloorTile | null {
  return floor.tiles.find((tile) => tileKey(tile.coord) === tileKey(coord)) ?? null;
}

export function isFloorWalkable(floor: FloorDef, coord: TileCoord): boolean {
  return tileAt(floor, coord)?.walkable ?? false;
}

export function threatAt(floor: FloorDef, coord: TileCoord): ThreatBand {
  return tileAt(floor, coord)?.threat ?? 'calm';
}

export function logLineAt(floor: FloorDef, coord: TileCoord): string {
  return tileAt(floor, coord)?.logLine ?? 'Stone refuses the step.';
}
