import { describe, expect, it } from 'vitest';
import { runAllScenarios, runScenario, scenarioCatalog } from '../src/systems/scenarios';

describe('golden combat scenarios', () => {
  it('catalogs the pre-broadening design lab scenarios', () => {
    expect(scenarioCatalog().map((scenario) => scenario.id)).toEqual([
      's0-one-hallway-fight',
      'energy-starved-hand',
      'held-card-payoff',
      'corruption-bargain',
      'bad-draw-recovery',
      'intent-preview',
      'm1-ward-save',
      'm1-poison-lethal',
      'm1-bleed-payoff',
      'm1-bad-shuffle-recovery',
    ]);
  });

  it('runs every scenario deterministically through pure systems', () => {
    for (const scenario of scenarioCatalog()) {
      const first = runScenario(scenario.id);
      const second = runScenario(scenario.id);

      expect(first.commands.length).toBeGreaterThan(0);
      expect(first.events.length).toBeGreaterThan(0);
      expect(first.metrics.commands).toBe(first.commands.length);
      expect(first.verdict.gates.length).toBeGreaterThan(0);
      expect(first).toEqual(second);
    }
  });

  it('keeps scenario combat card instances in exactly one zone', () => {
    for (const scenario of scenarioCatalog()) {
      const report = runScenario(scenario.id);
      const combat = report.state.combat;
      if (!combat) continue;

      const zoneCards = [
        ...combat.hand,
        ...combat.drawPile,
        ...combat.discardPile,
        ...(combat.held ? [combat.held] : []),
      ];

      expect(new Set(zoneCards).size, scenario.id).toBe(zoneCards.length);
      expect(new Set(zoneCards), scenario.id).toEqual(new Set(Object.keys(combat.cards)));
    }
  });

  it('measures the S0 victory path as a short debt win', () => {
    const report = runScenario('s0-one-hallway-fight');

    expect(report.state.mode).toBe('victory');
    expect(report.metrics.outcome).toBe('victory');
    expect(report.metrics.cardsHeld).toBe(1);
    expect(report.metrics.cardsPlayed).toBe(3);
    expect(report.metrics.energySpent).toBe(3);
    expect(report.metrics.debtGained).toBe(4);
    expect(report.metrics.damageTaken).toBe(0);
    expect(report.metrics.cardsPlayedByHero).toEqual({
      liese: 1,
      eris: 0,
      mia: 1,
      robin: 1,
    });
  });

  it('surfaces energy starvation and wasted energy separately', () => {
    const report = runScenario('energy-starved-hand');

    expect(report.state.mode).toBe('combat');
    expect(report.events).toContainEqual(expect.objectContaining({
      type: 'CARD_REJECTED',
      reason: 'not-enough-energy',
    }));
    expect(report.metrics.energySpent).toBe(3);
    expect(report.metrics.energyWasted).toBe(0);
    expect(report.metrics.damageTaken).toBe(0);
  });

  it('tracks held-card payoff across an enemy turn', () => {
    const report = runScenario('held-card-payoff');

    expect(report.metrics.cardsHeld).toBe(1);
    expect(report.metrics.turns).toBe(1);
    expect(report.metrics.damageTaken).toBe(6);
    expect(report.metrics.debtGained).toBe(4);
    expect(report.state.combat?.enemy.hp).toBe(6);
  });

  it('makes the corruption bargain explicit in metrics', () => {
    const report = runScenario('corruption-bargain');

    expect(report.metrics.debtGained).toBe(4);
    expect(report.metrics.energySpent).toBe(2);
    expect(report.state.combat?.heroes.find((hero) => hero.id === 'mia')?.debt).toBe(4);
    expect(report.state.combat?.enemy.hp).toBe(6);
    expect(report.verdict.gates).toContainEqual({ label: 'debt is taken willingly', passed: true });
  });

  it('records enemy intent exposure for preview scenarios', () => {
    const reports = runAllScenarios();
    const intent = reports.find((report) => report.id === 'intent-preview');

    expect(intent?.metrics.enemyIntents).toEqual([
      'Bite Liese for 6',
      'Bite Liese for 6',
    ]);
    expect(intent?.metrics.damageTaken).toBe(6);
  });

  it('measures M1 Ward as prevention without debt', () => {
    const report = runScenario('m1-ward-save');

    expect(report.metrics.turns).toBe(1);
    expect(report.metrics.damageTaken).toBe(0);
    expect(report.metrics.debtGained).toBe(0);
    expect(report.events).toContainEqual(expect.objectContaining({ type: 'STATUS_CONSUMED', status: 'ward' }));
    expect(report.verdict.gates).toEqual(expect.arrayContaining([
      { label: 'ward prevents damage', passed: true },
      { label: 'ward is consumed', passed: true },
    ]));
  });

  it('measures M1 poison as a lethal pre-intent clock', () => {
    const report = runScenario('m1-poison-lethal');

    expect(report.state.mode).toBe('victory');
    expect(report.metrics.debtGained).toBe(1);
    expect(report.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      source: { kind: 'system' },
      target: { kind: 'enemy', id: 'root-wolf' },
      tags: ['poison'],
      lethal: true,
    }));
    expect(report.verdict.gates).toEqual(expect.arrayContaining([
      { label: 'poison wins before intent', passed: true },
      { label: 'poison is lethal', passed: true },
    ]));
  });

  it('measures M1 bleed payoff as extra physical damage', () => {
    const report = runScenario('m1-bleed-payoff');

    expect(report.metrics.cardsPlayed).toBe(2);
    expect(report.state.combat?.enemy.hp).toBeLessThan(22 - 3 - 6);
    expect(report.events).toContainEqual(expect.objectContaining({
      type: 'DAMAGE_DEALT',
      tags: ['physical', 'bleed'],
    }));
    expect(report.verdict.gates).toContainEqual({ label: 'bleed adds payoff damage', passed: true });
  });

  it('measures M1 bad shuffle recovery as a debt comeback line', () => {
    const report = runScenario('m1-bad-shuffle-recovery');

    expect(report.verdict).toEqual(expect.objectContaining({
      status: 'pass',
      kind: 'replay',
    }));
    expect(report.commands).toEqual([
      'play-card:shadow-mark',
      'play-card:blood-edge',
      'play-card:iron-cut',
    ]);
    expect(report.state.mode).toBe('victory');
    expect(report.metrics.debtGained).toBeGreaterThan(0);
    expect(report.metrics.cardsPlayedByHero.robin).toBe(1);
    expect(report.metrics.cardsPlayedByHero.liese).toBe(1);
    expect(report.metrics.cardsPlayedByHero.mia).toBe(1);
  });

  it('labels staged M1 mechanic probes as fixtures rather than shuffle proofs', () => {
    const report = runScenario('m1-ward-save');

    expect(report.verdict.kind).toBe('fixture');
    expect(report.verdict.gates).toContainEqual({ label: 'fixture, not shuffle proof', passed: true });
  });
});
