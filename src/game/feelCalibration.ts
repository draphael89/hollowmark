export type DamageBandId = 'graze' | 'hit' | 'heavy' | 'brutal';

export type DamageBand = Readonly<{
  id: DamageBandId;
  min: number;
  max: number;
  hitStopMs: number;
  shakeMs: number;
  shakeIntensity: number;
  toneHz: number;
  toneMs: number;
  floatScale: 'normal' | 'large';
}>;

export const DAMAGE_BANDS: readonly DamageBand[] = [
  { id: 'graze', min: 1, max: 3, hitStopMs: 24, shakeMs: 70, shakeIntensity: 0.003, toneHz: 140, toneMs: 55, floatScale: 'normal' },
  { id: 'hit', min: 4, max: 7, hitStopMs: 42, shakeMs: 110, shakeIntensity: 0.005, toneHz: 120, toneMs: 80, floatScale: 'normal' },
  { id: 'heavy', min: 8, max: 13, hitStopMs: 64, shakeMs: 145, shakeIntensity: 0.007, toneHz: 96, toneMs: 105, floatScale: 'large' },
  { id: 'brutal', min: 14, max: Number.POSITIVE_INFINITY, hitStopMs: 86, shakeMs: 180, shakeIntensity: 0.01, toneHz: 72, toneMs: 130, floatScale: 'large' },
] as const;

export const BLOCKED_FEEL = {
  hitStopMs: 28,
  toneHz: 210,
  toneMs: 65,
} as const;

export const DEBT_FEEL = {
  hitStopMs: 36,
  shakeMs: 95,
  shakeIntensity: 0.004,
  toneHz: 180,
  toneMs: 110,
} as const;

export function damageBandFor(amount: number): DamageBand {
  const band = DAMAGE_BANDS.find((candidate) => amount >= candidate.min && amount <= candidate.max);
  if (!band) throw new Error(`Missing damage band for amount ${amount}`);
  return band;
}
