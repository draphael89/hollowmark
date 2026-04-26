import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_ASSETS } from '../src/assets/manifest';

describe('placeholder asset manifest', () => {
  it('keeps asset ids stable and unique for gallery review', () => {
    const ids = PLACEHOLDER_ASSETS.map((asset) => asset.id);

    expect(ids).toEqual([
      'underroot.corridor.placeholder',
      'underroot.combat.placeholder',
      'enemy.root-wolf.placeholder',
      'card.blood-edge.placeholder',
      'ui.ornaments.placeholder',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps draft entries as review contracts, not gameplay asset paths', () => {
    for (const asset of PLACEHOLDER_ASSETS) {
      expect(asset.status).toBe('processed');
      expect(asset.id).toMatch(/^[a-z0-9.-]+\.placeholder$/);
      expect(asset.title.length).toBeGreaterThan(0);
      expect(asset.reviewFocus.length).toBeGreaterThan(0);
      expect(asset.previewPath).toMatch(/^\/assets\/drafts\/underroot\/batch-01\/.+\.png$/);
      expect(Object.keys(asset).sort()).toEqual(['id', 'kind', 'previewPath', 'reviewFocus', 'status', 'title']);
    }
  });
});
