import Phaser from 'phaser';
import { ASSET_MANIFEST_KEY, ASSET_MANIFEST_URL, type AssetManifestEntry, galleryAssetsFromManifest } from '../assets/manifest';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/layout';
import { THEME } from '../game/theme';
import { publishDevSceneDebug } from './devSceneDebug';

const colors = THEME.color;
const text = THEME.text;
const textStyle = THEME.textStyle;
const CARD_W = 242;
const CARD_H = 58;
const CARD_GAP_Y = 68;
const DETAIL_W = 274;
const SELECTED_PREVIEW = { x: 330, y: 276, w: 250, h: 58 };

export class VisualGalleryScene extends Phaser.Scene {
  private cardsGfx!: Phaser.GameObjects.Graphics;
  private assets: readonly AssetManifestEntry[] = [];
  private selectedGfx!: Phaser.GameObjects.Graphics;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailBody!: Phaser.GameObjects.Text;
  private previewImages: Phaser.GameObjects.Image[] = [];
  private selectedPreview?: Phaser.GameObjects.Image;
  private selectedIndex = 0;

  constructor() {
    super('VisualGalleryScene');
  }

  preload(): void {
    this.load.json(ASSET_MANIFEST_KEY, ASSET_MANIFEST_URL);
  }

  create(): void {
    this.assets = galleryAssetsFromManifest(this.cache.json.get(ASSET_MANIFEST_KEY));
    for (const asset of this.assets) {
      this.load.image(asset.id, asset.previewPath);
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.createGallery());
    this.load.start();
  }

  private createGallery(): void {
    const g = this.add.graphics();
    g.fillStyle(colors.void, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(colors.panel, 1).fillRect(16, 16, 608, 328);
    g.lineStyle(2, colors.oxblood, 1).strokeRect(16, 16, 608, 328);
    this.label('Visual Gallery', 32, 28, text.gold);

    this.cardsGfx = this.add.graphics();
    this.selectedGfx = this.add.graphics();
    this.assets.forEach((asset, index) => {
      const x = 42 + (index % 2) * 286;
      const y = 62 + Math.floor(index / 2) * CARD_GAP_Y;
      this.add.zone(x, y, CARD_W, CARD_H)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectAsset(index));
      this.label(`${index + 1}`, x + 12, y + 12, text.gold);
      this.label(asset.title, x + 72, y + 14, text.bone);
      this.label(compactAssetId(asset.id), x + 72, y + 32, text.mutedBone);
      this.label(`${asset.kind} / ${compactGate(asset.approvalGate)}`, x + 72, y + 46, gateColor(asset.approvalGate));
    });

    this.detailTitle = this.add.text(42, 276, '', { ...textStyle, color: text.gold });
    this.detailBody = this.add.text(42, 294, '', {
      ...textStyle,
      color: text.bone,
      fixedWidth: DETAIL_W,
      lineSpacing: 0,
    });
    this.label('Preview', SELECTED_PREVIEW.x, SELECTED_PREVIEW.y - 16, text.mutedBone);
    this.bindKeys();
    this.selectAsset(0);
  }

  private label(value: string, x: number, y: number, color: string): void {
    this.add.text(x, y, value, { ...textStyle, color });
  }

