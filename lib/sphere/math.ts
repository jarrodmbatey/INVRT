// Small numeric helpers for the generation path.
//
// Determinism rule (§7): nothing here may use Math.random, and nothing on the
// generation path may use transcendental functions — sin/cos/pow are allowed to
// vary in the last bits between JS engines, which would break "same input →
// byte-identical output across sessions". Only +, -, *, /, comparisons and
// Math.round/floor/abs appear below.

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Map v from [inMin, inMax] onto [outMin, outMax], clamped.
 * The output range may be inverted (outMin > outMax) — that is how the
 * axis→structure table expresses "more of this axis means less of that param".
 */
export function remap(
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const span = inMax - inMin;
  const t = span === 0 ? 0 : clamp01((v - inMin) / span);
  return outMin + (outMax - outMin) * t;
}

/** Map an axis value (-1…1) onto 0…1. */
export function axisToUnit(v: number): number {
  return clamp01((v + 1) / 2);
}

/** Wrap a hue into [0, 360). */
export function wrapHue(h: number): number {
  const m = h % 360;
  return m < 0 ? m + 360 : m;
}

/** Wrap a hue offset into [-180, 180]. */
export function wrapHueOffset(h: number): number {
  const m = wrapHue(h);
  return m > 180 ? m - 360 : m;
}

/** Round to a fixed number of decimals. Keeps stored params stable and readable. */
export function round(v: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

/** Mean of a list; 0 for an empty list. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}
