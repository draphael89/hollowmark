import { describe, expect, it } from 'vitest';
import { addStatus, consumeStatus, emptyStatusStacks, hasStatus, spendStatus, STATUS_IDS, statusAmount, statusLegend, statusName, statusRule, statusSummary } from '../src/systems/status';

describe('status primitives', () => {
  it('keeps the M1 status ceiling explicit', () => {
    expect(STATUS_IDS).toEqual(['poison', 'bleed', 'weak', 'vulnerable', 'mark', 'ward']);
  });

  it('creates zeroed stacks for every non-block status', () => {
    expect(emptyStatusStacks()).toEqual({
      poison: 0,
      bleed: 0,
      weak: 0,
      vulnerable: 0,
      mark: 0,
      ward: 0,
    });
  });

  it('adds, reads, and consumes statuses directly', () => {
    const marked = addStatus(emptyStatusStacks(), 'mark');
    const stacked = addStatus(marked, 'mark', 2);
    const consumed = consumeStatus(stacked, 'mark');

    expect(hasStatus(marked, 'mark')).toBe(true);
    expect(statusAmount(stacked, 'mark')).toBe(3);
    expect(hasStatus(consumed, 'mark')).toBe(false);
    expect(statusAmount(consumed, 'ward')).toBe(0);
  });

  it('spends status stacks without going below zero', () => {
    const warded = addStatus(emptyStatusStacks(), 'ward', 2);

    expect(spendStatus(warded, 'ward').ward).toBe(1);
    expect(spendStatus(warded, 'ward', 3).ward).toBe(0);
    expect(spendStatus(emptyStatusStacks(), 'ward').ward).toBe(0);
  });

  it('rejects non-positive and fractional stack mutations', () => {
    expect(() => addStatus(emptyStatusStacks(), 'poison', 0)).toThrow('Status amount must be a positive integer');
    expect(() => addStatus(emptyStatusStacks(), 'poison', 0.5)).toThrow('Status amount must be a positive integer');
    expect(() => spendStatus(emptyStatusStacks(), 'ward', 0)).toThrow('Status spend must be a positive integer');
  });

  it('summarizes active statuses as compact UI codes', () => {
    const statuses = {
      ...emptyStatusStacks(),
      mark: 1,
      ward: 2,
      poison: 3,
    };

    expect(statusSummary(emptyStatusStacks())).toBe('');
    expect(statusSummary(statuses)).toBe('Po3 Mk1 Wd2');
  });

  it('provides readable status names and rules for UI hints', () => {
    expect(statusName('vulnerable')).toBe('Vulnerable');
    expect(statusRule('ward')).toBe('Ward prevents one hit');
    expect(statusRule('bleed')).toBe('Bleed opens on HP hits');
    expect(statusLegend()).toEqual([
      'Poison: Poison ticks before action',
      'Bleed: Bleed opens on HP hits',
      'Weak: Weak softens next hit',
      'Vulnerable: Vulnerable amplifies next hit',
      'Mark: Mark adds burst damage',
      'Ward: Ward prevents one hit',
    ]);
  });
});
