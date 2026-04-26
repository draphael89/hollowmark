import type { FloorDef } from '../../game/types';

export const S0_FLOOR: FloorDef = {
  id: 's0-root-wolf-hallway',
  start: { x: 1, y: 3 },
  startFacing: 'north',
  tiles: [
    {
      coord: { x: 1, y: 3 },
      walkable: true,
      threat: 'calm',
      purpose: 'start',
      logLine: 'Your boots find wet stone.',
      visual: 'stone-hall',
    },
    {
      coord: { x: 1, y: 2 },
      walkable: true,
      threat: 'uneasy',
      purpose: 'approach',
      logLine: 'The torch bends toward something ahead.',
      visual: 'stone-hall',
    },
    {
      coord: { x: 1, y: 1 },
      walkable: true,
      threat: 'hunted',
      purpose: 'encounter',
      logLine: 'The wolf watches from the root arch.',
      visual: 'root-arch',
    },
    {
      coord: { x: 2, y: 1 },
      walkable: true,
      threat: 'calm',
      purpose: 'side-path',
      logLine: 'A narrow side passage breathes cold air.',
      visual: 'side-passage',
    },
  ],
};
