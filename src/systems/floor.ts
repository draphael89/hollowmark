import type { FloorDef, FloorTile, ThreatBand, TileCoord } from '../game/types';

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