  private bindKeys(): void {
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].forEach((key, index) => {
      this.input.keyboard?.on(`keydown-${key}`, () => this.selectAsset(index));
    });
    this.input.keyboard?.on('keydown-RIGHT', () => this.selectAsset((this.selectedIndex + 1) % this.assets.length));
    this.input.keyboard?.on('keydown-LEFT', () => this.selectAsset((this.selectedIndex + this.assets.length - 1) % this.assets.length));
  }

  private selectAsset(index: number): void {
    this.selectedIndex = index;
    this.drawCards();
    this.drawDetails();
    this.publishDebug();
  }

  private drawCards(): void {
    this.cardsGfx.clear();
    this.previewImages.forEach((image) => image.destroy());
    this.previewImages = [];
    this.selectedPreview?.destroy();
    this.selectedPreview = undefined;
    this.assets.forEach((asset, index) => {
      const x = 42 + (index % 2) * 286;
      const y = 62 + Math.floor(index / 2) * CARD_GAP_Y;
      const selected = index === this.selectedIndex;
      this.cardsGfx.fillStyle(colors.panelDeep, 1).fillRect(x, y, CARD_W, CARD_H);
      this.cardsGfx.lineStyle(selected ? 2 : 1, selected ? colors.gold : colors.stoneLight, 1).strokeRect(x, y, CARD_W, CARD_H);
      this.drawAssetPreview(asset, x + 36, y + 38);
    });
  }

  private drawAssetPreview(asset: AssetManifestEntry, x: number, y: number): void {
    if (this.textures.exists(asset.id)) {
      const image = this.add.image(x, y, asset.id);
      image.setDisplaySize(...previewSize(asset.kind));
      this.previewImages.push(image);
      return;
    }
    const kind = asset.kind;
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
    const asset = this.assets[this.selectedIndex];
    this.drawSelectedPreview(asset);
    this.detailTitle.setText(`Selected ${this.selectedIndex + 1}: ${asset.title}`);
    this.detailBody.setText([
      asset.id,
      `${asset.kind} / ${asset.status}`,
      `Gate: ${asset.approvalGate}`,
      `Review: ${asset.reviewFocus}`,
    ]);
  }

  private drawSelectedPreview(asset: AssetManifestEntry): void {
    this.selectedGfx.clear();
    this.selectedGfx.fillStyle(colors.panelDeep, 1).fillRect(SELECTED_PREVIEW.x, SELECTED_PREVIEW.y, SELECTED_PREVIEW.w, SELECTED_PREVIEW.h);
    this.selectedGfx.lineStyle(1, colors.stoneLight, 1).strokeRect(SELECTED_PREVIEW.x, SELECTED_PREVIEW.y, SELECTED_PREVIEW.w, SELECTED_PREVIEW.h);
    if (!this.textures.exists(asset.id)) return;
    const size = selectedPreviewSize(asset.kind);
    this.selectedPreview = this.add.image(SELECTED_PREVIEW.x + SELECTED_PREVIEW.w / 2, SELECTED_PREVIEW.y + SELECTED_PREVIEW.h / 2, asset.id);
    this.selectedPreview.setDisplaySize(size[0], size[1]);
  }

  private publishDebug(): void {
    const asset = this.assets[this.selectedIndex];
    publishDevSceneDebug(this, 'visual-gallery', asset.id, {
      visualGallery: {
        assetCount: this.assets.length,
        selectedId: asset.id,
        selectedKind: asset.kind,
        selectedStatus: asset.status,
        selectedApprovalGate: asset.approvalGate,
        selectedReviewFocus: asset.reviewFocus,
        gameplayReadyAssetIds: this.assets.filter((entry) => entry.approvalGate === 'approved-for-gameplay').map((entry) => entry.id),
        stableIds: this.assets.map((entry) => entry.id),
      },
    });
  }
}

function previewSize(kind: AssetManifestEntry['kind']): [number, number] {
  if (kind === 'background') return [70, 40];
  if (kind === 'sprite') return [34, 46];
  if (kind === 'card-art') return [54, 40];
  return [46, 46];
}

function selectedPreviewSize(kind: AssetManifestEntry['kind']): [number, number] {
  if (kind === 'background') return [210, 58];
  if (kind === 'sprite') return [44, 58];
  if (kind === 'card-art') return [78, 58];
  return [58, 58];
}

function gateColor(gate: AssetManifestEntry['approvalGate']): string {
  if (gate === 'approved-for-gameplay') return text.gold;
  if (gate === 'blocked') return text.red;
  return text.cyan;
}

function compactGate(gate: AssetManifestEntry['approvalGate']): string {
  if (gate === 'approved-for-gameplay') return 'ready';
  if (gate === 'needs-review') return 'review';
  return 'blocked';
}

function compactAssetId(id: string): string {
  const visible = id.replace('.placeholder', '');
  return visible.length <= 25 ? visible : `${visible.slice(0, 22)}...`;
}
