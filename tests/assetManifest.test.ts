import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_ASSETS } from '../src/assets/manifest';

describe('placeholder asset manifest', () => {
  it('keeps asset ids stable and unique for gallery review', () => {
    const ids = PLACEHOLDER_ASSETS.map((asset) => asset.id);

    expect(ids).toEqual([
      'underroot.corridor.placeholder',
      'enemy.root-wolf.placeholder',
      'card.blood-edge.placeholder',
      'ui.debt-mark.placeholder',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps placeholder entries as review contracts, not raw asset paths', () => {
    for (const asset of PLACEHOLDER_ASSETS) {
      expect(asset.status).toBe('placeholder');
      expect(asset.id).toMatch(/^[a-z0-9.-]+\.placeholder$/);
      expect(asset.title.length).toBeGreaterThan(0);
      expect(asset.reviewFocus.length).toBeGreaterThan(0);
      expect(Object.keys(asset).sort()).toEqual(['id', 'kind', 'reviewFocus', 'status', 'title']);
    }
  });
});
