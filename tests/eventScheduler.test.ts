import { describe, expect, it } from 'vitest';
import { EventScheduler, FX_TIMING } from '../src/fx/eventScheduler';
import type { GameEvent } from '../src/game/types';

describe('EventScheduler', () => {
  it('serializes delayed combat events and drains pending count', () => {
    const clock = new FakeClock();
    const scheduler = new EventScheduler({ time: clock } as never);
    const seen: GameEvent['type'][] = [];

    scheduler.enqueue(
      [
        { type: 'DAMAGE', amount: 6, blocked: 0, target: 'enemy' },
        { type: 'DEBT', heroId: 'mia', amount: 4 },
      ],
      (event) => seen.push(event.type),
    );

    expect(scheduler.getPendingCount()).toBe(2);
    clock.runUntil(FX_TIMING.damageDelayMs);
    expect(seen).toEqual(['DAMAGE']);
    expect(scheduler.getPendingCount()).toBe(1);

    clock.runUntil(FX_TIMING.damageDelayMs + 80 + FX_TIMING.debtDelayMs);
    expect(seen).toEqual(['DAMAGE', 'DEBT']);
    expect(scheduler.getPendingCount()).toBe(0);
  });
});

class FakeClock {
  private now = 0;
  private readonly calls: Array<{ at: number; callback: () => void }> = [];

  delayedCall(delayMs: number, callback: () => void) {
    this.calls.push({ at: this.now + delayMs, callback });
  }

  runUntil(ms: number) {
    this.now = ms;
    for (;;) {
      const index = this.calls.findIndex((call) => call.at <= this.now);
      if (index < 0) return;
      const [call] = this.calls.splice(index, 1);
      call!.callback();
    }
  }
}
