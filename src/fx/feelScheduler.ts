import { BLOCKED_FEEL, DAMAGE_BANDS, damageBandFor, DEBT_FEEL } from '../game/feelCalibration';
import { MOTION } from '../game/motion';
import type { GameEvent, HeroId } from '../game/types';
import { statusName } from '../systems/status';

export type FeelSettings = Readonly<{
  reducedMotion: boolean;
  frameBudget: 'normal' | 'constrained';
}>;

export const DEFAULT_FEEL_SETTINGS: FeelSettings = {
  reducedMotion: false,
  frameBudget: 'normal',
};

type FeelPreferenceSource = Readonly<{
  matchMedia: (query: string) => Pick<MediaQueryList, 'matches'>;
}>;

export function getInitialFeelSettings(source: FeelPreferenceSource | undefined = browserPreferenceSource()): FeelSettings {
  return {
    ...DEFAULT_FEEL_SETTINGS,
    reducedMotion: source?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false,
  };
}

export type FeelTarget = 'enemy' | HeroId | 'debt';
export type FeelTone = Readonly<{ frequencyHz: number; durationMs: number }>;

export type FeelCue =
  | Readonly<{ type: 'hit-stop'; durationMs: number; priority: 1 | 2 | 3 }>
  | Readonly<{ type: 'shake'; durationMs: number; intensity: number; priority: 1 | 2 | 3 }>
  | Readonly<{ type: 'float-text'; target: FeelTarget; text: string; tone: 'damage' | 'blocked' | 'debt'; scale: 'normal' | 'large'; priority: 1 | 2 | 3 }>
  | Readonly<{ type: 'tone'; tone: FeelTone; priority: 1 | 2 | 3 }>
  | Readonly<{ type: 'step-bob'; priority: 1 | 2 | 3 }>;

export function planFeelCues(event: GameEvent, settings: FeelSettings = DEFAULT_FEEL_SETTINGS): readonly FeelCue[] {
  const cues = cuesForEvent(event);
  return cues.filter((cue) => keepCue(cue, settings));
}

function cuesForEvent(event: GameEvent): readonly FeelCue[] {
  if (event.type === 'STEP_MOVED') {
    return [
      { type: 'step-bob', priority: 2 },
      { type: 'tone', tone: { frequencyHz: MOTION.audio.movedToneHz, durationMs: MOTION.fx.stepToneMs }, priority: 2 },
    ];
  }

  if (event.type === 'STEP_BUMPED') {
    return [
      { type: 'shake', durationMs: MOTION.fx.bumpMs, intensity: MOTION.camera.bumpShakeIntensity, priority: 2 },
      { type: 'tone', tone: { frequencyHz: MOTION.audio.bumpedToneHz, durationMs: MOTION.audio.bumpedToneMs }, priority: 2 },
    ];
  }

  if (event.type === 'FACING_CHANGED') {
    return [{ type: 'tone', tone: { frequencyHz: MOTION.audio.facingToneHz, durationMs: MOTION.fx.turnToneMs }, priority: 3 }];
  }

  if (event.type === 'DAMAGE_DEALT') return damageCues(event);
  if (event.type === 'STATUS_APPLIED') {
    return [
      { type: 'float-text', target: feelTargetFor(event.target), text: `+${statusName(event.status)}`, tone: event.status === 'ward' ? 'blocked' : 'damage', scale: 'normal', priority: 1 },
      { type: 'tone', tone: { frequencyHz: event.status === 'ward' ? BLOCKED_FEEL.toneHz : MOTION.audio.facingToneHz, durationMs: MOTION.fx.turnToneMs }, priority: 2 },
    ];
  }
  if (event.type === 'STATUS_CONSUMED' && event.status === 'ward') {
    return [
      { type: 'hit-stop', durationMs: BLOCKED_FEEL.hitStopMs, priority: 1 },
      { type: 'float-text', target: feelTargetFor(event.target), text: 'warded', tone: 'blocked', scale: 'normal', priority: 1 },
      { type: 'tone', tone: { frequencyHz: BLOCKED_FEEL.toneHz, durationMs: BLOCKED_FEEL.toneMs }, priority: 1 },
    ];
  }
  if (event.type === 'DEBT_GAINED') {
    return [
      { type: 'hit-stop', durationMs: DEBT_FEEL.hitStopMs, priority: 1 },
      { type: 'shake', durationMs: DEBT_FEEL.shakeMs, intensity: DEBT_FEEL.shakeIntensity, priority: 2 },
      { type: 'float-text', target: 'debt', text: '+debt', tone: 'debt', scale: 'normal', priority: 1 },
      { type: 'tone', tone: { frequencyHz: DEBT_FEEL.toneHz, durationMs: DEBT_FEEL.toneMs }, priority: 1 },
    ];
  }

  return [];
}

function damageCues(event: Extract<GameEvent, { type: 'DAMAGE_DEALT' }>): readonly FeelCue[] {
  const target = feelTargetFor(event.target);
  if (event.amount <= 0 && event.blocked > 0) {
    return [
      { type: 'hit-stop', durationMs: BLOCKED_FEEL.hitStopMs, priority: 1 },
      { type: 'float-text', target, text: 'blocked', tone: 'blocked', scale: 'normal', priority: 1 },
      { type: 'tone', tone: { frequencyHz: BLOCKED_FEEL.toneHz, durationMs: BLOCKED_FEEL.toneMs }, priority: 1 },
    ];
  }
  if (event.amount <= 0) return [];

  const band = damageBandFor(event.amount);
  return [
    { type: 'hit-stop', durationMs: band.hitStopMs, priority: 1 },
    { type: 'shake', durationMs: band.shakeMs, intensity: band.shakeIntensity, priority: 2 },
    { type: 'float-text', target, text: `-${event.amount}`, tone: 'damage', scale: band.floatScale, priority: 1 },
    { type: 'tone', tone: { frequencyHz: band.toneHz, durationMs: band.toneMs }, priority: 1 },
  ];
}

function feelTargetFor(target: Extract<GameEvent, { type: 'DAMAGE_DEALT' | 'STATUS_CONSUMED' | 'STATUS_APPLIED' }>['target']): FeelTarget {
  if (target.kind === 'enemy') return 'enemy';
  if (target.kind === 'hero') return target.id;
  throw new Error('Feel target must be a hero or enemy');
}

function keepCue(cue: FeelCue, settings: FeelSettings): boolean {
  if (settings.reducedMotion && cue.type === 'shake') return false;
  if (settings.frameBudget === 'constrained' && cue.priority === 3) return false;
  return true;
}

export function calibratedDamageBandIds(): readonly string[] {
  return DAMAGE_BANDS.map((band) => band.id);
}

function browserPreferenceSource(): FeelPreferenceSource | undefined {
  if (typeof window === 'undefined') return undefined;
  return window;
}
