import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const initialCardArtPrompts = [
  {
    card: 'Blood Edge',
    path: '.prompts/underroot/blood-edge-card.txt',
  },
  {
    card: 'Oath Ward',
    path: '.prompts/underroot/oath-ward-card.txt',
  },
  {
    card: 'Rootfire',
    path: '.prompts/underroot/rootfire-card.txt',
  },
  {
    card: 'Shadow Mark',
    path: '.prompts/underroot/shadow-mark-card.txt',
  },
  {
    card: 'Tripwire',
    path: '.prompts/underroot/tripwire-card.txt',
  },
] as const;

describe('card art prompt kit', () => {
  it('covers the initial five-card visual production target', () => {
    expect(initialCardArtPrompts.map((prompt) => prompt.card)).toEqual([
      'Blood Edge',
      'Oath Ward',
      'Rootfire',
      'Shadow Mark',
      'Tripwire',
    ]);
  });

  it('keeps card prompts textless and tiny-crop oriented', () => {
    for (const prompt of initialCardArtPrompts) {
      const text = readFileSync(prompt.path, 'utf8');

      expect(text).toContain(prompt.card);
      expect(text).toMatch(/no text|no words/);
      expect(text).toContain('cropped to 64x48');
      expect(text).toContain('readable at tiny size');
      expect(text).toContain('no UI frame');
      expect(text).toContain('no numbers');
    }
  });
});
