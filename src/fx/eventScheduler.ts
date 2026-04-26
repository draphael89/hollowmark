import type Phaser from 'phaser';
import { MOTION } from '../game/motion';
import type { GameEvent } from '../game/types';

export const FX_TIMING = MOTION.fx;

export type EventHandler = (event: GameEvent) => void;

export class EventScheduler {
  private readonly scene: Phaser.Scene;
  private pending = 0;
  private cursorMs = 0;
  private readonly timers: Phaser.Time.TimerEvent[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  getPendingCount(): number {
    return this.pending;
  }

  enqueue(events: readonly GameEvent[], handle: EventHandler): void {
    for (const event of events) {
      const delay = this.cursorMs + delayFor(event);
      this.pending += 1;
      const timer = this.scene.time.delayedCall(delay, () => {
        this.pending -= 1;
        handle(event);
      });
      this.timers.push(timer);
      this.cursorMs = delay + spacingAfter(event);
    }

    if (this.cursorMs > 0) {
      const timer = this.scene.time.delayedCall(this.cursorMs, () => {
        if (this.pending === 0) this.cursorMs = 0;
      });
      this.timers.push(timer);
    }
  }

  reset(): void {
    for (const timer of this.timers) timer.remove(false);
    this.timers.length = 0;
    this.pending = 0;
    this.cursorMs = 0;
  }
}

function delayFor(event: GameEvent): number {
  if (event.type === 'DAMAGE_DEALT') return FX_TIMING.damageDelayMs;
  if (event.type === 'DEBT_GAINED') return FX_TIMING.debtDelayMs;
  return 0;
}

function spacingAfter(event: GameEvent): number {
  if (event.type === 'DAMAGE_DEALT') return MOTION.eventSpacing.damageMs;
  if (event.type === 'DEBT_GAINED') return MOTION.eventSpacing.debtMs;
  if (event.type === 'VICTORY') return MOTION.eventSpacing.victoryMs;
  return 0;
}
