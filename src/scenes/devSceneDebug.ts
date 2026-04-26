import type Phaser from 'phaser';

export type DevSceneKey = 'combat-sandbox' | 'dungeon-sandbox' | 'visual-gallery';

export type DevSceneDebug = {
  scene: DevSceneKey;
  label: string;
  objectCount: number;
};

declare global {
  interface Window {
    __HOLLOWMARK_DEV_SCENE__?: DevSceneDebug;
  }
}

export function publishDevSceneDebug(scene: Phaser.Scene, key: DevSceneKey, label: string): void {
  window.__HOLLOWMARK_DEV_SCENE__ = {
    scene: key,
    label,
    objectCount: scene.children.length,
  };
}
