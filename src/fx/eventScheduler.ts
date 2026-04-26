import type Phaser from 'phaser';
import type { GameEvent } from '../game/types';

export const FX_TIMING = {
  bumpMs: 100,
  cardPlayMs: 80,
  damageDelayMs: 60,
  damageFloatMs: 420,
  debtDelayMs: 120,
  stepToneMs: 65,
  turnToneMs: 45,
} as const;

export type EventHandler = (event: GameEvent) => void;

export class EventScheduler {
  private readonly scene: Phaser.Scene;
  private pending = 0;
  private cursorMs = 0;

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
      this.scene.time.delayedCall(delay, () => {
        this.pending -= 1;
        handle(event);
      });
      this.cursorMs = delay + spacingAfter(event);
    }

    if (this.cursorMs > 0) {
      this.scene.time.delayedCall(this.cursorMs, () => {
        if (this.pending === 0) this.cursorMs = 0;
      });
    }
  }
}

function delayFor(event: GameEvent): number {
  if (event.type === 'DAMAGE') return FX_TIMING.damageDelayMs;
  if (event.type === 'DEBT') return FX_TIMING.debtDelayMs;
  return 0;
}

function spacingAfter(event: GameEvent): number {
  if (event.type === 'DAMAGE') return 80;
  if (event.type === 'DEBT') return 60;
  if (event.type === 'VICTORY') return 120;
  return 0;
}
