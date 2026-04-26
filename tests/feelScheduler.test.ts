import { describe, expect, it } from 'vitest';
import { damageBandFor } from '../src/game/feelCalibration';
import { calibratedDamageBandIds, getInitialFeelSettings, planFeelCues } from '../src/fx/feelScheduler';

describe('feel scheduler', () => {
  it('calibrates damage into authored bands', () => {
    expect(damageBandFor(1).id).toBe('graze');
    expect(damageBandFor(4).id).toBe('hit');
    expect(damageBandFor(8).id).toBe('heavy');
    expect(damageBandFor(24).id).toBe('brutal');
    expect(calibratedDamageBandIds()).toEqual(['graze', 'hit', 'heavy', 'brutal']);
  });

  it('plans damage as hit-stop, shake, float text, and tone', () => {
    const cues = planFeelCues({
      type: 'DAMAGE_DEALT',
      source: { kind: 'hero', id: 'liese' },
      target: { kind: 'enemy', id: 'root-wolf' },
      amount: 12,
      blocked: 0,
      lethal: false,
      tags: ['physical'],
    });

    expect(cues.map((cue) => cue.type)).toEqual(['hit-stop', 'shake', 'float-text', 'tone']);
    expect(cues).toContainEqual({ type: 'float-text', target: 'enemy', text: '-12', tone: 'damage', scale: 'large', priority: 1 });
  });

  it('keeps blocked damage legible without pretending HP was lost', () => {
    const cues = planFeelCues({
      type: 'DAMAGE_DEALT',
      source: { kind: 'enemy', id: 'root-wolf' },
      target: { kind: 'hero', id: 'liese' },
      amount: 0,
      blocked: 6,
      lethal: false,
      tags: ['physical'],
    });

    expect(cues.map((cue) => cue.type)).toEqual(['hit-stop', 'float-text', 'tone']);
    expect(cues).toContainEqual({ type: 'float-text', target: 'liese', text: 'blocked', tone: 'blocked', scale: 'normal', priority: 1 });
  });

  it('keeps debt distinct from safe damage', () => {
    const cues = planFeelCues({ type: 'DEBT_GAINED', heroId: 'mia', amount: 4, total: 4, source: { kind: 'hero', id: 'mia' } });

    expect(cues).toContainEqual({ type: 'float-text', target: 'debt', text: '+debt', tone: 'debt', scale: 'normal', priority: 1 });
  });

  it('honors reduced motion without dropping meaning', () => {
    const cues = planFeelCues(
      {
        type: 'DAMAGE_DEALT',
        source: { kind: 'hero', id: 'liese' },
        target: { kind: 'enemy', id: 'root-wolf' },
        amount: 6,
        blocked: 0,
        lethal: false,
        tags: ['physical'],
      },
      { reducedMotion: true, frameBudget: 'normal' },
    );

    expect(cues.some((cue) => cue.type === 'shake')).toBe(false);
    expect(cues.map((cue) => cue.type)).toEqual(['hit-stop', 'float-text', 'tone']);
  });

  it('reads the initial reduced-motion preference at the boundary', () => {
    const settings = getInitialFeelSettings({
      matchMedia: (query: string) => {
        expect(query).toBe('(prefers-reduced-motion: reduce)');
        return { matches: true };
      },
    });

    expect(settings).toEqual({ reducedMotion: true, frameBudget: 'normal' });
  });

  it('drops low-priority cues under constrained frame budget', () => {
    const cues = planFeelCues(
      { type: 'FACING_CHANGED', from: 'north', to: 'east' },
      { reducedMotion: false, frameBudget: 'constrained' },
    );

    expect(cues).toEqual([]);
  });
});
