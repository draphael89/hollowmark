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
  approvalState: string;
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
      expect(asset.approvalState).toBe('processed');
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
});

function readAssetManifest(): { assets: AssetPassport[] } {
  return JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as { assets: AssetPassport[] };
}
