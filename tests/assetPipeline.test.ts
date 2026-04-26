import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLACEHOLDER_ASSETS } from '../src/assets/manifest';

type AssetPassport = {
  id: string;
  kind: string;
  promptPath: string;
  rawSource: string | null;
  processedPath: string | null;
  finalSize: { w: number; h: number };
  approvalState: string;
};

describe('asset production foundation', () => {
  it('keeps public asset passports aligned with the visual gallery contracts', () => {
    const manifest = readAssetManifest();
    const publicIds = manifest.assets.map((asset) => asset.id);
    const galleryIds = PLACEHOLDER_ASSETS.map((asset) => asset.id);

    expect(publicIds).toEqual(galleryIds);
    expect(new Set(publicIds).size).toBe(publicIds.length);
  });

  it('keeps first-batch prompt files ready without raw generated assets', () => {
    const manifest = readAssetManifest();

    for (const asset of manifest.assets) {
      expect(asset.approvalState).toBe('placeholder');
      expect(asset.rawSource).toBeNull();
      expect(asset.processedPath).toBeNull();
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
