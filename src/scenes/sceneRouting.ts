import type Phaser from 'phaser';
import { CombatSandboxScene } from './CombatSandboxScene';
import { DungeonSandboxScene } from './DungeonSandboxScene';
import { S0Scene } from './S0Scene';
import { VisualGalleryScene } from './VisualGalleryScene';

export type SceneRoute = 's0' | 'combat-sandbox' | 'dungeon-sandbox' | 'visual-gallery';

export function sceneRouteFromLocation(location: Pick<Location, 'search'>): SceneRoute {
  const value = new URLSearchParams(location.search).get('scene');
  if (value === 'combat-sandbox' || value === 'dungeon-sandbox' || value === 'visual-gallery') return value;
  return 's0';
}

export function scenesForRoute(route: SceneRoute): Phaser.Types.Scenes.SceneType[] {
  if (route === 'combat-sandbox') return [CombatSandboxScene, S0Scene, DungeonSandboxScene, VisualGalleryScene];
  if (route === 'dungeon-sandbox') return [DungeonSandboxScene, S0Scene, CombatSandboxScene, VisualGalleryScene];
  if (route === 'visual-gallery') return [VisualGalleryScene, S0Scene, CombatSandboxScene, DungeonSandboxScene];
  return [S0Scene, CombatSandboxScene, DungeonSandboxScene, VisualGalleryScene];
}
