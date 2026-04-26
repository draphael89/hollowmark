import Phaser from 'phaser';
import { PLACEHOLDER_ASSETS } from '../assets/manifest';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/layout';
import { THEME } from '../game/theme';
import { publishDevSceneDebug } from './devSceneDebug';

const colors = THEME.color;
const text = THEME.text;
const textStyle = THEME.textStyle;
const CARD_W = 242;
const CARD_H = 74;
const DETAIL_W = 540;

export class VisualGalleryScene extends Phaser.Scene {
  private cardsGfx!: Phaser.GameObjects.Graphics;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailBody!: Phaser.GameObjects.Text;
  private selectedIndex = 0;

  constructor() {
    super('VisualGalleryScene');
  }

  create(): void {
    const g = this.add.graphics();
    g.fillStyle(colors.void, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(colors.panel, 1).fillRect(16, 16, 608, 328);
    g.lineStyle(2, colors.oxblood, 1).strokeRect(16, 16, 608, 328);
    this.label('Visual Gallery', 32, 28, text.gold);

    this.cardsGfx = this.add.graphics();
    PLACEHOLDER_ASSETS.forEach((asset, index) => {
      const x = 42 + (index % 2) * 286;
      const y = 68 + Math.floor(index / 2) * 104;
      this.add.zone(x, y, CARD_W, CARD_H)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectAsset(index));
      this.label(`${index + 1}`, x + 12, y + 12, text.gold);
      this.label(asset.title, x + 72, y + 14, text.bone);
      this.label(compactAssetId(asset.id), x + 72, y + 32, text.mutedBone);
      this.label(`${asset.kind} / ${asset.status}`, x + 72, y + 50, text.cyan);
    });

    this.detailTitle = this.add.text(42, 282, '', { ...textStyle, color: text.gold });
    this.detailBody = this.add.text(42, 300, '', {
      ...textStyle,
      color: text.bone,
      fixedWidth: DETAIL_W,
      lineSpacing: 2,
    });
    this.bindKeys();
    this.selectAsset(0);
  }

  private label(value: string, x: number, y: number, color: string): void {
    this.add.text(x, y, value, { ...textStyle, color });
  }

  private bindKeys(): void {
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((key, index) => {
      this.input.keyboard?.on(`keydown-${key}`, () => this.selectAsset(index));
    });
    this.input.keyboard?.on('keydown-RIGHT', () => this.selectAsset((this.selectedIndex + 1) % PLACEHOLDER_ASSETS.length));
    this.input.keyboard?.on('keydown-LEFT', () => this.selectAsset((this.selectedIndex + PLACEHOLDER_ASSETS.length - 1) % PLACEHOLDER_ASSETS.length));
  }

  private selectAsset(index: number): void {
    this.selectedIndex = index;
    this.drawCards();
    this.drawDetails();
    this.publishDebug();
  }

  private drawCards(): void {
    this.cardsGfx.clear();
    PLACEHOLDER_ASSETS.forEach((asset, index) => {
      const x = 42 + (index % 2) * 286;
      const y = 68 + Math.floor(index / 2) * 104;
      const selected = index === this.selectedIndex;
      this.cardsGfx.fillStyle(colors.panelDeep, 1).fillRect(x, y, CARD_W, CARD_H);
      this.cardsGfx.lineStyle(selected ? 2 : 1, selected ? colors.gold : colors.stoneLight, 1).strokeRect(x, y, CARD_W, CARD_H);
      this.drawAssetSwatch(asset.kind, x + 36, y + 38);
    });
  }

  private drawAssetSwatch(kind: (typeof PLACEHOLDER_ASSETS)[number]['kind'], x: number, y: number): void {
    if (kind === 'background') {
      this.cardsGfx.fillStyle(colors.stone, 1).fillRect(x - 24, y - 22, 48, 44);
      this.cardsGfx.fillStyle(colors.moss, 0.8).fillRect(x - 18, y - 6, 36, 6);
      this.cardsGfx.fillStyle(colors.oxblood, 0.8).fillRect(x - 6, y - 18, 12, 34);
      return;
    }
    if (kind === 'sprite') {
      this.cardsGfx.fillStyle(colors.oxblood, 0.72).fillTriangle(x - 24, y + 22, x, y - 24, x + 24, y + 22);
      this.cardsGfx.fillStyle(colors.gold, 1).fillCircle(x - 8, y - 2, 3).fillCircle(x + 8, y - 2, 3);
      return;
    }
    if (kind === 'card-art') {
      this.cardsGfx.fillStyle(colors.stone, 1).fillRoundedRect(x - 17, y - 24, 34, 48, 4);
      this.cardsGfx.lineStyle(1, colors.gold, 1).strokeRoundedRect(x - 17, y - 24, 34, 48, 4);
      this.cardsGfx.fillStyle(colors.red, 0.8).fillRect(x - 9, y - 8, 18, 20);
      return;
    }
    this.cardsGfx.fillStyle(colors.red, 0.85).fillCircle(x, y, 18);
    this.cardsGfx.lineStyle(2, colors.gold, 1).strokeCircle(x, y, 18);
  }

  private drawDetails(): void {
    const asset = PLACEHOLDER_ASSETS[this.selectedIndex];
    this.detailTitle.setText(`Selected ${this.selectedIndex + 1}: ${asset.title}`);
    this.detailBody.setText([
      asset.id,
      `${asset.kind} / ${asset.status}`,
      `Review: ${asset.reviewFocus}`,
    ]);
  }

  private publishDebug(): void {
    const asset = PLACEHOLDER_ASSETS[this.selectedIndex];
    publishDevSceneDebug(this, 'visual-gallery', asset.id, {
      visualGallery: {
        assetCount: PLACEHOLDER_ASSETS.length,
        selectedId: asset.id,
        selectedKind: asset.kind,
        selectedStatus: asset.status,
        selectedReviewFocus: asset.reviewFocus,
        stableIds: PLACEHOLDER_ASSETS.map((entry) => entry.id),
      },
    });
  }
}

function compactAssetId(id: string): string {
  const visible = id.replace('.placeholder', '');
  return visible.length <= 25 ? visible : `${visible.slice(0, 22)}...`;
}
