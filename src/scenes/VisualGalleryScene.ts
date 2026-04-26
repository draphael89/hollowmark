import Phaser from 'phaser';
import { PLACEHOLDER_ASSETS } from '../assets/manifest';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/layout';
import { THEME } from '../game/theme';
import { publishDevSceneDebug } from './devSceneDebug';

const colors = THEME.color;
const text = THEME.text;
const textStyle = THEME.textStyle;

export class VisualGalleryScene extends Phaser.Scene {
  constructor() {
    super('VisualGalleryScene');
  }

  create(): void {
    const g = this.add.graphics();
    g.fillStyle(colors.void, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(colors.panel, 1).fillRect(16, 16, 608, 328);
    g.lineStyle(2, colors.oxblood, 1).strokeRect(16, 16, 608, 328);
    this.label('Visual Gallery', 32, 28, text.gold);

    PLACEHOLDER_ASSETS.forEach((asset, index) => {
      const x = 42 + (index % 2) * 286;
      const y = 68 + Math.floor(index / 2) * 112;
      g.fillStyle(colors.panelDeep, 1).fillRect(x, y, 242, 74);
      g.lineStyle(1, colors.stoneLight, 1).strokeRect(x, y, 242, 74);
      g.fillStyle(colors.oxblood, 0.7).fillRect(x + 12, y + 14, 48, 46);
      this.label(asset.title, x + 72, y + 14, text.bone);
      this.label(asset.id, x + 72, y + 32, text.mutedBone);
      this.label(`${asset.kind} / ${asset.status}`, x + 72, y + 50, text.cyan);
    });

    publishDevSceneDebug(this, 'visual-gallery', `${PLACEHOLDER_ASSETS.length} placeholders`);
  }

  private label(value: string, x: number, y: number, color: string): void {
    this.add.text(x, y, value, { ...textStyle, color });
  }
}
