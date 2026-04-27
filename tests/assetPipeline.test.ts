import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { galleryAssetsFromManifest } from '../src/assets/manifest';

type AssetPassport = {
  id: string;
  kind: string;
  title: string;
  promptPath: string;
  reviewFocus: string;
  rawSource: string | null;
  processedPath: string | null;
  finalSize: { w: number; h: number };
  matteOrMaskNotes: string;
  humanEditNotes: string;
  inGamePreview: string;
  approvalState: string;
  rejectionNotes: string | null;
};

describe('asset production foundation', () => {
  it('keeps public asset passports aligned with the visual gallery contracts', () => {
    const manifest = readAssetManifest();
    const publicIds = manifest.assets.map((asset) => asset.id);
    const galleryAssets = galleryAssetsFromManifest(manifest);
    const galleryIds = galleryAssets.map((asset) => asset.id);

    expect(publicIds).toEqual(galleryIds);
    expect(new Set(publicIds).size).toBe(publicIds.length);
    expect(manifest.assets.map((asset) => asset.title)).toEqual(galleryAssets.map((asset) => asset.title));
    expect(manifest.assets.map((asset) => asset.reviewFocus)).toEqual(galleryAssets.map((asset) => asset.reviewFocus));
  });

  it('tracks first-batch source candidates without gameplay wiring', () => {
    const manifest = readAssetManifest();

    for (const asset of manifest.assets) {
      expect(['in_game_previewed', 'approved', 'rejected']).toContain(asset.approvalState);
      expect(asset.title.length).toBeGreaterThan(0);
      expect(asset.reviewFocus.length).toBeGreaterThan(0);
      expect(asset.rawSource).toMatch(new RegExp('^\\.curation/raw/underroot/batch-01/.+\\.png$'));
      expect(asset.processedPath).toMatch(new RegExp('^public/assets/drafts/underroot/batch-01/.+\\.png$'));
      expect(existsSync(asset.rawSource!)).toBe(true);
      expect(existsSync(asset.processedPath!)).toBe(true);
      expect(asset.finalSize.w).toBeGreaterThan(0);
      expect(asset.finalSize.h).toBeGreaterThan(0);
      const prompt = readFileSync(asset.promptPath, 'utf8');
      expect(prompt).toMatch(/no text|no words|readable text/);
    }
  });

  it('records rejection notes for assets that should not advance', () => {
    const manifest = readAssetManifest();
    const rejected = manifest.assets.filter((asset) => asset.approvalState === 'rejected');

    expect(rejected.map((asset) => asset.id)).toEqual(['ui.ornaments.placeholder']);
    expect(rejected[0]?.rejectionNotes).toContain('Rejected for approval');
  });

  it('approves the reviewed first-batch assets without advancing review candidates', () => {
    const manifest = readAssetManifest();
    const approved = manifest.assets.filter((asset) => asset.approvalState === 'approved');

    expect(approved.map((asset) => asset.id)).toEqual([
      'underroot.corridor.placeholder',
      'underroot.combat.placeholder',
      'card.blood-edge.placeholder',
    ]);
    expect(approved.find((asset) => asset.id === 'underroot.corridor.placeholder')?.humanEditNotes).toContain('no generated text');
    expect(approved.find((asset) => asset.id === 'underroot.combat.placeholder')?.humanEditNotes).toContain('Combat Sandbox composition review');
    expect(approved.find((asset) => asset.id === 'underroot.combat.placeholder')?.inGamePreview).toBe('?scene=combat-sandbox');
    expect(approved.find((asset) => asset.id === 'card.blood-edge.placeholder')?.humanEditNotes).toContain('tiny-crop review');
  });

  it('tracks the wolf matte preview separately from the raw draft', () => {
    const manifest = readAssetManifest();
    const wolf = manifest.assets.find((asset) => asset.id === 'enemy.root-wolf.placeholder');

    expect(wolf?.approvalState).toBe('in_game_previewed');
    expect(wolf?.processedPath).toBe('public/assets/drafts/underroot/batch-01/rootbitten-wolf-clean-preview-01.png');
    expect(wolf?.matteOrMaskNotes).toContain('threshold 24');
    expect(wolf?.matteOrMaskNotes).toContain('enclosed transparent holes are restored');
    expect(wolf?.humanEditNotes).toContain('still not approved');
  });
});

function readAssetManifest(): { assets: AssetPassport[] } {
  return JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as { assets: AssetPassport[] };
}
