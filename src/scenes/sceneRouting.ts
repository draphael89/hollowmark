import type Phaser from 'phaser';
import { CombatSandboxScene } from './CombatSandboxScene';
import { DungeonSandboxScene } from './DungeonSandboxScene';
import { S0Scene } from './S0Scene';
import { ScenarioLabScene } from './ScenarioLabScene';
import { VisualGalleryScene } from './VisualGalleryScene';

export type SceneRoute = 's0' | 'm1-combat' | 'm2-underroot' | 'combat-sandbox' | 'dungeon-sandbox' | 'visual-gallery' | 'scenario-lab';

export function sceneRouteFromLocation(location: Pick<Location, 'search'>): SceneRoute {
  const value = new URLSearchParams(location.search).get('scene');
  if (value === 's0') return value;
  if (value === 'm1-combat' || value === 'm2-underroot') return value;
  if (value === 'combat-sandbox' || value === 'dungeon-sandbox' || value === 'visual-gallery' || value === 'scenario-lab') return value;
  return 'm2-underroot';
}

export function scenesForRoute(route: SceneRoute): Phaser.Types.Scenes.SceneType[] {
  if (route === 'combat-sandbox') return [CombatSandboxScene];
  if (route === 'dungeon-sandbox') return [DungeonSandboxScene];
  if (route === 'visual-gallery') return [VisualGalleryScene];
  if (route === 'scenario-lab') return [ScenarioLabScene];
  return [S0Scene];
}
