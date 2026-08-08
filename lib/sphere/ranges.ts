// Declared range for every nudgeable parameter.
//
// paramNudges arrive from the question tables as -1…1 values against a param
// name. This registry is what turns those abstract nudges into concrete,
// clamped offsets — and it is the single place a param's legal range lives, so
// the scorer, the constraint solver and the tests cannot disagree about it.

export interface ParamRange {
  min: number;
  max: number;
  /** Round to an integer after scoring (bandCount). */
  integer?: boolean;
  /**
   * Enumerated params are scored as a scalar in [-1, 1] and thresholded into
   * their variant by the layer that owns them. They are not written directly.
   */
  enumerated?: boolean;
  /**
   * Offset params carry a signed delta rather than an absolute value, so a
   * full-strength nudge moves by `max` degrees/units instead of by a fraction
   * of the span. Only baseHue works this way.
   */
  offset?: boolean;
}

/**
 * Layer-1 params. Axis defaults (§4.1) come first; nudges are offsets on top.
 * Nudge gain is a fraction of the range so a single question can colour a
 * param without overwhelming the axis that defines it.
 */
export const STRUCTURE_RANGES: Record<string, ParamRange> = {
  colorSeparation: { min: 0, max: 1 },
  bandCount: { min: 3, max: 12, integer: true },
  bandSizeVariance: { min: 0, max: 1 },
  bandEdgeSharpness: { min: 0, max: 1 },
  axialTilt: { min: 0, max: 45 },
  asymmetry: { min: 0, max: 1 },
  lightSource: { min: 0, max: 1 },
  depth: { min: 0, max: 1 },
  viscosity: { min: 0, max: 1 },
  halo: { min: 0, max: 1 },
  baseHue: { min: -60, max: 60, offset: true }, // warm ↔ cool push on the axis hue
  baseSaturation: { min: 0.1, max: 0.95 },
  baseLightness: { min: 0.14, max: 0.64 },
  activityCenter: { min: -1, max: 1, enumerated: true },
};

/**
 * Layer-2 params. These have no axis defaults — their questions are the whole
 * signal, so a mean nudge of -1…1 maps across the full range (§4 step 4).
 */
export const MOTION_RANGES: Record<string, ParamRange> = {
  globalSpeed: { min: 0, max: 1 },
  speedVariance: { min: 0, max: 1 },
  shearIndex: { min: 0, max: 1 },
  turbulenceScale: { min: 0, max: 1 },
  turbulenceAmplitude: { min: 0, max: 1 },
  coherence: { min: 0, max: 1 },
  protrusionAmplitude: { min: 0, max: 1 },
  protrusionLength: { min: 0, max: 1 },
  protrusionFrequency: { min: 0, max: 1 },
  accentIntensity: { min: 0, max: 1 },
  rotationDirection: { min: -1, max: 1, enumerated: true },
  protrusionMode: { min: -1, max: 1, enumerated: true },
};

/**
 * How much of a param's range one full-strength layer-1 nudge can move.
 * Layer 1 nudges are seasoning on an axis-derived value, not the value itself.
 */
export const L1_NUDGE_GAIN = 0.4;

/** Neutral motion value used before layer 2 is scored (§8 progressive reveal). */
export const NEUTRAL_MOTION_VALUE = 0.5;

export function structureRange(name: string): ParamRange {
  const r = STRUCTURE_RANGES[name];
  if (!r) throw new Error(`Unknown structure param: ${name}`);
  return r;
}

export function motionRange(name: string): ParamRange {
  const r = MOTION_RANGES[name];
  if (!r) throw new Error(`Unknown motion param: ${name}`);
  return r;
}
