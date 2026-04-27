import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { galleryAssetsFromManifest } from '../src/assets/manifest';

describe('asset manifest', () => {
  it('keeps asset ids stable and unique for gallery review', () => {
    const assets = readGalleryAssets();
    const ids = assets.map((asset) => asset.id);

    expect(ids).toEqual([
      'underroot.corridor.placeholder',
      'underroot.combat.placeholder',
      'enemy.root-wolf.placeholder',
      'card.blood-edge.placeholder',
      'ui.ornaments.placeholder',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('derives gallery entries from public passports', () => {
    const expectedStates = new Map([
      ['underroot.corridor.placeholder', 'in_game_previewed'],
      ['underroot.combat.placeholder', 'in_game_previewed'],
      ['enemy.root-wolf.placeholder', 'in_game_previewed'],
      ['card.blood-edge.placeholder', 'in_game_previewed'],
      ['ui.ornaments.placeholder', 'rejected'],
    ]);

    for (const asset of readGalleryAssets()) {
      expect(asset.status).toBe(expectedStates.get(asset.id));
      expect(asset.id).toMatch(/^[a-z0-9.-]+\.placeholder$/);
      expect(asset.title.length).toBeGreaterThan(0);
      expect(asset.reviewFocus.length).toBeGreaterThan(0);
      expect(asset.previewPath).toMatch(/^\/assets\/drafts\/underroot\/batch-01\/.+\.png$/);
      expect(Object.keys(asset).sort()).toEqual(['id', 'kind', 'previewPath', 'reviewFocus', 'status', 'title']);
    }
  });
});

function readGalleryAssets() {
  return galleryAssetsFromManifest(JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')));
}
