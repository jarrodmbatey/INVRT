// The parameter schema for the sphere.
//
//   Structure is who you are.  Motion is how you're doing.
//
// Questions 1–50 (baseline personality) produce StructureParams — the topology.
// Questions 51–100 (current state) produce MotionParams — the weather.
//
// The guarantee this split buys: two people of the same type look like
// siblings, and one person on a good day vs. a hard week is recognizably the
// same planet in different conditions. If anything in layer 2 alters band
// count, base hue, or axial tilt, the split has been violated.

/**
 * The four axes. Each is a continuous -1…+1 float; the sign picks the letter
 * of the 4-letter type code, the magnitude drives how strongly it expresses.
 * Always store and use the float — the letter is for display only.
 */
export interface Axes {
  illumination: number; // -1 outward → +1 inward
  edge: number; // -1 ordered → +1 fluid
  volatility: number; // -1 steady  → +1 volatile
  colorRelation: number; // -1 unified → +1 contrasting
}

export type AxisName = keyof Axes;

export const AXIS_NAMES: readonly AxisName[] = [
  "illumination",
  "edge",
  "volatility",
  "colorRelation",
] as const;

/** Pole letters per axis, indexed [negative, positive]. */
export const AXIS_LETTERS: Record<AxisName, readonly [string, string]> = {
  illumination: ["O", "I"], // Outward / Inward
  edge: ["R", "F"], // oRdered / Fluid
  volatility: ["S", "V"], // Steady  / Volatile
  colorRelation: ["U", "C"], // Unified / Contrasting
};

export type ActivityCenter = "poles" | "equator" | "hemisphere";
export type ProtrusionMode = "none" | "constant" | "intermittent";

export interface Accent {
  hueOffset: number; // degrees from base hue, -180…180
  saturation: number; // 0…1
  weight: number; // 0…1, relative surface coverage
}

// ── Layer 1: from questions 1–50. Stable identity. ───────────────

export interface StructureParams {
  seed: number; // deterministic hash of the layer-1 answer vector
  typeCode: string; // e.g. "IFVC"
  axes: Axes;

  // Color
  baseColor: { h: number; s: number; l: number };
  accents: Accent[]; // length 1–4
  colorSeparation: number; // 0 fully blended → 1 rigid boundaries

  // Band architecture
  bandCount: number; // integer 3–12
  bandSizeVariance: number; // 0 all equal → 1 highly uneven
  bandEdgeSharpness: number; // 0 indistinct → 1 hard-edged

  // Form
  axialTilt: number; // degrees, 0–45
  activityCenter: ActivityCenter;
  asymmetry: number; // 0 symmetric → 1 strongly one-sided

  // Substance
  lightSource: number; // 0 external → 1 internal glow
  depth: number; // 0 opaque surface → 1 see into the plasma
  viscosity: number; // 0 gas → 0.5 water → 1 mercury
  halo: number; // 0 none → 1 pronounced outer shell
}

// ── Layer 2: from questions 51–100. Current state. ───────────────

export interface MotionParams {
  globalSpeed: number; // 0 near-still → 1 fast
  speedVariance: number; // 0 all bands equal → 1 wildly different per band
  shearIndex: number; // 0 all same direction → 1 max counter-rotation
  rotationDirection: 1 | -1; // overall spin sense

  turbulenceScale: number; // 0 few large eddies → 1 many small ones
  turbulenceAmplitude: number; // 0 laminar → 1 churning
  coherence: number; // 0 constantly reorganizing → 1 pattern holds

  protrusionMode: ProtrusionMode;
  protrusionAmplitude: number; // 0…1, scaled by GEOMETRY_LIMITS.maxDisplacement
  protrusionLength: number; // 0 short/stubby → 1 long/drawn-out
  protrusionFrequency: number; // only used when mode === 'intermittent'

  accentIntensity: number; // 0 muted → 1 blazing
}

export interface SphereParams {
  structure: StructureParams;
  motion: MotionParams;
  /** Mapping table version this was generated under (§7). */
  mappingVersion: string;
}

// ── Question mapping contract ────────────────────────────────────
//
// Questions are data. The renderer never sees question text; it sees params.

export interface QuestionOption {
  label: string;
  /** Layer 1 questions vote on axes. Each vote is -1…1. */
  axisVotes?: Partial<Record<AxisName, number>>;
  /** Both layers may nudge params directly. Each nudge is -1…1. */
  paramNudges?: Partial<Record<string, number>>;
}

export interface QuestionMapping {
  id: string;
  layer: 1 | 2;
  prompt: string;
  options: QuestionOption[];
}

/** questionId → chosen option index. Sparse until the assessment completes. */
export type AnswerSet = Record<string, number>;

/** A named, individually testable entry in the constraint table (§5). */
export interface ConstraintFiring {
  rule: string;
  kind: "hard" | "soft";
  detail: string;
}
